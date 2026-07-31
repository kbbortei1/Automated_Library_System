import { FineStatus, LoanStatus, Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { SettingService } from '../setting/setting.service.js';

type Tx = Prisma.TransactionClient | typeof prisma;

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

// Shared borrowing rules used by checkout (and renew). Pass a tx client when inside a transaction.
export const EligibilityService = {
  async outstandingFines(userId: string, db: Tx = prisma): Promise<number> {
    const agg = await db.fine.aggregate({
      where: { userId, status: FineStatus.UNPAID },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  },

  async activeLoanCount(userId: string, db: Tx = prisma): Promise<number> {
    return db.loan.count({
      where: { userId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
    });
  },

  // Evaluates all borrowing rules; returns reasons rather than throwing so callers can decide.
  async evaluate(userId: string, db: Tx = prisma): Promise<EligibilityResult> {
    const user = await db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('Member not found');

    const reasons: string[] = [];

    if (user.status === UserStatus.SUSPENDED) {
      reasons.push('Account is suspended');
    }

    const activeLoans = await this.activeLoanCount(userId, db);
    if (activeLoans >= user.borrowingLimit) {
      reasons.push(`Borrowing limit reached (${activeLoans}/${user.borrowingLimit})`);
    }

    const [outstanding, threshold] = await Promise.all([
      this.outstandingFines(userId, db),
      SettingService.getNumber('fine_block_threshold'),
    ]);
    if (outstanding > threshold) {
      reasons.push(`Outstanding fines $${outstanding.toFixed(2)} exceed limit $${threshold.toFixed(2)}`);
    }

    return { eligible: reasons.length === 0, reasons };
  },

  // Throws ForbiddenError with the combined reasons if not eligible.
  async assertCanBorrow(userId: string, db: Tx = prisma): Promise<void> {
    const result = await this.evaluate(userId, db);
    if (!result.eligible) {
      throw new ForbiddenError(`Cannot borrow: ${result.reasons.join('; ')}`);
    }
  },
};
