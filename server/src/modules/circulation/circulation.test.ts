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
let loanId = '';
const isbn = `CIRC-${Date.now()}`;

async function login(email: string, password: string) {
  return (await request(app).post('/api/auth/login').send({ email, password })).body.accessToken as string;
}

describe('circulation', () => {
  beforeAll(async () => {
    staffToken = await login('librarian@bibliohub.local', 'Librarian123!');
    memberToken = await login('member@bibliohub.local', 'Member123!');
    memberId = (await prisma.user.findUniqueOrThrow({ where: { email: 'member@bibliohub.local' } })).id;

    const cat = await prisma.category.upsert({ where: { name: 'CircTest' }, update: {}, create: { name: 'CircTest' } });
    const pub = await prisma.publisher.upsert({ where: { name: 'CircPub' }, update: {}, create: { name: 'CircPub' } });
    const book = await prisma.book.create({
      data: { isbn, title: 'Circulation Test Book', publicationYear: 2021, categoryId: cat.id, publisherId: pub.id },
    });
    bookId = book.id;
    const copy = await prisma.bookCopy.create({
      data: { bookId, accessionNumber: `${isbn}-1`, shelfLocation: 'C-1' },
    });
    copyId = copy.id;
  });

  afterAll(async () => {
    await prisma.fine.deleteMany({ where: { loan: { copy: { bookId } } } });
    await prisma.loan.deleteMany({ where: { copy: { bookId } } });
    await prisma.bookCopy.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.$disconnect();
  });

  it('staff checks out a copy to a member (copy becomes CHECKED_OUT)', async () => {
    const res = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: memberId, copyId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ACTIVE');
    loanId = res.body.id;
    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.status).toBe('CHECKED_OUT');
  });

  it('member sees the loan in my-loans', async () => {
    const res = await request(app)
      .get('/api/circulation/my-loans?active=true')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.some((l: { id: string }) => l.id === loanId)).toBe(true);
  });

  it('member renews their own loan (renewalCount increments)', async () => {
    const res = await request(app)
      .post(`/api/circulation/loans/${loanId}/renew`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.renewalCount).toBe(1);
  });

  it('returning an overdue loan creates a fine and frees the copy', async () => {
    // Force the loan overdue by backdating the due date.
    await prisma.loan.update({
      where: { id: loanId },
      data: { dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    });

    const res = await request(app)
      .post('/api/circulation/return')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ loanId });
    expect(res.status).toBe(200);
    expect(res.body.loan.status).toBe('RETURNED');
    expect(res.body.fine).toBeTruthy();
    expect(Number(res.body.fine.amount)).toBeGreaterThan(0);

    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.status).toBe('AVAILABLE');
  });
});
