import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AuditAction, AuditService } from '../audit/audit.service.js';
import { CirculationService } from './circulation.service.js';
import { EligibilityService } from './eligibility.service.js';
import { NotificationService } from '../notification/notification.service.js';

const isStaff = (role: Role) => role === Role.LIBRARIAN || role === Role.ADMIN;

export const CirculationController = {
  async checkout(req: Request, res: Response) {
    const loan = await CirculationService.checkout(req.body);
    await AuditService.record({
      actorId: req.user?.sub,
      action: AuditAction.LOAN_CHECKOUT,
      entity: 'Loan',
      entityId: loan.id,
      metadata: { memberId: loan.userId, copyId: loan.copyId },
    });
    res.status(201).json(loan);
  },

  async returnLoan(req: Request, res: Response) {
    const outcome = await CirculationService.returnLoan(req.body);
    if (outcome.fine) {
      await NotificationService.notifyFineIssued(
        outcome.loan.userId,
        Number(outcome.fine.amount),
        outcome.fine.reason,
      );
    }
    await AuditService.record({
      actorId: req.user?.sub,
      action: AuditAction.LOAN_RETURN,
      entity: 'Loan',
      entityId: outcome.loan.id,
      metadata: {
        memberId: outcome.loan.userId,
        fine: outcome.fine ? Number(outcome.fine.amount) : null,
      },
    });
    res.json(outcome);
  },

  async renew(req: Request, res: Response) {
    const user = req.user!;
    const loan = await CirculationService.renewLoan(req.params.id, user.sub, isStaff(user.role));
    // Members renew their own loans, so the actor here is often the member.
    // The staff summary filters to staff roles.
    await AuditService.record({
      actorId: user.sub,
      action: AuditAction.LOAN_RENEW,
      entity: 'Loan',
      entityId: loan.id,
      metadata: { memberId: loan.userId, renewalCount: loan.renewalCount },
    });
    res.json(loan);
  },

  async myLoans(req: Request, res: Response) {
    res.json(await CirculationService.getMyLoans(req.user!.sub, req.query));
  },

  async listLoans(req: Request, res: Response) {
    res.json(await CirculationService.listLoans(req.query));
  },

  async eligibility(req: Request, res: Response) {
    res.json(await EligibilityService.evaluate(req.params.userId));
  },
};
