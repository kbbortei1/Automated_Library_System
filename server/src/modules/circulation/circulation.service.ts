import { CopyStatus, LoanStatus, Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { SettingService } from '../setting/setting.service.js';
import { EligibilityService } from './eligibility.service.js';

const loanInclude = {
  copy: { include: { book: { select: { id: true, title: true, isbn: true } } } },
  user: { select: { id: true, fullName: true, email: true } },
  fine: true,
} satisfies Prisma.LoanInclude;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Hook set by ReservationService (Phase 5) so returns can promote the next person in the queue.
// Returns true if a reservation claimed the copy (so it should NOT become AVAILABLE).
type PromoteHook = (bookId: string, copyId: string, tx: Prisma.TransactionClient) => Promise<boolean>;
let promoteOnReturn: PromoteHook = async () => false;
export function setPromoteOnReturnHook(fn: PromoteHook) {
  promoteOnReturn = fn;
}

// Runs after the return transaction commits, used to dispatch queued notifications (Phase 5/7).
let afterReturnCommit: () => Promise<void> = async () => {};
export function setAfterReturnCommitHook(fn: () => Promise<void>) {
  afterReturnCommit = fn;
}

export const CirculationService = {
  // Transactional checkout: eligibility → flip copy → create loan with due date (NFR04).
  async checkout(params: { userId: string; copyId?: string; bookId?: string }) {
    const { userId } = params;

    return prisma.$transaction(async (tx) => {
      await EligibilityService.assertCanBorrow(userId, tx);

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      // Resolve the copy: explicit copyId, or first AVAILABLE copy of the book.
      let copy;
      let fulfilledReservationId: string | null = null;
      if (params.copyId) {
        copy = await tx.bookCopy.findFirst({ where: { id: params.copyId, deletedAt: null } });
        if (!copy) throw new NotFoundError('Copy not found');
        if (copy.status === CopyStatus.RESERVED) {
          // Held copies only move if the person collecting is the one it was held for.
          const hold = await tx.reservation.findFirst({
            where: { bookId: copy.bookId, userId, status: ReservationStatus.READY },
          });
          if (!hold) throw new BadRequestError('Copy is reserved for another member');
          fulfilledReservationId = hold.id;
        } else if (copy.status !== CopyStatus.AVAILABLE) {
          throw new BadRequestError(`Copy is not available (status: ${copy.status})`);
        }
      } else if (params.bookId) {
        copy = await tx.bookCopy.findFirst({
          where: { bookId: params.bookId, status: CopyStatus.AVAILABLE, deletedAt: null },
          orderBy: { accessionNumber: 'asc' },
        });
        if (!copy) throw new BadRequestError('No available copies for this book');
      } else {
        throw new BadRequestError('Provide copyId or bookId');
      }

      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.CHECKED_OUT },
      });

      if (fulfilledReservationId) {
        await tx.reservation.update({
          where: { id: fulfilledReservationId },
          data: { status: ReservationStatus.FULFILLED },
        });
      }

      const checkoutDate = new Date();
      const loan = await tx.loan.create({
        data: {
          copyId: copy.id,
          userId,
          checkoutDate,
          dueDate: addDays(checkoutDate, user.loanPeriodDays),
          status: LoanStatus.ACTIVE,
        },
        include: loanInclude,
      });
      return loan;
    });
  },

  // Transactional return: close loan → fine if overdue → promote reservation or free the copy.
  async returnLoan(params: { loanId?: string; copyId?: string }) {
    const outcome = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: {
          ...(params.loanId ? { id: params.loanId } : {}),
          ...(params.copyId ? { copyId: params.copyId } : {}),
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        orderBy: { checkoutDate: 'desc' },
      });
      if (!loan) throw new NotFoundError('No active loan found for that copy/loan');

      const returnDate = new Date();

      // Overdue fine (FR20): days late × rate.
      let fineCreated = null;
      if (returnDate > loan.dueDate) {
        const daysLate = daysBetween(returnDate, loan.dueDate);
        const rate = await SettingService.getNumber('fine_rate_per_day');
        const amount = Number((daysLate * rate).toFixed(2));
        if (amount > 0) {
          fineCreated = await tx.fine.create({
            data: {
              loanId: loan.id,
              userId: loan.userId,
              amount: new Prisma.Decimal(amount),
              reason: `${daysLate} day(s) overdue`,
            },
          });
        }
      }

      await tx.loan.update({
        where: { id: loan.id },
        data: { status: LoanStatus.RETURNED, returnDate },
      });

      const copy = await tx.bookCopy.findUniqueOrThrow({ where: { id: loan.copyId } });

      // Offer the copy to the reservation queue (Phase 5). If claimed, the copy is held
      // (RESERVED) for the promoted member; otherwise it returns to the shelf (AVAILABLE).
      const claimed = await promoteOnReturn(copy.bookId, copy.id, tx);
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: claimed ? CopyStatus.RESERVED : CopyStatus.AVAILABLE },
      });

      const updated = await tx.loan.findUniqueOrThrow({
        where: { id: loan.id },
        include: loanInclude,
      });
      return { loan: updated, fine: fineCreated, reservationPromoted: claimed };
    });

    await afterReturnCommit(); // dispatch any queued RESERVATION_READY notifications
    return outcome;
  },

  // Renew: enforce max renewals; reservation-block guard is added in Phase 5.
  async renewLoan(loanId: string, requesterId: string, isStaff: boolean) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id: loanId }, include: { copy: true } });
      if (!loan) throw new NotFoundError('Loan not found');
      if (!isStaff && loan.userId !== requesterId) {
        throw new NotFoundError('Loan not found');
      }
      if (loan.status === LoanStatus.RETURNED) {
        throw new BadRequestError('Loan already returned');
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: loan.userId } });

      // A faculty member and an undergraduate do not get the same allowance,
      // so the per-type limit wins where one is configured and the global
      // max_renewals is the fallback.
      const perType = await SettingService.getNumberOptional(
        `max_renewals_${user.membershipType.toLowerCase()}`,
      );
      const maxRenewals = perType ?? (await SettingService.getNumber('max_renewals'));
      if (loan.renewalCount >= maxRenewals) {
        throw new BadRequestError(`Maximum renewals (${maxRenewals}) reached`);
      }

      // Guard: cannot renew if others are waiting for this title (set in Phase 5).
      await assertNoBlockingReservation(loan.copy.bookId, tx);
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          dueDate: addDays(new Date(), user.loanPeriodDays),
          renewalCount: { increment: 1 },
          status: LoanStatus.ACTIVE,
        },
        include: loanInclude,
      });
      return updated;
    });
  },

  // Job: mark ACTIVE loans past due as OVERDUE (FR16).
  async markOverdueLoans(): Promise<number> {
    const res = await prisma.loan.updateMany({
      where: { status: LoanStatus.ACTIVE, dueDate: { lt: new Date() } },
      data: { status: LoanStatus.OVERDUE },
    });
    return res.count;
  },

  async getMyLoans(userId: string, opts: { active?: boolean } = {}) {
    return prisma.loan.findMany({
      where: {
        userId,
        ...(opts.active ? { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } } : {}),
      },
      include: loanInclude,
      orderBy: { checkoutDate: 'desc' },
    });
  },

  async listLoans(params: { status?: LoanStatus; userId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where: Prisma.LoanWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: loanInclude,
        orderBy: { checkoutDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.loan.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};

// Reservation renewal-guard hook (Phase 5 replaces the implementation).
type RenewGuard = (bookId: string, tx: Prisma.TransactionClient) => Promise<void>;
let assertNoBlockingReservation: RenewGuard = async () => {};
export function setRenewGuardHook(fn: RenewGuard) {
  assertNoBlockingReservation = fn;
}
