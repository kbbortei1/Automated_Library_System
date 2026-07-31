import { useState, type FormEvent } from 'react';
import { Alert, Button, Input } from './ui';
import type { Book } from '../types';

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
        <Input label="ISBN" required value={v.isbn} onChange={set('isbn')} />
        <Input
          label="Publication year"
          type="number"
          required
          value={v.publicationYear}
          onChange={set('publicationYear')}
        />
      </div>
      <Input label="Title" required value={v.title} onChange={set('title')} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
        <textarea
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
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
        <Input label="Category" required value={v.category} onChange={set('category')} />
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
