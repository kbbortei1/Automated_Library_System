import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();
let staffToken = '';
let memberToken = '';
let memberId = '';
let secondMemberId = '';
let secondToken = '';
let bookId = '';
let copyId = '';
const isbn = `RES-${Date.now()}`;
const secondEmail = `res_second_${Date.now()}@bibliohub.test`;

async function login(email: string, password: string) {
  return (await request(app).post('/api/auth/login').send({ email, password })).body.accessToken as string;
}

describe('reservations (FIFO + promote-on-return)', () => {
  beforeAll(async () => {
    staffToken = await login('librarian@bibliohub.local', 'Librarian123!');
    memberToken = await login('member@bibliohub.local', 'Member123!');
    memberId = (await prisma.user.findUniqueOrThrow({ where: { email: 'member@bibliohub.local' } })).id;

    // A second member for the queue.
    await request(app).post('/api/auth/register').send({
      fullName: 'Queue Member',
      email: secondEmail,
      password: 'password123',
      phone: '024 555 6666',
    });
    secondToken = await login(secondEmail, 'password123');
    secondMemberId = (await prisma.user.findUniqueOrThrow({ where: { email: secondEmail } })).id;

    const cat = await prisma.category.upsert({ where: { name: 'ResTest' }, update: {}, create: { name: 'ResTest' } });
    const pub = await prisma.publisher.upsert({ where: { name: 'ResPub' }, update: {}, create: { name: 'ResPub' } });
    const book = await prisma.book.create({
      data: { isbn, title: 'Reservation Test Book', publicationYear: 2022, categoryId: cat.id, publisherId: pub.id },
    });
    bookId = book.id;
    copyId = (
      await prisma.bookCopy.create({ data: { bookId, accessionNumber: `${isbn}-1`, shelfLocation: 'R-1' } })
    ).id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { bookId } });
    await prisma.loan.deleteMany({ where: { copy: { bookId } } });
    await prisma.bookCopy.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.notification.deleteMany({ where: { userId: secondMemberId } });
    await prisma.user.deleteMany({ where: { email: secondEmail } });
    await prisma.$disconnect();
  });

  it('checks out the only copy to member A', async () => {
    const res = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: memberId, copyId });
    expect(res.status).toBe(201);
  });

  it('member B reserves → PENDING (no copy available)', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${secondToken}`)
      .send({ bookId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.queuePosition).toBe(1);
  });

  it('blocks member A from renewing while someone is waiting', async () => {
    const loan = await prisma.loan.findFirstOrThrow({ where: { copyId, status: 'ACTIVE' } });
    const res = await request(app)
      .post(`/api/circulation/loans/${loan.id}/renew`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(400);
  });

  it('on return, member B is promoted to READY and the copy stays RESERVED', async () => {
    const res = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ copyId });
    expect(res.status).toBe(200);
    expect(res.body.reservationPromoted).toBe(true);

    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.status).toBe('RESERVED');

    const ready = await prisma.reservation.findFirstOrThrow({ where: { bookId, userId: secondMemberId } });
    expect(ready.status).toBe('READY');
  });

  it('member B cancels the READY hold → copy becomes AVAILABLE again', async () => {
    const ready = await prisma.reservation.findFirstOrThrow({ where: { bookId, userId: secondMemberId } });
    const res = await request(app)
      .post(`/api/reservations/${ready.id}/cancel`)
      .set('Authorization', `Bearer ${secondToken}`);
    expect(res.status).toBe(200);

    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.status).toBe('AVAILABLE');
  });

  it('reserving when a copy is free goes straight to READY', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('READY');
  });
});
