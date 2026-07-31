import { CopyStatus, Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { SettingService } from '../setting/setting.service.js';
import {
  setAfterReturnCommitHook,
  setPromoteOnReturnHook,
  setRenewGuardHook,
} from '../circulation/circulation.service.js';

type Tx = Prisma.TransactionClient;

const ACTIVE_STATUSES: ReservationStatus[] = [ReservationStatus.PENDING, ReservationStatus.READY];

const reservationInclude = {
  book: { select: { id: true, title: true, isbn: true } },
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ReservationInclude;

async function readyWindowHours(): Promise<number> {
  return SettingService.getNumber('reservation_ready_window_hours');
}

function expiryFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// Promote the front of the PENDING queue onto a freed copy. Returns true if claimed.
async function promoteFront(bookId: string, tx: Tx): Promise<boolean> {
  const next = await tx.reservation.findFirst({
    where: { bookId, status: ReservationStatus.PENDING },
    orderBy: { queuePosition: 'asc' },
  });
  if (!next) return false;
  const hours = await readyWindowHours();
  await tx.reservation.update({
    where: { id: next.id },
    data: {
      status: ReservationStatus.READY,
      readyAt: new Date(),
      expiresAt: expiryFromNow(hours),
    },
  });
  pendingReadyNotifications.push({ userId: next.userId, bookId });
  return true;
}

// Free one RESERVED copy of a book, offering it to the next in queue; else make AVAILABLE.
async function releaseOneReservedCopy(bookId: string, tx: Tx): Promise<void> {
  const copy = await tx.bookCopy.findFirst({
    where: { bookId, status: CopyStatus.RESERVED, deletedAt: null },
  });
  if (!copy) return;
  const claimed = await promoteFront(bookId, tx);
  if (!claimed) {
    await tx.bookCopy.update({ where: { id: copy.id }, data: { status: CopyStatus.AVAILABLE } });
  }
}

// Notifications produced during a transaction are dispatched after commit (Phase 7 wires delivery).
interface PendingNotice {
  userId: string;
  bookId: string;
}
type Notifier = (notice: PendingNotice) => Promise<void>;

const pendingReadyNotifications: PendingNotice[] = [];
const pendingExpiredNotifications: PendingNotice[] = [];

let onReservationReady: Notifier = async () => {};
let onReservationExpired: Notifier = async () => {};

export function setReservationReadyNotifier(fn: Notifier) {
  onReservationReady = fn;
}
export function setReservationExpiredNotifier(fn: Notifier) {
  onReservationExpired = fn;
}

async function flushQueue(queue: PendingNotice[], notifier: Notifier) {
  const batch = queue.splice(0);
  for (const n of batch) {
    try {
      await notifier(n);
    } catch {
      /* notification failures must not break circulation */
    }
  }
}

async function flushReadyNotifications() {
  await flushQueue(pendingReadyNotifications, onReservationReady);
  await flushQueue(pendingExpiredNotifications, onReservationExpired);
}

export const ReservationService = {
  // FR17 — reserve a title. If a copy is free now, the hold goes straight to READY.
  async reserve(userId: string, bookId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({ where: { id: bookId, deletedAt: null } });
      if (!book) throw new NotFoundError('Book not found');

      const existing = await tx.reservation.findFirst({
        where: { bookId, userId, status: { in: ACTIVE_STATUSES } },
      });
      if (existing) throw new ConflictError('You already have an active reservation for this title');

      const availableCopy = await tx.bookCopy.findFirst({
        where: { bookId, status: CopyStatus.AVAILABLE, deletedAt: null },
      });

      if (availableCopy) {
        const hours = await readyWindowHours();
        await tx.bookCopy.update({
          where: { id: availableCopy.id },
          data: { status: CopyStatus.RESERVED },
        });
        const res = await tx.reservation.create({
          data: {
            bookId,
            userId,
            status: ReservationStatus.READY,
            queuePosition: 0,
            readyAt: new Date(),
            expiresAt: expiryFromNow(hours),
          },
          include: reservationInclude,
        });
        pendingReadyNotifications.push({ userId, bookId });
        return res;
      }

      const last = await tx.reservation.findFirst({
        where: { bookId, status: ReservationStatus.PENDING },
        orderBy: { queuePosition: 'desc' },
      });
      return tx.reservation.create({
        data: {
          bookId,
          userId,
          status: ReservationStatus.PENDING,
          queuePosition: (last?.queuePosition ?? 0) + 1,
        },
        include: reservationInclude,
      });
    });
    await flushReadyNotifications();
    return result;
  },

  // FR19 — cancel. Frees a copy if the hold was READY; re-sequences the queue if PENDING.
  async cancel(reservationId: string, requesterId: string, isStaff: boolean) {
    await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.findUnique({ where: { id: reservationId } });
      if (!res) throw new NotFoundError('Reservation not found');
      if (!isStaff && res.userId !== requesterId) throw new ForbiddenError('Not your reservation');
      if (!ACTIVE_STATUSES.includes(res.status)) {
        throw new BadRequestError(`Reservation is ${res.status} and cannot be cancelled`);
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED },
      });

      if (res.status === ReservationStatus.READY) {
        await releaseOneReservedCopy(res.bookId, tx);
      } else {
        // Close the gap in the PENDING queue.
        await tx.reservation.updateMany({
          where: {
            bookId: res.bookId,
            status: ReservationStatus.PENDING,
            queuePosition: { gt: res.queuePosition },
          },
          data: { queuePosition: { decrement: 1 } },
        });
      }
    });
    await flushReadyNotifications();
    return { success: true };
  },

  // FR19 — job: expire READY holds past their window, freeing copies to the next in line.
  async expireReadyHolds(): Promise<number> {
    const expired = await prisma.$transaction(async (tx) => {
      const due = await tx.reservation.findMany({
        where: { status: ReservationStatus.READY, expiresAt: { lt: new Date() } },
      });
      for (const r of due) {
        await tx.reservation.update({
          where: { id: r.id },
          data: { status: ReservationStatus.EXPIRED },
        });
        pendingExpiredNotifications.push({ userId: r.userId, bookId: r.bookId });
        await releaseOneReservedCopy(r.bookId, tx);
      }
      return due.length;
    });
    await flushReadyNotifications();
    return expired;
  },

  async getMyReservations(userId: string) {
    return prisma.reservation.findMany({
      where: { userId },
      include: reservationInclude,
      orderBy: { reservationDate: 'desc' },
    });
  },

  async listQueue(params: { bookId?: string; status?: ReservationStatus }) {
    return prisma.reservation.findMany({
      where: {
        ...(params.bookId ? { bookId: params.bookId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: reservationInclude,
      orderBy: [{ bookId: 'asc' }, { queuePosition: 'asc' }],
    });
  },
};

// --- Wire circulation hooks (Phase 4 left these as no-ops) ---

// On return: front of queue (if any) claims the copy → READY; copy stays RESERVED.
setPromoteOnReturnHook(async (bookId, _copyId, tx) => {
  const claimed = await promoteFront(bookId, tx);
  // Notifications flushed by the caller after the return transaction commits.
  return claimed;
});

// After a return commits, dispatch any queued READY notifications.
setAfterReturnCommitHook(flushReadyNotifications);

// Renew guard: block renewal when anyone is waiting (PENDING) for the title.
setRenewGuardHook(async (bookId, tx) => {
  const waiting = await tx.reservation.count({
    where: { bookId, status: ReservationStatus.PENDING },
  });
  if (waiting > 0) {
    throw new BadRequestError('Cannot renew — other members are waiting for this title');
  }
});

// Allow circulation's return flow to flush queued READY notifications post-commit.
export { flushReadyNotifications };
