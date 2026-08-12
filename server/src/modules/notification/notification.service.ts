import { NotificationChannel, NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { sendMail } from '../../lib/mailer.js';
import { NotFoundError } from '../../lib/errors.js';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  email?: boolean; // also dispatch by email
}

export const NotificationService = {
  // Core: write an IN_APP record and, when requested, dispatch an EMAIL record + send it.
  async notify(input: NotifyInput) {
    const inApp = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: NotificationChannel.IN_APP,
        title: input.title,
        message: input.message,
      },
    });

    if (input.email) {
      const user = await prisma.user.findUnique({ where: { id: input.userId } });
      let sent = false;
      if (user) sent = await sendMail(user.email, input.title, input.message);
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          channel: NotificationChannel.EMAIL,
          title: input.title,
          message: input.message,
          emailSent: sent,
        },
      });
    }

    return inApp;
  },

  notifyWelcome(userId: string, fullName: string) {
    return this.notify({
      userId,
      type: NotificationType.WELCOME,
      title: 'Welcome to the KNUST Library',
      message: `Hi ${fullName}, your library account is ready. Browse the catalogue and reserve titles anytime.`,
      email: true,
    });
  },

  notifyDueSoon(userId: string, bookTitle: string, dueDate: Date) {
    return this.notify({
      userId,
      type: NotificationType.DUE_SOON,
      title: 'Loan due soon',
      message: `"${bookTitle}" is due on ${dueDate.toDateString()}. Renew it if you need more time.`,
      email: true,
    });
  },

  notifyOverdue(userId: string, bookTitle: string, dueDate: Date) {
    return this.notify({
      userId,
      type: NotificationType.OVERDUE,
      title: 'Loan overdue',
      message: `"${bookTitle}" was due on ${dueDate.toDateString()} and is now overdue. Please return it to avoid further fines.`,
      email: true,
    });
  },

  notifyFineIssued(userId: string, amount: number, reason: string) {
    return this.notify({
      userId,
      type: NotificationType.FINE_ISSUED,
      title: 'Fine issued',
      message: `A fine of $${amount.toFixed(2)} has been added to your account (${reason}).`,
      email: true,
    });
  },

  notifyReservationReady(userId: string, bookTitle: string, expiresAt: Date | null) {
    const by = expiresAt ? ` Please collect it by ${expiresAt.toDateString()}.` : '';
    return this.notify({
      userId,
      type: NotificationType.RESERVATION_READY,
      title: 'Reservation ready for collection',
      message: `Your reserved title "${bookTitle}" is ready at the desk.${by}`,
      email: true,
    });
  },

  notifyReservationExpired(userId: string, bookTitle: string) {
    return this.notify({
      userId,
      type: NotificationType.RESERVATION_EXPIRED,
      title: 'Reservation expired',
      message: `Your hold on "${bookTitle}" expired and was released to the next member.`,
      email: true,
    });
  },

  notifyAccountSuspended(userId: string) {
    return this.notify({
      userId,
      type: NotificationType.ACCOUNT_SUSPENDED,
      title: 'Account suspended',
      message: 'Your borrowing privileges have been suspended. Please contact the library.',
      email: true,
    });
  },

  // --- Reads / member actions (IN_APP only) ---
  async getMyNotifications(userId: string) {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, channel: NotificationChannel.IN_APP },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId, channel: NotificationChannel.IN_APP, read: false },
      }),
    ]);
    return { items, unread };
  },

  async markRead(notificationId: string, userId: string) {
    const n = await prisma.notification.findFirst({ where: { id: notificationId, userId } });
    if (!n) throw new NotFoundError('Notification not found');
    return prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, channel: NotificationChannel.IN_APP, read: false },
      data: { read: true },
    });
    return { success: true };
  },
};
