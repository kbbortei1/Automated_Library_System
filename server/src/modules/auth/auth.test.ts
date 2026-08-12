import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();
const unique = `test_${Date.now()}@bibliohub.test`;
const idValue = `STU-${Date.now()}`;

describe('auth flow', () => {
  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: unique } });
    if (user) {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('registers a new member and returns tokens', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User',
      email: unique,
      password: 'password123',
      phone: '024 123 4567',
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user.role).toBe('MEMBER');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Test User',
      email: unique,
      password: 'password123',
      phone: '024 123 4567',
    });
    expect(res.status).toBe(409);
  });

  it('rejects invalid registration payload (422)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'x', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: unique, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('logs in with a member ID (identifier) instead of email', async () => {
    // Assign an identifier to the test user, then sign in with it.
    await prisma.user.update({ where: { email: unique }, data: { identifier: idValue } });
    const byId = await request(app)
      .post('/api/auth/login')
      .send({ identifier: idValue, password: 'password123' });
    expect(byId.status).toBe(200);
    expect(byId.body.user.email).toBe(unique);

    // Email login still works (backward compatible).
    const byEmail = await request(app)
      .post('/api/auth/login')
      .send({ identifier: unique, password: 'password123' });
    expect(byEmail.status).toBe(200);
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: unique, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('protects /api/users/me without a token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('allows /api/users/me with a valid token and blocks member from staff route', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: unique, password: 'password123' });
    const token = login.body.accessToken as string;

    const me = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(unique);

    const staff = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(staff.status).toBe(403);
  });
});
