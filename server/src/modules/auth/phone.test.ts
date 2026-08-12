import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.schemas.js';

const base = {
  fullName: 'Ama Mensah',
  email: 'ama@st.knust.edu.gh',
  password: 'Password123!',
};

const accepts = (phone: string) => registerSchema.safeParse({ ...base, phone }).success;

describe('registration phone number', () => {
  it('accepts Ghanaian numbers the way people actually write them', () => {
    expect(accepts('0241234567')).toBe(true);
    expect(accepts('024 123 4567')).toBe(true);
    expect(accepts('024-123-4567')).toBe(true);
    expect(accepts('+233241234567')).toBe(true);
    expect(accepts('+233 24 123 4567')).toBe(true);
  });

  it('rejects a missing number, which was previously allowed', () => {
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(accepts('')).toBe(false);
  });

  it('rejects numbers that are too short to dial', () => {
    expect(accepts('12345')).toBe(false);
    expect(accepts('024')).toBe(false);
  });

  it('rejects text', () => {
    expect(accepts('call me maybe')).toBe(false);
    expect(accepts('n/a')).toBe(false);
  });

  it('explains why the field is required rather than just failing', () => {
    const result = registerSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(' ');
      expect(msg.toLowerCase()).toContain('required');
    }
  });
});
