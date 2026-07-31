import { Router } from 'express';
import { FineStatus, Role } from '@prisma/client';
import { z } from 'zod';
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
  asyncHandler(async (req, res) => res.json(await FineService.payFine(req.params.id))),
);
fineRouter.post(
  '/:id/waive',
  ...staff,
  asyncHandler(async (req, res) => res.json(await FineService.waiveFine(req.params.id))),
);
