import { Router } from 'express';
import { Role } from '@prisma/client';
import { ReportService } from './report.service.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const reportRouter = Router();
const staff = [requireAuth, requireRole(Role.LIBRARIAN)];

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
