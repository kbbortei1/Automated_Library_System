import { Router } from 'express';
import { Role } from '@prisma/client';
import { ReportService } from './report.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { AuditService } from '../audit/audit.service.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const reportRouter = Router();
const staff = [requireAuth, requireRole(Role.LIBRARIAN)];
const adminOnly = [requireAuth, requireRole(Role.ADMIN)];

// Staff activity is oversight of colleagues, so it is admin-only rather than
// something every librarian can pull on every other librarian.
reportRouter.get(
  '/staff-activity',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 86_400_000);
    res.json({ days, since, staff: await AuditService.staffActivity(since) });
  }),
);

reportRouter.get(
  '/audit-log',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    res.json(await AuditService.recent(limit));
  }),
);

reportRouter.get(
  '/dashboard',
  ...staff,
  asyncHandler(async (_req, res) => res.json(await ReportService.dashboardStats())),
);
reportRouter.get(
  '/most-borrowed',
  ...staff,
  asyncHandler(async (_req, res) => res.json(await ReportService.mostBorrowed())),
);
reportRouter.get(
  '/stock-status',
  ...staff,
  asyncHandler(async (_req, res) => res.json(await ReportService.stockStatus())),
);
