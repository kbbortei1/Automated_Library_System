import { CopyStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import { LookupService } from './lookup.service.js';

export interface BookWriteInput {
  isbn: string;
  title: string;
  description?: string;
  publicationYear: number;
  edition?: string;
  language?: string;
  coverImageUrl?: string;
  category: string; // name — find-or-created
  publisher: string; // name — find-or-created
  authors: string[]; // names — find-or-created
}

const bookInclude = {
  category: true,
  publisher: true,
  authors: true,
} satisfies Prisma.BookInclude;

// Attach computed availability (count of AVAILABLE copies) + copy totals.
async function withAvailability<T extends { id: string }>(book: T) {
  const [available, total] = await Promise.all([
    prisma.bookCopy.count({
      where: { bookId: book.id, status: CopyStatus.AVAILABLE, deletedAt: null },
    }),
    prisma.bookCopy.count({ where: { bookId: book.id, deletedAt: null } }),
  ]);
  return { ...book, availableCopies: available, totalCopies: total };
}

export const CatalogService = {
  async createBook(input: BookWriteInput) {
    const [categoryId, publisherId, authorIds] = await Promise.all([
      LookupService.findOrCreateCategory(input.category),
      LookupService.findOrCreatePublisher(input.publisher),
      LookupService.findOrCreateAuthors(input.authors),
    ]);

    const book = await prisma.book.create({
      data: {
        isbn: input.isbn,
        title: input.title,
        description: input.description,
        publicationYear: input.publicationYear,
        edition: input.edition,
        language: input.language,
        coverImageUrl: input.coverImageUrl,
        categoryId,
        publisherId,
        authors: { connect: authorIds.map((id) => ({ id })) },
      },
      include: bookInclude,
    });
    return withAvailability(book);
  },

  async updateBook(id: string, input: BookWriteInput) {
    const existing = await prisma.book.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Book not found');

    const [categoryId, publisherId, authorIds] = await Promise.all([
      LookupService.findOrCreateCategory(input.category),
      LookupService.findOrCreatePublisher(input.publisher),
      LookupService.findOrCreateAuthors(input.authors),
    ]);

    const book = await prisma.book.update({
      where: { id },
      data: {
        isbn: input.isbn,
        title: input.title,
        description: input.description,
        publicationYear: input.publicationYear,
        edition: input.edition,
        language: input.language,
        coverImageUrl: input.coverImageUrl,
        categoryId,
        publisherId,
        authors: { set: authorIds.map((aid) => ({ id: aid })) },
      },
      include: bookInclude,
    });
    return withAvailability(book);
  },

  async softDeleteBook(id: string) {
    const existing = await prisma.book.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Book not found');
    await prisma.book.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  },

  async getBookDetail(id: string, opts: { includeCopies?: boolean } = {}) {
    const book = await prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...bookInclude,
        ...(opts.includeCopies
          ? { copies: { where: { deletedAt: null }, orderBy: { accessionNumber: 'asc' } } }
          : {}),
      },
    });
    if (!book) throw new NotFoundError('Book not found');
    return withAvailability(book);
  },

  // Multi-field search with filters + pagination (Phase 3 consumes this from the public catalogue).
  async searchBooks(params: {
    q?: string;
    categoryId?: string;
    authorId?: string;
    language?: string;
    availableOnly?: boolean;
    sort?: 'title' | 'newest';
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 12));

    const where: Prisma.BookWhereInput = {
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.language ? { language: params.language } : {}),
      ...(params.authorId ? { authors: { some: { id: params.authorId } } } : {}),
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' } },
              { isbn: { contains: params.q, mode: 'insensitive' } },
              { description: { contains: params.q, mode: 'insensitive' } },
              { authors: { some: { name: { contains: params.q, mode: 'insensitive' } } } },
              { category: { name: { contains: params.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.BookOrderByWithRelationInput =
      params.sort === 'newest' ? { createdAt: 'desc' } : { title: 'asc' };

    const [rows, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: bookInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.book.count({ where }),
    ]);

    let items = await Promise.all(rows.map(withAvailability));
    if (params.availableOnly) items = items.filter((b) => b.availableCopies > 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};
