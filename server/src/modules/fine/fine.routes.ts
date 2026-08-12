import { Router } from 'express';
import { FineStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { AuditAction, AuditService } from '../audit/audit.service.js';
import { FineService } from './fine.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const fineRouter = Router();
const staff = [requireAuth, requireRole(Role.LIBRARIAN)];

const listFinesSchema = z.object({
  status: z.nativeEnum(FineStatus).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

// --- Member self-service ---
fineRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [fines, outstanding] = await Promise.all([
      FineService.getMyFines(req.user!.sub),
      FineService.computeOutstanding(req.user!.sub),
    ]);
    res.json({ fines, outstanding });
  }),
);

// --- Staff ---
fineRouter.get(
  '/',
  ...staff,
  validateQuery(listFinesSchema),
  asyncHandler(async (req, res) => res.json(await FineService.listFines(req.query))),
);
fineRouter.get(
  '/defaulters',
  ...staff,
  asyncHandler(async (_req, res) => res.json(await FineService.defaulters())),
);
fineRouter.post(
  '/:id/pay',
  ...staff,
  asyncHandler(async (req, res) => {
    const fine = await FineService.payFine(req.params.id);
    await AuditService.record({
      actorId: req.user?.sub,
      action: AuditAction.FINE_PAID,
      entity: 'Fine',
      entityId: fine.id,
      metadata: { memberId: fine.userId, amount: Number(fine.amount) },
    });
    res.json(fine);
  }),
);
fineRouter.post(
  '/:id/waive',
  ...staff,
  asyncHandler(async (req, res) => {
    const fine = await FineService.waiveFine(req.params.id);
    // The one that mattered most: money written off with no record of who.
    await AuditService.record({
      actorId: req.user?.sub,
      action: AuditAction.FINE_WAIVED,
      entity: 'Fine',
      entityId: fine.id,
      metadata: { memberId: fine.userId, amount: Number(fine.amount) },
    });
    res.json(fine);
  }),
);
