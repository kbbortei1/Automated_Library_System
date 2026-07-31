import { Router } from 'express';
import { Role } from '@prisma/client';
import { ReservationController } from './reservation.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listQueueSchema, reserveSchema } from './reservation.schemas.js';

export const reservationRouter = Router();

// --- Member self-service ---
reservationRouter.post(
  '/',
  requireAuth,
  validateBody(reserveSchema),
  asyncHandler(ReservationController.reserve),
);
reservationRouter.get('/mine', requireAuth, asyncHandler(ReservationController.myReservations));
// Cancel: members cancel their own; staff can cancel any (checked in service).
reservationRouter.post('/:id/cancel', requireAuth, asyncHandler(ReservationController.cancel));

// --- Staff: reservation queue ---
reservationRouter.get(
  '/',
  requireAuth,
  requireRole(Role.LIBRARIAN),
  validateQuery(listQueueSchema),
  asyncHandler(ReservationController.listQueue),
);
