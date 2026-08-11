import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Input, Select } from '../../components/ui';
import type { Book, BookCopy, CopyStatus } from '../../types';

const STATUS_STYLES: Record<CopyStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  CHECKED_OUT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  RESERVED: 'bg-blue-100 text-blue-700',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  DAMAGED: 'bg-surface-3 text-fg',
};

export default function BookCopies() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [accessionNumber, setAccession] = useState('');
  const [shelfLocation, setShelf] = useState('');
  const [error, setError] = useState('');

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => (await api.get<Book>(`/catalog/books/${id}`)).data,
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['book', id] });

  const addCopy = useMutation({
    mutationFn: async () =>
      (await api.post(`/catalog/books/${id}/copies`, { accessionNumber, shelfLocation })).data,
    onSuccess: () => {
      setAccession('');
      setShelf('');
      setError('');
      invalidate();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const setStatus = useMutation({
    mutationFn: async ({ copyId, status }: { copyId: string; status: CopyStatus }) =>
      (await api.patch(`/catalog/copies/${copyId}/status`, { status })).data,
    onSuccess: invalidate,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const removeCopy = useMutation({
    mutationFn: async (copyId: string) => (await api.delete(`/catalog/copies/${copyId}`)).data,
    onSuccess: invalidate,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    addCopy.mutate();
  }

  if (isLoading) return <p className="text-fg-muted">Loading…</p>;
  if (!book) return <Alert>Book not found.</Alert>;

  const copies = book.copies ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/staff/books" className="text-sm text-accent hover:underline">
          ← Back to books
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-fg">{book.title}</h1>
        <p className="text-fg-muted">
          {book.isbn} · {book.availableCopies}/{book.totalCopies} available
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-fg">Add copy</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <Input
            label="Accession number"
            required
            value={accessionNumber}
            onChange={(e) => setAccession(e.target.value)}
          />
          <Input
            label="Shelf location"
            required
            value={shelfLocation}
            onChange={(e) => setShelf(e.target.value)}
          />
          <Button type="submit" disabled={addCopy.isPending}>
            Add copy
          </Button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        {!copies.length ? (
          <p className="p-6 text-fg-muted">No copies yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Accession #</th>
                <th className="px-4 py-3 font-medium">Shelf</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {copies.map((c: BookCopy) => {
                const locked = c.status === 'CHECKED_OUT' || c.status === 'RESERVED';
                return (
                  <tr key={c.id} className="border-b border-border-subtle">
                    <td className="px-4 py-3 font-medium text-fg">{c.accessionNumber}</td>
                    <td className="px-4 py-3 text-fg-muted">{c.shelfLocation}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={c.status}
                          disabled={locked}
                          onChange={(e) =>
                            setStatus.mutate({ copyId: c.id, status: e.target.value as CopyStatus })
                          }
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="LOST">LOST</option>
                          <option value="DAMAGED">DAMAGED</option>
                          {locked && <option value={c.status}>{c.status}</option>}
                        </Select>
                        <button
                          disabled={c.status === 'CHECKED_OUT'}
                          onClick={() => {
                            if (confirm('Remove this copy?')) removeCopy.mutate(c.id);
                          }}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
