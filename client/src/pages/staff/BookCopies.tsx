import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { ArrowLeftIcon, BookIcon } from '../../components/icons';
import { DataTable, type Column } from '../../components/DataTable';
import { Alert, Button, Card, Input, Select, Skeleton } from '../../components/ui';
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
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => (await api.get<Book>(`/catalog/books/${id}`)).data,
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['book', id] });

  const addCopy = useMutation({
    mutationFn: async () =>
      (
        await api.post<BookCopy[]>(`/catalog/books/${id}/copies`, {
          accessionNumber,
          shelfLocation,
          quantity: Number(quantity) || 1,
        })
      ).data,
    onSuccess: (created) => {
      const list = Array.isArray(created) ? created : [created];
      setAccession('');
      setShelf('');
      setQuantity('1');
      setError('');
      setNotice(
        list.length === 1
          ? `Added copy ${list[0].accessionNumber}.`
          : `Added ${list.length} copies, ${list[0].accessionNumber} to ${list[list.length - 1].accessionNumber}.`,
      );
      invalidate();
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
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

  if (isLoading)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (!book) return <Alert>Book not found.</Alert>;

  const copies = book.copies ?? [];

  const columns: Column<BookCopy>[] = [
    {
      header: 'Accession #',
      primary: true,
      className: 'font-medium text-fg',
      cell: (c) => c.accessionNumber,
    },
    { header: 'Shelf', cell: (c) => c.shelfLocation },
    {
      header: 'Status',
      cell: (c) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status]}`}>
          {c.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      action: true,
      cell: (c) => {
        // A copy that is out or on hold cannot be re-statused or removed here;
        // it has to come back through the returns desk first.
        const locked = c.status === 'CHECKED_OUT' || c.status === 'RESERVED';
        return (
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
              className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/staff/books"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to books
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-fg">{book.title}</h1>
        <p className="text-fg-muted">
          {book.isbn} · {book.availableCopies}/{book.totalCopies} available
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

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
          <Input
            label="How many"
            type="number"
            min={1}
            max={50}
            className="w-28"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Button type="submit" variant="knust" disabled={addCopy.isPending}>
            {addCopy.isPending
              ? 'Adding…'
              : Number(quantity) > 1
                ? `Add ${quantity} copies`
                : 'Add copy'}
          </Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        rows={copies}
        keyOf={(c) => c.id}
        emptyIcon={<BookIcon />}
        emptyTitle="No copies yet"
        emptyBody="Add an accession number above to put the first physical copy on the shelf."
      />

    </div>
  );
}
