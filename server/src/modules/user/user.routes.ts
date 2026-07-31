import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from './user.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  changePasswordSchema,
  listMembersSchema,
  setMembershipSchema,
  setRoleSchema,
  setStatusSchema,
  updateProfileSchema,
} from './user.schemas.js';

export const userRouter = Router();

// --- Self-service (any authenticated user) ---
userRouter.get('/me', requireAuth, asyncHandler(UserController.getMe));
userRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(UserController.updateProfile),
);
userRouter.post(
  '/me/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(UserController.changePassword),
);

// --- Staff: member management (LIBRARIAN+) ---
userRouter.get(
  '/',
  requireAuth,
  requireRole(Role.LIBRARIAN),
  validateQuery(listMembersSchema),
  asyncHandler(UserController.listMembers),
);
userRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole(Role.LIBRARIAN),
  validateBody(setStatusSchema),
  asyncHandler(UserController.setStatus),
);

// --- Admin only: role + membership changes ---
userRouter.patch(
  '/:id/role',
  requireAuth,
  requireRole(Role.ADMIN),
  validateBody(setRoleSchema),
  asyncHandler(UserController.setRole),
);
userRouter.patch(
  '/:id/membership',
  requireAuth,
  requireRole(Role.ADMIN),
  validateBody(setMembershipSchema),
  asyncHandler(UserController.setMembership),
);
