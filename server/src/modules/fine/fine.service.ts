import { FineStatus, LoanStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';

const fineInclude = {
  loan: {
    select: {
      id: true,
      dueDate: true,
      returnDate: true,
      copy: { select: { book: { select: { id: true, title: true, isbn: true } } } },
    },
  },
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.FineInclude;

export const FineService = {
  async getMyFines(userId: string) {
    return prisma.fine.findMany({
      where: { userId },
      include: fineInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async listFines(params: { status?: FineStatus; userId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where: Prisma.FineWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.fine.findMany({
        where,
        include: fineInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.fine.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async computeOutstanding(userId: string): Promise<number> {
    const agg = await prisma.fine.aggregate({
      where: { userId, status: FineStatus.UNPAID },
      _sum: { amount: true },
    });
    return Number(agg._sum.amount ?? 0);
  },

  async payFine(fineId: string) {
    const fine = await prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) throw new NotFoundError('Fine not found');
    if (fine.status !== FineStatus.UNPAID) {
      throw new BadRequestError(`Fine is already ${fine.status}`);
    }
    return prisma.fine.update({
      where: { id: fineId },
      data: { status: FineStatus.PAID, paidAt: new Date() },
      include: fineInclude,
    });
  },

  async waiveFine(fineId: string) {
    const fine = await prisma.fine.findUnique({ where: { id: fineId } });
    if (!fine) throw new NotFoundError('Fine not found');
    if (fine.status !== FineStatus.UNPAID) {
      throw new BadRequestError(`Fine is already ${fine.status}`);
    }
    return prisma.fine.update({
      where: { id: fineId },
      data: { status: FineStatus.WAIVED, paidAt: new Date() },
      include: fineInclude,
    });
  },

  // FR22: members with unpaid fines and/or overdue loans, with totals for the defaulters report.
  async defaulters() {
    const grouped = await prisma.fine.groupBy({
      by: ['userId'],
      where: { status: FineStatus.UNPAID },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const overdueGrouped = await prisma.loan.groupBy({
      by: ['userId'],
      where: { status: LoanStatus.OVERDUE },
      _count: { _all: true },
    });

    const overdueByUser = new Map(overdueGrouped.map((o) => [o.userId, o._count._all]));
    const userIds = new Set<string>([
      ...grouped.map((g) => g.userId),
      ...overdueGrouped.map((o) => o.userId),
    ]);

    if (userIds.size === 0) return [];

    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] }, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        membershipType: true,
      },
    });

    const finesByUser = new Map(
      grouped.map((g) => [g.userId, { total: Number(g._sum.amount ?? 0), count: g._count._all }]),
    );

    return users
      .map((u) => ({
        ...u,
        outstandingFines: finesByUser.get(u.id)?.total ?? 0,
        unpaidFineCount: finesByUser.get(u.id)?.count ?? 0,
        overdueLoans: overdueByUser.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.outstandingFines - a.outstandingFines);
  },
};
