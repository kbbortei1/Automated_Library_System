import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ReservationService } from './reservation.service.js';

const isStaff = (role: Role) => role === Role.LIBRARIAN || role === Role.ADMIN;

export const ReservationController = {
  async reserve(req: Request, res: Response) {
    res.status(201).json(await ReservationService.reserve(req.user!.sub, req.body.bookId));
  },

  async cancel(req: Request, res: Response) {
    const user = req.user!;
    res.json(await ReservationService.cancel(req.params.id, user.sub, isStaff(user.role)));
  },

  async myReservations(req: Request, res: Response) {
    res.json(await ReservationService.getMyReservations(req.user!.sub));
  },

  async listQueue(req: Request, res: Response) {
    res.json(await ReservationService.listQueue(req.query));
  },
};
