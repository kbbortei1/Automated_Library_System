import { z } from 'zod';
import { MembershipType, Role, UserStatus } from '@prisma/client';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const listMembersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(Role).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const setStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const setRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const setMembershipSchema = z.object({
  membershipType: z.nativeEnum(MembershipType),
});
