import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Badge, Card, Select, StatusDot, Toggle } from '../components/ui';
import { BookCover } from '../components/BookCover';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../components/icons';
import type { Book, Category, Paginated } from '../types';

function BookCard({ book }: { book: Book }) {
  const available = book.availableCopies > 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card transition hover:shadow-cardhover">
      <Link to={`/catalogue/${book.id}`} className="block">
        <div className="aspect-[2/3] w-full overflow-hidden bg-surface-3">
          <BookCover isbn={book.isbn} coverImageUrl={book.coverImageUrl} title={book.title} size="M" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Badge tone="gray" className="w-fit uppercase tracking-wide">
          {book.category.name}
        </Badge>
        <Link to={`/catalogue/${book.id}`}>
          <h3 className="mt-2 line-clamp-2 font-display font-bold leading-snug text-fg hover:text-accent">
            {book.title}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-fg-muted">by {book.authors.map((a) => a.name).join(', ')}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
          {available ? (
            <StatusDot tone="green">{book.availableCopies} available</StatusDot>
          ) : (
            <StatusDot tone="amber">Waitlist</StatusDot>
          )}
          <Link
            to={`/catalogue/${book.id}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              available
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'border border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft'
            }`}
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
      <h1 className="font-display text-3xl font-bold text-fg">Discover your next great read</h1>

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              first();
            }}
            placeholder="Search by title, author, or ISBN…"
            className="w-full rounded-lg border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'title' | 'newest')}
          className="sm:w-44"
        >
          <option value="title">Title (A to Z)</option>
          <option value="newest">Newest Arrivals</option>
        </Select>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Filters sidebar */}
        <aside className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-lg font-bold text-fg">Categories</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <button
                  onClick={() => {
                    setCategoryId('');
                    first();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 ${
                    categoryId === ''
                      ? 'bg-accent-hover font-semibold text-white'
                      : 'text-fg-muted hover:bg-surface-3'
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
                        ? 'bg-accent-hover font-semibold text-white'
                        : 'text-fg-muted hover:bg-surface-3'
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-fg">Available only</span>
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
            <p className="text-fg-muted">Loading…</p>
          ) : !data?.items.length ? (
            <Card>
              <p className="text-center text-fg-muted">No books match your search.</p>
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
                <p className="text-sm text-fg-muted">
                  Showing {from} to {to} of {data.total} results
                </p>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-border p-1.5 text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="rounded-lg bg-accent-hover px-3.5 py-1.5 text-sm font-semibold text-white">
                    {data.page}
                  </span>
                  <span className="px-2 text-sm text-fg-subtle">of {data.totalPages || 1}</span>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-border p-1.5 text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
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
