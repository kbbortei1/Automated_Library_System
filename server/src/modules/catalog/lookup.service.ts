import { prisma } from '../../lib/prisma.js';

// Reusable lookups (Author, Category, Publisher) — find-or-create by unique name, no duplicates.
export const LookupService = {
  // --- Reads (for dropdowns / management lists) ---
  listAuthors: () => prisma.author.findMany({ orderBy: { name: 'asc' } }),
  listCategories: () => prisma.category.findMany({ orderBy: { name: 'asc' } }),
  listPublishers: () => prisma.publisher.findMany({ orderBy: { name: 'asc' } }),

  // --- Find-or-create helpers (case-insensitive match on name) ---
  async findOrCreateCategory(name: string): Promise<string> {
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing.id;
    const created = await prisma.category.create({ data: { name } });
    return created.id;
  },

  async findOrCreatePublisher(name: string): Promise<string> {
    const existing = await prisma.publisher.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing.id;
    const created = await prisma.publisher.create({ data: { name } });
    return created.id;
  },

  async findOrCreateAuthors(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const existing = await prisma.author.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      ids.push(existing ? existing.id : (await prisma.author.create({ data: { name } })).id);
    }
    return ids;
  },

  // --- Explicit creates (management screens) ---
  createCategory: (data: { name: string; description?: string }) =>
    prisma.category.create({ data }),
  createPublisher: (data: { name: string; address?: string }) =>
    prisma.publisher.create({ data }),
  createAuthor: (data: { name: string; bio?: string }) => prisma.author.create({ data }),
};
