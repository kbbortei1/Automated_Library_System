import { MembershipType, Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { SettingService } from '../setting/setting.service.js';
import { NotificationService } from '../notification/notification.service.js';

// Fields safe to return to clients (never expose passwordHash).
export const PUBLIC_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  identifier: true,
  phone: true,
  role: true,
  membershipType: true,
  status: true,
  borrowingLimit: true,
  loanPeriodDays: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const LIMIT_KEY_BY_TYPE: Record<MembershipType, string> = {
  [MembershipType.STUDENT]: 'borrowing_limit_student',
  [MembershipType.FACULTY]: 'borrowing_limit_faculty',
  [MembershipType.PUBLIC]: 'borrowing_limit_public',
};

export const UserService = {
  // Resolve borrowing limit + loan period from Settings for a membership type.
  async resolveBorrowingRules(
    membershipType: MembershipType,
  ): Promise<{ borrowingLimit: number; loanPeriodDays: number }> {
    const [borrowingLimit, loanPeriodDays] = await Promise.all([
      SettingService.getNumber(LIMIT_KEY_BY_TYPE[membershipType]),
      SettingService.getNumber('default_loan_period_days'),
    ]);
    return { borrowingLimit, loanPeriodDays };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  },

  async updateProfile(userId: string, data: { fullName?: string; phone?: string | null }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: PUBLIC_USER_SELECT,
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Current password is incorrect');
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return { success: true };
  },

  async listMembers(params: {
    search?: string;
    status?: UserStatus;
    role?: Role;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.role ? { role: params.role } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
              { identifier: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: PUBLIC_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async setStatus(userId: string, status: UserStatus) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: PUBLIC_USER_SELECT,
    });
    if (status === UserStatus.SUSPENDED && user.status !== UserStatus.SUSPENDED) {
      await NotificationService.notifyAccountSuspended(userId);
    }
    return updated;
  },

  async setRole(userId: string, role: Role) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: PUBLIC_USER_SELECT,
    });
  },

  // Used when an admin changes a member's membership type, re-resolve their rules.
  async setMembershipType(userId: string, membershipType: MembershipType) {
    const rules = await this.resolveBorrowingRules(membershipType);
    return prisma.user.update({
      where: { id: userId },
      data: { membershipType, ...rules },
      select: PUBLIC_USER_SELECT,
    });
  },
};

// Guard re-export to keep imports tidy in controllers.
export { BadRequestError };
