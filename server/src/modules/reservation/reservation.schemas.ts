import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';

export const reserveSchema = z.object({
  bookId: z.string().uuid(),
});

export const listQueueSchema = z.object({
  bookId: z.string().uuid().optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
});
