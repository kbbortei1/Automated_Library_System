import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';

// Validates and replaces req.body / req.query with parsed, typed data (NFR02).
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as ZodInfer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Express 4 req.query is read-only-ish; cast through unknown for the parsed result.
    (req as unknown as { query: ZodInfer<T> }).query = schema.parse(req.query);
    next();
  };
}
