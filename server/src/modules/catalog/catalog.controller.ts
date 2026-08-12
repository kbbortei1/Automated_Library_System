import type { Request, Response } from 'express';
import { CatalogService } from './catalog.service.js';
import { CopyService } from './copy.service.js';
import { LookupService } from './lookup.service.js';

export const CatalogController = {
  // --- Books ---
  async create(req: Request, res: Response) {
    res.status(201).json(await CatalogService.createBook(req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await CatalogService.updateBook(req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    res.json(await CatalogService.softDeleteBook(req.params.id));
  },
  async detail(req: Request, res: Response) {
    res.json(await CatalogService.getBookDetail(req.params.id, { includeCopies: true }));
  },
  async search(req: Request, res: Response) {
    res.json(await CatalogService.searchBooks(req.query));
  },

  // --- Copies ---
  async addCopy(req: Request, res: Response) {
    res.status(201).json(await CopyService.addCopies({ bookId: req.params.id, ...req.body }));
  },
  async listCopies(req: Request, res: Response) {
    res.json(await CopyService.listByBook(req.params.id));
  },
  async findCopyByAccession(req: Request, res: Response) {
    res.json(await CopyService.findByAccession(String(req.query.accessionNumber)));
  },
  async updateCopyStatus(req: Request, res: Response) {
    res.json(await CopyService.updateCopyStatus(req.params.copyId, req.body.status));
  },
  async removeCopy(req: Request, res: Response) {
    res.json(await CopyService.softDelete(req.params.copyId));
  },

  // --- Lookups ---
  async listCategories(_req: Request, res: Response) {
    res.json(await LookupService.listCategories());
  },
  async listPublishers(_req: Request, res: Response) {
    res.json(await LookupService.listPublishers());
  },
  async listAuthors(_req: Request, res: Response) {
    res.json(await LookupService.listAuthors());
  },
  async createCategory(req: Request, res: Response) {
    res.status(201).json(await LookupService.createCategory(req.body));
  },
  async createPublisher(req: Request, res: Response) {
    res.status(201).json(await LookupService.createPublisher(req.body));
  },
  async createAuthor(req: Request, res: Response) {
    res.status(201).json(await LookupService.createAuthor(req.body));
  },
};
