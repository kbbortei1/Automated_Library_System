import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const app = createApp();
let staffToken = '';
let memberToken = '';
let bookId = '';
const isbn = `TEST-${Date.now()}`;

async function login(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('catalog & inventory', () => {
  beforeAll(async () => {
    staffToken = await login('librarian@als.local', 'Librarian123!');
    memberToken = await login('member@als.local', 'Member123!');
  });

  afterAll(async () => {
    await prisma.bookCopy.deleteMany({ where: { book: { isbn } } });
    const book = await prisma.book.findUnique({ where: { isbn } });
    if (book) await prisma.book.delete({ where: { id: book.id } });
    await prisma.$disconnect();
  });

  it('staff can create a book (find-or-create lookups)', async () => {
    const res = await request(app)
      .post('/api/catalog/books')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        isbn,
        title: 'Test Driven Book',
        publicationYear: 2020,
        category: 'Testing',
        publisher: 'Test Press',
        authors: ['Jane Tester'],
      });
    expect(res.status).toBe(201);
    expect(res.body.availableCopies).toBe(0);
    bookId = res.body.id;
  });

  it('member cannot create a book (403)', async () => {
    const res = await request(app)
      .post('/api/catalog/books')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        isbn: `${isbn}-x`,
        title: 'Nope',
        publicationYear: 2020,
        category: 'Testing',
        publisher: 'Test Press',
        authors: ['Jane Tester'],
      });
    expect(res.status).toBe(403);
  });

  it('staff can add copies and availability is computed', async () => {
    for (const n of [1, 2]) {
      const res = await request(app)
        .post(`/api/catalog/books/${bookId}/copies`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ accessionNumber: `${isbn}-c${n}`, shelfLocation: `T-${n}` });
      expect(res.status).toBe(201);
    }
    const detail = await request(app)
      .get(`/api/catalog/books/${bookId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.availableCopies).toBe(2);
    expect(detail.body.totalCopies).toBe(2);
  });

  it('duplicate accession number is rejected (409)', async () => {
    const res = await request(app)
      .post(`/api/catalog/books/${bookId}/copies`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ accessionNumber: `${isbn}-c1`, shelfLocation: 'T-9' });
    expect(res.status).toBe(409);
  });

  it('member can search and find the book', async () => {
    const res = await request(app)
      .get('/api/catalog/books')
      .query({ q: 'Test Driven Book' })
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.some((b: { id: string }) => b.id === bookId)).toBe(true);
  });
});
