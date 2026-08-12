import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { canAdminister } from '../../middleware/auth.js';

const admin = { id: 'admin-1', role: Role.ADMIN };
const admin2 = { id: 'admin-2', role: Role.ADMIN };
const librarian = { id: 'lib-1', role: Role.LIBRARIAN };
const librarian2 = { id: 'lib-2', role: Role.LIBRARIAN };
const member = { id: 'mem-1', role: Role.MEMBER };

describe('canAdminister', () => {
  it('lets a librarian administer a member', () => {
    expect(canAdminister(librarian, member)).toBe(true);
  });

  // The reported defect: requireRole(LIBRARIAN) gates the endpoint but says
  // nothing about the target, so a librarian could suspend an administrator.
  it('stops a librarian administering an admin', () => {
    expect(canAdminister(librarian, admin)).toBe(false);
  });

  it('stops a librarian administering another librarian', () => {
    expect(canAdminister(librarian, librarian2)).toBe(false);
  });

  it('lets an admin administer a librarian and a member', () => {
    expect(canAdminister(admin, librarian)).toBe(true);
    expect(canAdminister(admin, member)).toBe(true);
  });

  it('lets an admin administer another admin', () => {
    expect(canAdminister(admin, admin2)).toBe(true);
  });

  it('stops anyone administering themselves, which would allow self-lockout', () => {
    expect(canAdminister(admin, admin)).toBe(false);
    expect(canAdminister(librarian, librarian)).toBe(false);
  });
});
