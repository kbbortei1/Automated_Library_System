import { Router } from 'express';
import { NotificationService } from './notification.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const notificationRouter = Router();

notificationRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => res.json(await NotificationService.getMyNotifications(req.user!.sub))),
);

notificationRouter.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => res.json(await NotificationService.markAllRead(req.user!.sub))),
);

notificationRouter.post(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) =>
    res.json(await NotificationService.markRead(req.params.id, req.user!.sub)),
  ),
);
