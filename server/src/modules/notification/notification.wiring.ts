import { prisma } from '../../lib/prisma.js';
import {
  setReservationExpiredNotifier,
  setReservationReadyNotifier,
} from '../reservation/reservation.service.js';
import { NotificationService } from './notification.service.js';

async function bookTitle(bookId: string): Promise<string> {
  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { title: true } });
  return book?.title ?? 'your reserved title';
}

// Connect reservation events (fired by ReservationService after commit) to the notification
// pipeline. Kept here to avoid coupling reservation ↔ notification.
export function wireNotifications() {
  setReservationReadyNotifier(async ({ userId, bookId }) => {
    const reservation = await prisma.reservation.findFirst({
      where: { userId, bookId, status: 'READY' },
      orderBy: { readyAt: 'desc' },
      select: { expiresAt: true },
    });
    await NotificationService.notifyReservationReady(
      userId,
      await bookTitle(bookId),
      reservation?.expiresAt ?? null,
    );
  });

  setReservationExpiredNotifier(async ({ userId, bookId }) => {
    await NotificationService.notifyReservationExpired(userId, await bookTitle(bookId));
  });
}
