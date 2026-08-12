import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Alert, Button, Input, Select } from './ui';
import type { Book, Category } from '../types';

export interface BookFormValues {
  isbn: string;
  title: string;
  description: string;
  publicationYear: string;
  edition: string;
  language: string;
  coverImageUrl: string;
  category: string;
  publisher: string;
  authors: string; // comma-separated in the form
}

function toFormValues(book?: Book): BookFormValues {
  return {
    isbn: book?.isbn ?? '',
    title: book?.title ?? '',
    description: book?.description ?? '',
    publicationYear: book ? String(book.publicationYear) : '',
    edition: book?.edition ?? '',
    language: book?.language ?? 'English',
    coverImageUrl: book?.coverImageUrl ?? '',
    category: book?.category.name ?? '',
    publisher: book?.publisher.name ?? '',
    authors: book?.authors.map((a) => a.name).join(', ') ?? '',
  };
}

const CURRENT_YEAR = new Date().getFullYear();
// Allow next year for forthcoming titles; 1500 covers anything a university
// library realistically holds.
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1500 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);

export function BookForm({
  book,
  onSubmit,
  onCancel,
  error,
  submitting,
}: {
  book?: Book;
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
  error?: string;
  submitting?: boolean;
}) {
  const [v, setV] = useState<BookFormValues>(toFormValues(book));
  const [addingCategory, setAddingCategory] = useState(false);
  const [lookup, setLookup] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; msg: string }>({
    state: 'idle',
    msg: '',
  });

  /**
   * Fill the form from Open Library using the ISBN.
   *
   * Cataloguing a title by hand means typing eight fields that are already
   * published data. Only the year is stored, so the publish date is reduced
   * to its four-digit year. Category is deliberately left alone: Open
   * Library's subjects do not map onto a library's own shelving scheme.
   */
  async function lookupIsbn() {
    const isbn = v.isbn.replace(/[^0-9Xx]/g, '');
    if (!isbn) {
      setLookup({ state: 'fail', msg: 'Enter an ISBN first.' });
      return;
    }
    setLookup({ state: 'busy', msg: '' });
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      const rec = body[`ISBN:${isbn}`];
      if (!rec) {
        setLookup({ state: 'fail', msg: 'No record found for that ISBN. Enter the details by hand.' });
        return;
      }
      const year = String(rec.publish_date ?? '').match(/\d{4}/)?.[0] ?? '';
      setV((prev) => ({
        ...prev,
        title: [rec.title, rec.subtitle].filter(Boolean).join(': ') || prev.title,
        authors: (rec.authors ?? []).map((a: { name: string }) => a.name).join(', ') || prev.authors,
        publisher: (rec.publishers ?? [])[0]?.name ?? prev.publisher,
        publicationYear: year || prev.publicationYear,
        coverImageUrl: prev.coverImageUrl,
      }));
      setLookup({ state: 'ok', msg: `Filled from Open Library. Check the details, then pick a category.` });
    } catch {
      setLookup({
        state: 'fail',
        msg: 'Could not reach Open Library. Enter the details by hand.',
      });
    }
  }

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/catalog/categories')).data,
  });
  const set = (k: keyof BookFormValues) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      isbn: v.isbn.trim(),
      title: v.title.trim(),
      description: v.description.trim() || undefined,
      publicationYear: Number(v.publicationYear),
      edition: v.edition.trim() || undefined,
      language: v.language.trim() || undefined,
      coverImageUrl: v.coverImageUrl.trim() || '',
      category: v.category.trim(),
      publisher: v.publisher.trim(),
      authors: v.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-end gap-2">
            <Input
              label="ISBN"
              required
              className="flex-1"
              value={v.isbn}
              onChange={(e) => {
                set('isbn')(e);
                setLookup({ state: 'idle', msg: '' });
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={lookup.state === 'busy'}
              onClick={lookupIsbn}
            >
              {lookup.state === 'busy' ? 'Looking up…' : 'Look up'}
            </Button>
          </div>
          {lookup.msg && (
            <p
              className={`mt-1 text-xs ${
                lookup.state === 'fail' ? 'text-red-600 dark:text-red-400' : 'text-accent'
              }`}
            >
              {lookup.msg}
            </p>
          )}
        </div>
        <Select
          label="Publication year"
          required
          value={v.publicationYear}
          onChange={set('publicationYear')}
        >
          <option value="">Select a year…</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <Input label="Title" required value={v.title} onChange={set('title')} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-fg">Description</span>
        <textarea
          className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          rows={3}
          value={v.description}
          onChange={set('description')}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Authors (comma-separated)"
          required
          value={v.authors}
          onChange={set('authors')}
        />
        <div>
          <Select
            label="Category"
            required={!addingCategory}
            value={addingCategory ? '__new' : v.category}
            onChange={(e) => {
              if (e.target.value === '__new') {
                setAddingCategory(true);
                setV((prev) => ({ ...prev, category: '' }));
              } else {
                setAddingCategory(false);
                setV((prev) => ({ ...prev, category: e.target.value }));
              }
            }}
          >
            <option value="">Select a category…</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value="__new">+ New category…</option>
          </Select>
          {addingCategory && (
            <Input
              className="mt-2"
              required
              placeholder="New category name"
              value={v.category}
              onChange={set('category')}
            />
          )}
        </div>
        <Input label="Publisher" required value={v.publisher} onChange={set('publisher')} />
        <Input label="Edition" value={v.edition} onChange={set('edition')} />
        <Input label="Language" value={v.language} onChange={set('language')} />
        <Input label="Cover image URL" value={v.coverImageUrl} onChange={set('coverImageUrl')} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : book ? 'Save changes' : 'Create book'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
