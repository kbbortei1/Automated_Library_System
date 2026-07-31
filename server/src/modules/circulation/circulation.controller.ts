import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { CirculationService } from './circulation.service.js';
import { EligibilityService } from './eligibility.service.js';
import { NotificationService } from '../notification/notification.service.js';

const isStaff = (role: Role) => role === Role.LIBRARIAN || role === Role.ADMIN;

export const CirculationController = {
  async checkout(req: Request, res: Response) {
    res.status(201).json(await CirculationService.checkout(req.body));
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
    res.json(outcome);
  },

  async renew(req: Request, res: Response) {
    const user = req.user!;
    res.json(await CirculationService.renewLoan(req.params.id, user.sub, isStaff(user.role)));
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
