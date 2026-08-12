import { z } from 'zod';
import { MembershipType } from '@prisma/client';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(120),
  email: z.string().email(),
  // Staff ID / student number / index, optional alternate login identifier.
  identifier: z
    .string()
    .min(2)
    .max(40)
    .optional()
    .transform((v) => (v ? v.trim() : undefined)),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  // Required so overdue reminders and fine notices can actually reach the
  // member. Ghana's Data Protection Act asks that a required field states its
  // purpose, which the registration form does next to this input.
  phone: z
    .string()
    .trim()
    .min(9, 'A phone number is required so we can reach you about due dates and fines')
    .max(20)
    .regex(
      // Ghana local (0XXXXXXXXX) or international (+233XXXXXXXXX), spaces and
      // dashes tolerated because people type numbers the way they say them.
      /^(\+?\d{1,4}[\s-]?)?\d[\d\s-]{7,}$/,
      'Enter a valid phone number, for example 024 123 4567 or +233 24 123 4567',
    ),
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
