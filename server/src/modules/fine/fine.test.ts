import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();
let staffToken = '';
let memberToken = '';
let memberId = '';
let bookId = '';
let copyId = '';
let fineId = '';
const isbn = `FINE-${Date.now()}`;

async function login(email: string, password: string) {
  return (await request(app).post('/api/auth/login').send({ email, password })).body.accessToken as string;
}

describe('fines & enforcement', () => {
  beforeAll(async () => {
    staffToken = await login('librarian@als.local', 'Librarian123!');
    memberToken = await login('member@als.local', 'Member123!');
    memberId = (await prisma.user.findUniqueOrThrow({ where: { email: 'member@als.local' } })).id;

    const cat = await prisma.category.upsert({ where: { name: 'FineTest' }, update: {}, create: { name: 'FineTest' } });
    const pub = await prisma.publisher.upsert({ where: { name: 'FinePub' }, update: {}, create: { name: 'FinePub' } });
    const book = await prisma.book.create({
      data: { isbn, title: 'Fine Test Book', publicationYear: 2023, categoryId: cat.id, publisherId: pub.id },
    });
    bookId = book.id;
    copyId = (await prisma.bookCopy.create({ data: { bookId, accessionNumber: `${isbn}-1`, shelfLocation: 'F-1' } })).id;

    // Check out, backdate, return → produces a fine.
    await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: memberId, copyId });
    const loan = await prisma.loan.findFirstOrThrow({ where: { copyId, status: 'ACTIVE' } });
    await prisma.loan.update({
      where: { id: loan.id },
      data: { dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const ret = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ loanId: loan.id });
    fineId = ret.body.fine.id;
  });

  afterAll(async () => {
    await prisma.fine.deleteMany({ where: { userId: memberId, loan: { copy: { bookId } } } });
    await prisma.loan.deleteMany({ where: { copy: { bookId } } });
    await prisma.bookCopy.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.$disconnect();
  });

  it('member sees their fine and outstanding total', async () => {
    const res = await request(app).get('/api/fines/mine').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.outstanding).toBeGreaterThan(0);
    expect(res.body.fines.some((f: { id: string }) => f.id === fineId)).toBe(true);
  });

  it('member cannot access staff fine list (403)', async () => {
    const res = await request(app).get('/api/fines').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('defaulters report includes the member', async () => {
    const res = await request(app).get('/api/fines/defaulters').set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((d: { id: string }) => d.id === memberId)).toBe(true);
  });

  it('staff pays the fine (status → PAID, outstanding → 0)', async () => {
    const pay = await request(app)
      .post(`/api/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(pay.status).toBe(200);
    expect(pay.body.status).toBe('PAID');

    const mine = await request(app).get('/api/fines/mine').set('Authorization', `Bearer ${memberToken}`);
    expect(mine.body.outstanding).toBe(0);
  });

  it('cannot pay an already-paid fine (400)', async () => {
    const res = await request(app)
      .post(`/api/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(400);
  });
});
