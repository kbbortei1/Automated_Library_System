import { z } from 'zod';
import { CopyStatus } from '@prisma/client';

const currentYear = new Date().getFullYear();

export const bookWriteSchema = z.object({
  isbn: z.string().min(5).max(20),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  publicationYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(currentYear + 1),
  edition: z.string().max(60).optional(),
  language: z.string().max(40).optional(),
  coverImageUrl: z
    .string()
    .url()
    .max(1000)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  category: z.string().min(1).max(120),
  publisher: z.string().min(1).max(200),
  authors: z.array(z.string().min(1).max(200)).min(1, 'At least one author is required'),
});

export const searchBooksSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  language: z.string().optional(),
  availableOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  sort: z.enum(['title', 'newest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const addCopySchema = z.object({
  accessionNumber: z.string().min(1).max(60),
  shelfLocation: z.string().min(1).max(120),
  acquiredDate: z.coerce.date().optional(),
  // Accessioning a new title usually means several identical copies at once.
  // The accession number given is the first; the rest continue from it.
  quantity: z.coerce.number().int().min(1).max(50).optional(),
});

export const updateCopyStatusSchema = z.object({
  status: z.nativeEnum(CopyStatus),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});
export const createPublisherSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
});
export const createAuthorSchema = z.object({
  name: z.string().min(1).max(200),
  bio: z.string().max(2000).optional(),
});
