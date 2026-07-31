import { Router } from 'express';
import { Role } from '@prisma/client';
import { CirculationController } from './circulation.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  checkoutSchema,
  listLoansSchema,
  myLoansSchema,
  returnSchema,
} from './circulation.schemas.js';

export const circulationRouter = Router();
const staff = [requireAuth, requireRole(Role.LIBRARIAN)];

// --- Member self-service ---
circulationRouter.get(
  '/my-loans',
  requireAuth,
  validateQuery(myLoansSchema),
  asyncHandler(CirculationController.myLoans),
);
// Renew: members renew their own loans; staff can renew any (checked in service).
circulationRouter.post('/loans/:id/renew', requireAuth, asyncHandler(CirculationController.renew));

// --- Staff circulation desk ---
circulationRouter.post(
  '/checkout',
  ...staff,
  validateBody(checkoutSchema),
  asyncHandler(CirculationController.checkout),
);
circulationRouter.post(
  '/return',
  ...staff,
  validateBody(returnSchema),
  asyncHandler(CirculationController.returnLoan),
);
circulationRouter.get(
  '/loans',
  ...staff,
  validateQuery(listLoansSchema),
  asyncHandler(CirculationController.listLoans),
);
circulationRouter.get(
  '/eligibility/:userId',
  ...staff,
  asyncHandler(CirculationController.eligibility),
);
