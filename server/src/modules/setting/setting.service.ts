import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

/**
 * Settings a signed-in member is allowed to read.
 *
 * This is the library's published policy: the rules a member is held to, plus
 * how to reach the library. An allow-list rather than a deny-list, so a
 * setting added later is private until somebody decides otherwise.
 */
const PUBLIC_POLICY_KEYS = [
  'default_loan_period_days',
  'due_soon_reminder_days',
  'max_renewals',
  'max_renewals_student',
  'max_renewals_faculty',
  'max_renewals_public',
  'borrowing_limit_student',
  'borrowing_limit_faculty',
  'borrowing_limit_public',
  'fine_rate_per_day',
  'fine_block_threshold',
  'reservation_ready_window_hours',
  'library_phone',
  'library_email',
  'library_hours',
  'library_locations',
] as const;

export type PublicPolicyKey = (typeof PUBLIC_POLICY_KEYS)[number];

// Typed accessors over the Setting table. Values are stored as strings and parsed here.
export const SettingService = {
  async getAll() {
    return prisma.setting.findMany({ orderBy: { key: 'asc' } });
  },

  /**
   * The published policy, as a plain key/value map.
   *
   * A member who is refused at the desk needs to be able to look up the rule
   * that refused them, but /settings is staff-only and returns everything.
   * This returns only the allow-listed keys.
   */
  async getPublicPolicy(): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [...PUBLIC_POLICY_KEYS] } },
      select: { key: true, value: true },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  async getValue(key: string): Promise<string> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundError(`Setting "${key}" not found`);
    return setting.value;
  },

  async getNumber(key: string): Promise<number> {
    const value = await this.getValue(key);
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error(`Setting "${key}" is not a number: ${value}`);
    return n;
  },

  /**
   * Numeric setting, or null when the key is absent.
   *
   * Used where a specific key overrides a general one, so a missing override
   * is an ordinary outcome rather than an error.
   */
  async getNumberOptional(key: string): Promise<number | null> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    if (!setting) return null;
    const n = Number(setting.value);
    return Number.isNaN(n) ? null : n;
  },

  async update(key: string, value: string) {
    return prisma.setting.update({ where: { key }, data: { value } });
  },
};
