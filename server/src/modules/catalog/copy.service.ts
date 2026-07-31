import { CopyStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors.js';

// Statuses staff may set manually. CHECKED_OUT / RESERVED are managed by circulation.
const MANUAL_STATUSES: CopyStatus[] = [
  CopyStatus.AVAILABLE,
  CopyStatus.LOST,
  CopyStatus.DAMAGED,
];

export const CopyService = {
  async addCopy(input: {
    bookId: string;
    accessionNumber: string;
    shelfLocation: string;
    acquiredDate?: Date;
  }) {
    const book = await prisma.book.findFirst({ where: { id: input.bookId, deletedAt: null } });
    if (!book) throw new NotFoundError('Book not found');

    const dupe = await prisma.bookCopy.findUnique({
      where: { accessionNumber: input.accessionNumber },
    });
    if (dupe) throw new ConflictError('A copy with that accession number already exists');

    return prisma.bookCopy.create({ data: input });
  },

  async updateCopyStatus(copyId: string, status: CopyStatus) {
    if (!MANUAL_STATUSES.includes(status)) {
      throw new BadRequestError(
        `Status ${status} is managed by circulation and cannot be set manually`,
      );
    }
    const copy = await prisma.bookCopy.findFirst({ where: { id: copyId, deletedAt: null } });
    if (!copy) throw new NotFoundError('Copy not found');

    if (copy.status === CopyStatus.CHECKED_OUT || copy.status === CopyStatus.RESERVED) {
      throw new BadRequestError(
        `Copy is currently ${copy.status}; resolve the loan/reservation before changing status`,
      );
    }
    return prisma.bookCopy.update({ where: { id: copyId }, data: { status } });
  },

  async listByBook(bookId: string) {
    return prisma.bookCopy.findMany({
      where: { bookId, deletedAt: null },
      orderBy: { accessionNumber: 'asc' },
    });
  },

  getAvailableCount(bookId: string) {
    return prisma.bookCopy.count({
      where: { bookId, status: CopyStatus.AVAILABLE, deletedAt: null },
    });
  },

  async findByAccession(accessionNumber: string) {
    const copy = await prisma.bookCopy.findFirst({
      where: { accessionNumber, deletedAt: null },
      include: { book: { select: { id: true, title: true, isbn: true } } },
    });
    if (!copy) throw new NotFoundError('No copy with that accession number');
    return copy;
  },

  async softDelete(copyId: string) {
    const copy = await prisma.bookCopy.findFirst({ where: { id: copyId, deletedAt: null } });
    if (!copy) throw new NotFoundError('Copy not found');
    if (copy.status === CopyStatus.CHECKED_OUT) {
      throw new BadRequestError('Cannot remove a checked-out copy');
    }
    await prisma.bookCopy.update({ where: { id: copyId }, data: { deletedAt: new Date() } });
    return { success: true };
  },
};
