import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

// Typed accessors over the Setting table. Values are stored as strings and parsed here.
export const SettingService = {
  async getAll() {
    return prisma.setting.findMany({ orderBy: { key: 'asc' } });
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

  async update(key: string, value: string) {
    return prisma.setting.update({ where: { key }, data: { value } });
  },
};
