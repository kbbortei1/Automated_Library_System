import { Router } from 'express';
import { Role } from '@prisma/client';
import { CatalogController } from './catalog.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  addCopySchema,
  bookWriteSchema,
  createAuthorSchema,
  createCategorySchema,
  createPublisherSchema,
  searchBooksSchema,
  updateCopyStatusSchema,
} from './catalog.schemas.js';

export const catalogRouter = Router();
const staff = [requireAuth, requireRole(Role.LIBRARIAN)];

// --- Lookups (reads for any authenticated user; creates staff-only) ---
catalogRouter.get('/categories', requireAuth, asyncHandler(CatalogController.listCategories));
catalogRouter.get('/publishers', requireAuth, asyncHandler(CatalogController.listPublishers));
catalogRouter.get('/authors', requireAuth, asyncHandler(CatalogController.listAuthors));
catalogRouter.post(
  '/categories',
  ...staff,
  validateBody(createCategorySchema),
  asyncHandler(CatalogController.createCategory),
);
catalogRouter.post(
  '/publishers',
  ...staff,
  validateBody(createPublisherSchema),
  asyncHandler(CatalogController.createPublisher),
);
catalogRouter.post(
  '/authors',
  ...staff,
  validateBody(createAuthorSchema),
  asyncHandler(CatalogController.createAuthor),
);

// --- Books ---
catalogRouter.get(
  '/books',
  requireAuth,
  validateQuery(searchBooksSchema),
  asyncHandler(CatalogController.search),
);
catalogRouter.get('/books/:id', requireAuth, asyncHandler(CatalogController.detail));
catalogRouter.post(
  '/books',
  ...staff,
  validateBody(bookWriteSchema),
  asyncHandler(CatalogController.create),
);
catalogRouter.put(
  '/books/:id',
  ...staff,
  validateBody(bookWriteSchema),
  asyncHandler(CatalogController.update),
);
catalogRouter.delete('/books/:id', ...staff, asyncHandler(CatalogController.remove));

// --- Copies (staff) ---
catalogRouter.get('/copies/lookup', ...staff, asyncHandler(CatalogController.findCopyByAccession));
catalogRouter.get('/books/:id/copies', ...staff, asyncHandler(CatalogController.listCopies));
catalogRouter.post(
  '/books/:id/copies',
  ...staff,
  validateBody(addCopySchema),
  asyncHandler(CatalogController.addCopy),
);
catalogRouter.patch(
  '/copies/:copyId/status',
  ...staff,
  validateBody(updateCopyStatusSchema),
  asyncHandler(CatalogController.updateCopyStatus),
);
catalogRouter.delete('/copies/:copyId', ...staff, asyncHandler(CatalogController.removeCopy));
