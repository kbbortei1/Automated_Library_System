import type { NextFunction, Request, Response, RequestHandler } from 'express';

// Wraps async route handlers so rejected promises reach the error handler (NFR05).
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
