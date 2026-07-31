import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge, Card, Select, StatusDot, Toggle } from '../components/ui';
import { BookCover } from '../components/BookCover';
import type { Book, Category, Paginated } from '../types';

function BookCard({ book }: { book: Book }) {
  const available = book.availableCopies > 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-cardhover">
      <Link to={`/catalogue/${book.id}`} className="block">
        <div className="aspect-[2/3] w-full overflow-hidden bg-slate-100">
          <BookCover isbn={book.isbn} coverImageUrl={book.coverImageUrl} title={book.title} size="M" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Badge tone="gray" className="w-fit uppercase tracking-wide">
          {book.category.name}
        </Badge>
        <Link to={`/catalogue/${book.id}`}>
          <h3 className="mt-2 line-clamp-2 font-display font-bold leading-snug text-navy-800 hover:text-navy-600">
            {book.title}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-slate-500">by {book.authors.map((a) => a.name).join(', ')}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          {available ? (
            <StatusDot tone="green">{book.availableCopies} available</StatusDot>
          ) : (
            <StatusDot tone="amber">Waitlist</StatusDot>
          )}
          <Link
            to={`/catalogue/${book.id}`}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {available ? 'Borrow' : 'Reserve'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Catalogue() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<'title' | 'newest'>('title');
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/catalog/categories')).data,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['catalogue', q, categoryId, availableOnly, sort, page],
    queryFn: async () =>
      (
        await api.get<Paginated<Book>>('/catalog/books', {
          params: {
            q: q || undefined,
            categoryId: categoryId || undefined,
            availableOnly: availableOnly || undefined,
            sort,
            page,
            pageSize: 9,
          },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  const first = () => setPage(1);
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold text-navy-800">Discover your next great read</h1>

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z" />
          </svg>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              first();
            }}
            placeholder="Search by title, author, or ISBN…"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'title' | 'newest')}
          className="sm:w-44"
        >
          <option value="title">Title (A–Z)</option>
          <option value="newest">Newest Arrivals</option>
        </Select>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Filters sidebar */}
        <aside className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-lg font-bold text-navy-800">Categories</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  onClick={() => {
                    setCategoryId('');
                    first();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 ${
                    categoryId === ''
                      ? 'bg-navy-700 font-semibold text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Categories
                </button>
              </li>
              {categories?.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setCategoryId(c.id);
                      first();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 ${
                      categoryId === c.id
                        ? 'bg-navy-700 font-semibold text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-navy-800">Available only</span>
            <Toggle
              checked={availableOnly}
              onChange={(v) => {
                setAvailableOnly(v);
                first();
              }}
            />
          </div>
        </aside>

        {/* Results */}
        <div>
          {isLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : !data?.items.length ? (
            <Card>
              <p className="text-center text-slate-500">No books match your search.</p>
            </Card>
          ) : (
            <>
              <div
                className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}
              >
                {data.items.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>

              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-slate-500">
                  Showing {from} to {to} of {data.total} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span className="rounded-lg bg-navy-700 px-3.5 py-1.5 text-sm font-semibold text-white">
                    {data.page}
                  </span>
                  <span className="px-2 text-sm text-slate-400">of {data.totalPages || 1}</span>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
