import { z } from 'zod';
import { MembershipType } from '@prisma/client';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(120),
  email: z.string().email(),
  // Staff ID / student number / index — optional alternate login identifier.
  identifier: z
    .string()
    .min(2)
    .max(40)
    .optional()
    .transform((v) => (v ? v.trim() : undefined)),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().max(40).optional(),
  membershipType: z.nativeEnum(MembershipType).optional(),
});

// Login accepts a single credential that may be an email OR a member's ID.
// `email` is kept as an alias for backward compatibility.
export const loginSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((d) => Boolean(d.identifier || d.email), {
    message: 'Provide your email or member ID',
    path: ['identifier'],
  })
  .transform((d) => ({ identifier: (d.identifier ?? d.email)!.trim(), password: d.password }));

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
