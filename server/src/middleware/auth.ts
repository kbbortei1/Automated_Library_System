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

/**
 * Whether an actor may administer a target account.
 *
 * requireRole only gates the endpoint, it says nothing about who the target
 * is, so a librarian could suspend an administrator. Privileged accounts have
 * to be protected from the tier below them:
 *
 *  - never act on someone outranking you
 *  - never act on a peer unless you are an admin (librarians cannot suspend
 *    each other)
 *  - never act on yourself, which would otherwise allow self-lockout
 */
export function canAdminister(
  actor: { id: string; role: Role },
  target: { id: string; role: Role },
): boolean {
  if (actor.id === target.id) return false;
  const actorRank = ROLE_RANK[actor.role];
  const targetRank = ROLE_RANK[target.role];
  if (targetRank > actorRank) return false;
  if (targetRank === actorRank && actor.role !== Role.ADMIN) return false;
  return true;
}

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

// requireRole(minRole) passes if the caller's role rank >= minRole rank.
export function requireRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }
    next();
  };
}
