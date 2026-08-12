import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { SchedulerService } from '../scheduler/scheduler.service.js';

const app = createApp();
const email = `notif_${Date.now()}@bibliohub.test`;
let token = '';
let userId = '';
let bookId = '';
let copyId = '';
const isbn = `NOTIF-${Date.now()}`;

describe('notifications & scheduler', () => {
  beforeAll(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Notif User', email, password: 'password123', phone: '024 333 4444' });
    token = reg.body.accessToken;
    userId = reg.body.user.id;

    const cat = await prisma.category.upsert({ where: { name: 'NotifCat' }, update: {}, create: { name: 'NotifCat' } });
    const pub = await prisma.publisher.upsert({ where: { name: 'NotifPub' }, update: {}, create: { name: 'NotifPub' } });
    const book = await prisma.book.create({
      data: { isbn, title: 'Notify Book', publicationYear: 2024, categoryId: cat.id, publisherId: pub.id },
    });
    bookId = book.id;
    copyId = (await prisma.bookCopy.create({ data: { bookId, accessionNumber: `${isbn}-1`, shelfLocation: 'N-1' } })).id;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.loan.deleteMany({ where: { copy: { bookId } } });
    await prisma.bookCopy.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('registration creates a WELCOME in-app notification', async () => {
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.unread).toBeGreaterThanOrEqual(1);
    expect(res.body.items.some((n: { type: string }) => n.type === 'WELCOME')).toBe(true);
  });

  it('marks all notifications read', async () => {
    await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${token}`);
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.body.unread).toBe(0);
  });

  it('due-soon reminder job notifies a member with a loan due soon', async () => {
    // Active loan due tomorrow.
    await prisma.loan.create({
      data: {
        copyId,
        userId,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
      },
    });
    const sent = await SchedulerService.runDueSoonReminders();
    expect(sent).toBeGreaterThanOrEqual(1);

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.body.items.some((n: { type: string }) => n.type === 'DUE_SOON')).toBe(true);
  });

  it('overdue sweep marks loans overdue and notifies', async () => {
    await prisma.loan.updateMany({
      where: { copyId, userId, status: 'ACTIVE' },
      data: { dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });
    const count = await SchedulerService.runOverdueSweep();
    expect(count).toBeGreaterThanOrEqual(1);

    const loan = await prisma.loan.findFirstOrThrow({ where: { copyId, userId } });
    expect(loan.status).toBe('OVERDUE');

    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.body.items.some((n: { type: string }) => n.type === 'OVERDUE')).toBe(true);
  });
});
