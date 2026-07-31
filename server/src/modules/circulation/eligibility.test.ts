import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();
let staffToken = '';
let memberId = '';
let bookId = '';
let copyId = '';
const email = `elig_${Date.now()}@bibliohub.test`;
const isbn = `ELIG-${Date.now()}`;

describe('eligibility (FR13)', () => {
  beforeAll(async () => {
    staffToken = (
      await request(app).post('/api/auth/login').send({ email: 'librarian@bibliohub.local', password: 'Librarian123!' })
    ).body.accessToken;

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Eligibility Member', email, password: 'password123' });
    memberId = reg.body.user.id;

    const cat = await prisma.category.upsert({ where: { name: 'EligCat' }, update: {}, create: { name: 'EligCat' } });
    const pub = await prisma.publisher.upsert({ where: { name: 'EligPub' }, update: {}, create: { name: 'EligPub' } });
    const book = await prisma.book.create({
      data: { isbn, title: 'Eligibility Book', publicationYear: 2025, categoryId: cat.id, publisherId: pub.id },
    });
    bookId = book.id;
    copyId = (await prisma.bookCopy.create({ data: { bookId, accessionNumber: `${isbn}-1`, shelfLocation: 'E-1' } })).id;
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({ where: { copy: { bookId } } });
    await prisma.bookCopy.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
    await prisma.notification.deleteMany({ where: { userId: memberId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('reports an active member as eligible', async () => {
    const res = await request(app)
      .get(`/api/circulation/eligibility/${memberId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(true);
  });

  it('blocks checkout for a suspended member (403)', async () => {
    await prisma.user.update({ where: { id: memberId }, data: { status: 'SUSPENDED' } });
    const res = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: memberId, copyId });
    expect(res.status).toBe(403);
    // Copy must remain available since the checkout was rejected.
    const copy = await prisma.bookCopy.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.status).toBe('AVAILABLE');
  });

  it('allows checkout again after reactivation', async () => {
    await prisma.user.update({ where: { id: memberId }, data: { status: 'ACTIVE' } });
    const res = await request(app)
      .post('/api/circulation/checkout')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ userId: memberId, copyId });
    expect(res.status).toBe(201);
  });
});
