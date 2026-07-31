import { CopyStatus, FineStatus, LoanStatus, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { FineService } from '../fine/fine.service.js';

export const ReportService = {
  async dashboardStats() {
    const [
      activeLoans,
      overdueLoans,
      totalBooks,
      copyStatus,
      outstanding,
      members,
      pendingReservations,
      readyReservations,
    ] = await Promise.all([
      prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      prisma.book.count({ where: { deletedAt: null } }),
      this.stockStatus(),
      prisma.fine.aggregate({ where: { status: FineStatus.UNPAID }, _sum: { amount: true } }),
      prisma.user.count({ where: { deletedAt: null, role: 'MEMBER' } }),
      prisma.reservation.count({ where: { status: ReservationStatus.PENDING } }),
      prisma.reservation.count({ where: { status: ReservationStatus.READY } }),
    ]);

    return {
      activeLoans,
      overdueLoans,
      totalBooks,
      copyStatus,
      outstandingFines: Number(outstanding._sum.amount ?? 0),
      members,
      pendingReservations,
      readyReservations,
      newMemberTrend: await this.newMemberTrend(),
    };
  },

  // Copies grouped by status (stock health).
  async stockStatus() {
    const grouped = await prisma.bookCopy.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const base: Record<CopyStatus, number> = {
      AVAILABLE: 0,
      CHECKED_OUT: 0,
      RESERVED: 0,
      LOST: 0,
      DAMAGED: 0,
    };
    for (const g of grouped) base[g.status] = g._count._all;
    return base;
  },

  // Top borrowed titles by loan count.
  async mostBorrowed(limit = 10) {
    const grouped = await prisma.loan.groupBy({ by: ['copyId'], _count: { _all: true } });
    if (grouped.length === 0) return [];

    const copies = await prisma.bookCopy.findMany({
      where: { id: { in: grouped.map((g) => g.copyId) } },
      select: { id: true, bookId: true },
    });
    const bookByCopy = new Map(copies.map((c) => [c.id, c.bookId]));

    const tally = new Map<string, number>();
    for (const g of grouped) {
      const bookId = bookByCopy.get(g.copyId);
      if (!bookId) continue;
      tally.set(bookId, (tally.get(bookId) ?? 0) + g._count._all);
    }

    const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    const books = await prisma.book.findMany({
      where: { id: { in: top.map(([id]) => id) } },
      select: { id: true, title: true, isbn: true },
    });
    const bookById = new Map(books.map((b) => [b.id, b]));

    return top
      .map(([id, count]) => ({ book: bookById.get(id), borrowCount: count }))
      .filter((x) => x.book);
  },

  // New members per month for the last 6 months.
  async newMemberTrend() {
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true },
    });

    const buckets: { month: string; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      buckets.push({ month: label, count: 0 });
    }
    for (const u of users) {
      const idx =
        (u.createdAt.getFullYear() - since.getFullYear()) * 12 +
        (u.createdAt.getMonth() - since.getMonth());
      if (idx >= 0 && idx < buckets.length) buckets[idx].count++;
    }
    return buckets;
  },

  defaulters() {
    return FineService.defaulters();
  },
};
