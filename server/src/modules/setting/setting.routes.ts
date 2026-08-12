import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { SettingService } from './setting.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const settingRouter = Router();

const updateSettingSchema = z.object({ value: z.string() });

// The published policy, readable by any signed-in user. Declared before the
// staff route below purely for readability; the paths do not overlap.
settingRouter.get(
  '/policy',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await SettingService.getPublicPolicy());
  }),
);

settingRouter.get(
  '/',
  requireAuth,
  requireRole(Role.LIBRARIAN),
  asyncHandler(async (_req, res) => {
    res.json(await SettingService.getAll());
  }),
);

settingRouter.patch(
  '/:key',
  requireAuth,
  requireRole(Role.ADMIN),
  validateBody(updateSettingSchema),
  asyncHandler(async (req, res) => {
    res.json(await SettingService.update(req.params.key, req.body.value));
  }),
);
