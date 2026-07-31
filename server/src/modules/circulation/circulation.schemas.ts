import { z } from 'zod';
import { LoanStatus } from '@prisma/client';

export const checkoutSchema = z
  .object({
    userId: z.string().uuid(),
    copyId: z.string().uuid().optional(),
    bookId: z.string().uuid().optional(),
  })
  .refine((d) => d.copyId || d.bookId, {
    message: 'Provide copyId or bookId',
    path: ['copyId'],
  });

export const returnSchema = z
  .object({
    loanId: z.string().uuid().optional(),
    copyId: z.string().uuid().optional(),
  })
  .refine((d) => d.loanId || d.copyId, {
    message: 'Provide loanId or copyId',
    path: ['loanId'],
  });

export const listLoansSchema = z.object({
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const myLoansSchema = z.object({
  active: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
