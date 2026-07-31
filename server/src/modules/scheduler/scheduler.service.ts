import cron from 'node-cron';
import { LoanStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { CirculationService } from '../circulation/circulation.service.js';
import { ReservationService } from '../reservation/reservation.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { SettingService } from '../setting/setting.service.js';

function log(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`⏰ [scheduler] ${msg}`);
}

export const SchedulerService = {
  // Nightly: notify members whose ACTIVE loans are now past due, then mark them OVERDUE.
  async runOverdueSweep() {
    const nowOverdue = await prisma.loan.findMany({
      where: { status: LoanStatus.ACTIVE, dueDate: { lt: new Date() } },
      include: { user: { select: { id: true } }, copy: { include: { book: { select: { title: true } } } } },
    });
    for (const loan of nowOverdue) {
      await NotificationService.notifyOverdue(loan.userId, loan.copy.book.title, loan.dueDate);
    }
    const count = await CirculationService.markOverdueLoans();
    log(`overdue sweep: ${count} loan(s) marked OVERDUE`);
    return count;
  },

  // Daily: remind members of loans due within the reminder window.
  async runDueSoonReminders() {
    const days = await SettingService.getNumber('due_soon_reminder_days');
    const now = new Date();
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const dueSoon = await prisma.loan.findMany({
      where: { status: LoanStatus.ACTIVE, dueDate: { gte: now, lte: windowEnd } },
      include: { copy: { include: { book: { select: { title: true } } } } },
    });
    for (const loan of dueSoon) {
      await NotificationService.notifyDueSoon(loan.userId, loan.copy.book.title, loan.dueDate);
    }
    log(`due-soon reminders: ${dueSoon.length} sent`);
    return dueSoon.length;
  },

  // Hourly: expire READY holds past their collection window (frees/promotes copies).
  async runHoldExpiry() {
    const count = await ReservationService.expireReadyHolds();
    log(`hold expiry: ${count} reservation(s) expired`);
    return count;
  },

  // Register cron schedules. Called at startup when ENABLE_CRON is true.
  start() {
    // Nightly at 01:00
    cron.schedule('0 1 * * *', () => void this.runOverdueSweep());
    // Daily at 08:00
    cron.schedule('0 8 * * *', () => void this.runDueSoonReminders());
    // Hourly
    cron.schedule('0 * * * *', () => void this.runHoldExpiry());
    log('cron jobs registered (overdue sweep, due-soon reminders, hold expiry)');
  },
};
