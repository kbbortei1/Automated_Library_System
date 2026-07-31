import { MembershipType, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from '../../lib/jwt.js';
import { ConflictError, UnauthorizedError, ForbiddenError } from '../../lib/errors.js';
import { PUBLIC_USER_SELECT, UserService } from '../user/user.service.js';
import { NotificationService } from '../notification/notification.service.js';

interface AuthUser {
  id: string;
  email: string;
  role: AccessTokenPayload['role'];
}

function issueTokens(user: AuthUser) {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, email: user.email }),
    refreshToken: signRefreshToken({ sub: user.id }),
  };
}

export const AuthService = {
  async register(input: {
    fullName: string;
    email: string;
    identifier?: string;
    password: string;
    phone?: string;
    membershipType?: MembershipType;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('An account with that email already exists');

    if (input.identifier) {
      const dupeId = await prisma.user.findUnique({ where: { identifier: input.identifier } });
      if (dupeId) throw new ConflictError('That member ID is already registered');
    }

    const membershipType = input.membershipType ?? MembershipType.PUBLIC;
    const rules = await UserService.resolveBorrowingRules(membershipType);

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        identifier: input.identifier,
        phone: input.phone,
        passwordHash: await hashPassword(input.password),
        membershipType,
        ...rules,
      },
      select: PUBLIC_USER_SELECT,
    });

    await NotificationService.notifyWelcome(user.id, user.fullName);

    return { user, ...issueTokens(user) };
  },

  // `identifier` may be an email or a member's ID (staff ID / student no / index).
  async login(identifier: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier }, { identifier }],
      },
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account is suspended. Contact the library.');
    }

    const { passwordHash: _omit, ...safe } = user;
    return { user: safe, ...issueTokens(user) };
  },

  // Stateless refresh: verify the refresh token, re-issue both tokens (rotation).
  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new UnauthorizedError('Account no longer exists');
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError('Your account is suspended.');
    }

    return { user, ...issueTokens(user) };
  },
};
