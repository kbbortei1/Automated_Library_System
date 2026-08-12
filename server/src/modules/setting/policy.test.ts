import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ identifier: email, password });
  expect(res.status).toBe(200);
  return res.body.accessToken;
}

describe('published policy', () => {
  let memberToken: string;
  let staffToken: string;

  beforeAll(async () => {
    memberToken = await login('member@bibliohub.local', 'Member123!');
    staffToken = await login('librarian@bibliohub.local', 'Librarian123!');
  });

  it('lets a member read the rules they are held to', async () => {
    const res = await request(app)
      .get('/api/settings/policy')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    // The values a member is actually judged against at the desk.
    expect(res.body).toHaveProperty('default_loan_period_days');
    expect(res.body).toHaveProperty('fine_rate_per_day');
    expect(res.body).toHaveProperty('fine_block_threshold');
    expect(res.body).toHaveProperty('borrowing_limit_student');
  });

  it('still refuses a member the full settings list', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  it('withholds a setting that is not on the allow-list', async () => {
    // Every setting seeded today happens to be publishable, so a subset check
    // would pass on an empty allow-list. Add a key that is deliberately not
    // listed and prove it stays private.
    const key = `private_test_key_${Date.now()}`;
    await prisma.setting.create({ data: { key, value: 'secret', description: 'test' } });

    try {
      const staffRes = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${staffToken}`);
      const policyRes = await request(app)
        .get('/api/settings/policy')
        .set('Authorization', `Bearer ${memberToken}`);

      const staffKeys: string[] = staffRes.body.map((s: { key: string }) => s.key);
      expect(staffKeys).toContain(key); // staff see it
      expect(Object.keys(policyRes.body)).not.toContain(key); // members do not
      expect(JSON.stringify(policyRes.body)).not.toContain('secret');
    } finally {
      await prisma.setting.delete({ where: { key } });
    }
  });

  it('requires a signed-in user', async () => {
    const res = await request(app).get('/api/settings/policy');
    expect(res.status).toBe(401);
  });
});
