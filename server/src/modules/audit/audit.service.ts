import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

/**
 * Staff actions worth attributing.
 *
 * Anything that moves stock, moves money, or changes an account. Money is the
 * important one: a fine could be waived with no record of who did it, which is
 * the gap this closes.
 */
export const AuditAction = {
  LOAN_CHECKOUT: 'LOAN_CHECKOUT',
  LOAN_RETURN: 'LOAN_RETURN',
  LOAN_RENEW: 'LOAN_RENEW',
  FINE_PAID: 'FINE_PAID',
  FINE_WAIVED: 'FINE_WAIVED',
  MEMBER_SUSPENDED: 'MEMBER_SUSPENDED',
  MEMBER_REACTIVATED: 'MEMBER_REACTIVATED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

/** Actions that represent desk work, for the staff activity summary. */
export const DESK_ACTIONS: AuditActionName[] = [
  AuditAction.LOAN_CHECKOUT,
  AuditAction.LOAN_RETURN,
  AuditAction.LOAN_RENEW,
  AuditAction.FINE_PAID,
  AuditAction.FINE_WAIVED,
];

export const AuditService = {
  /**
   * Record a staff action.
   *
   * Deliberately never throws. An audit write failing must not roll back a
   * checkout that already happened: losing a log line is bad, refusing to
   * lend a book because of it is worse. Failures go to stderr instead.
   */
  async record(entry: {
    actorId?: string | null;
    action: AuditActionName;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          metadata: (entry.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      console.error('[audit] failed to record', entry.action, err);
    }
  },

  /**
   * Per-staff activity over a window.
   *
   * Counts by action, not a ranking. Transaction volume mostly reflects which
   * shift someone worked, so this is for spotting an unevenly staffed desk and
   * for answering "who processed this", not for deciding who is best.
   */
  async staffActivity(since: Date) {
    const rows = await prisma.auditLog.groupBy({
      by: ['actorId', 'action'],
      where: { createdAt: { gte: since }, actorId: { not: null } },
      _count: { _all: true },
    });

    // Members renew their own loans, which lands in the same log. This is a
    // staff summary, so only staff actors are counted.
    const actors = await prisma.user.findMany({
      where: {
        id: { in: [...new Set(rows.map((r) => r.actorId!))] },
        role: { in: [Role.LIBRARIAN, Role.ADMIN] },
      },
      select: { id: true, fullName: true, role: true },
    });
    const byId = new Map(actors.map((a) => [a.id, a]));
    const actorIds = actors.map((a) => a.id);

    const summary = actorIds.map((id) => {
      const mine = rows.filter((r) => r.actorId === id);
      const counts: Record<string, number> = {};
      for (const r of mine) counts[r.action] = r._count._all;
      return {
        id,
        fullName: byId.get(id)?.fullName ?? 'Unknown',
        role: byId.get(id)?.role ?? 'MEMBER',
        counts,
        total: mine.reduce((sum, r) => sum + r._count._all, 0),
      };
    });

    // Alphabetical, deliberately: ordering by volume would make this a
    // leaderboard, which is the thing this is designed not to be.
    return summary.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  /** Recent entries, newest first, for the admin trail. */
  async recent(limit = 100) {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean) as string[])];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, fullName: true },
    });
    const byId = new Map(actors.map((a) => [a.id, a.fullName]));
    return logs.map((l) => ({
      ...l,
      actorName: l.actorId ? (byId.get(l.actorId) ?? 'Unknown') : 'System',
    }));
  },
};
