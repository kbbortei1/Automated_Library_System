import express from 'express';
import cors from 'cors';
import { corsOrigins } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { prisma } from './lib/prisma.js';
import { asyncHandler } from './lib/asyncHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/user/user.routes.js';
import { settingRouter } from './modules/setting/setting.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { circulationRouter } from './modules/circulation/circulation.routes.js';
import { reservationRouter } from './modules/reservation/reservation.routes.js';
import { fineRouter } from './modules/fine/fine.routes.js';
import { notificationRouter } from './modules/notification/notification.routes.js';
import { reportRouter } from './modules/report/report.routes.js';
import { wireNotifications } from './modules/notification/notification.wiring.js';

export function createApp() {
  wireNotifications(); // connect reservation events → notifications

  const app = express();

  app.use(
    cors({
      origin: corsOrigins.length ? corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json());

  // Health check (Phase 0) — verifies process and DB connectivity.
  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
    }),
  );

  // Feature routers.
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/settings', settingRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/circulation', circulationRouter);
  app.use('/api/reservations', reservationRouter);
  app.use('/api/fines', fineRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/reports', reportRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
