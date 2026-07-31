import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Role hierarchy: MEMBER < LIBRARIAN < ADMIN. Higher rank inherits lower permissions.
const ROLE_RANK: Record<Role, number> = {
  [Role.MEMBER]: 1,
  [Role.LIBRARIAN]: 2,
  [Role.ADMIN]: 3,
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

// requireRole(minRole) — passes if the caller's role rank >= minRole rank.
export function requireRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }
    next();
  };
}
