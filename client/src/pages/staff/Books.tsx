import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Input } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { BookForm } from '../../components/BookForm';
import { BookOpenIcon } from '../../components/icons';
import type { Book, Paginated } from '../../types';

export default function Books() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Book | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['catalog-books', search],
    queryFn: async () =>
      (
        await api.get<Paginated<Book>>('/catalog/books', {
          params: { q: search || undefined, pageSize: 50, sort: 'title' },
        })
      ).data,
  });

  const reset = () => {
    setEditing(null);
    setCreating(false);
    setFormError('');
    qc.invalidateQueries({ queryKey: ['catalog-books'] });
  };

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      editing
        ? (await api.put(`/catalog/books/${editing.id}`, payload)).data
        : (await api.post('/catalog/books', payload)).data,
    onSuccess: reset,
    onError: (e) => setFormError(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/catalog/books/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog-books'] }),
  });

  if (creating || editing) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-fg">
          {editing ? `Edit: ${editing.title}` : 'Add a new book'}
        </h1>
        <Card>
          <BookForm
            book={editing ?? undefined}
            onSubmit={(p) => save.mutate(p)}
            onCancel={reset}
            error={formError}
            submitting={save.isPending}
          />
        </Card>
      </div>
    );
  }

  const rowAction =
    'rounded-md border border-border px-2 py-1 text-xs font-medium text-fg-muted transition hover:bg-surface-2 hover:text-fg';

  const columns: Column<Book>[] = [
    { header: 'Title', primary: true, className: 'font-medium text-fg', cell: (b) => b.title },
    { header: 'Authors', cell: (b) => b.authors.map((a) => a.name).join(', ') },
    { header: 'ISBN', cell: (b) => b.isbn },
    {
      header: 'Available',
      className: 'font-medium text-fg',
      cell: (b) => `${b.availableCopies}/${b.totalCopies}`,
    },
    {
      header: 'Actions',
      action: true,
      cell: (b) => (
        <div className="flex gap-2">
          <Link to={`/staff/books/${b.id}/copies`} className={rowAction}>
            Copies
          </Link>
          <button onClick={() => setEditing(b)} className={rowAction}>
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${b.title}"?`)) remove.mutate(b.id);
            }}
            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Catalogue" subtitle="Manage titles, copies, and inventory.">
        <Button variant="knust" onClick={() => setCreating(true)}>
          Add book
        </Button>
      </StaffHeader>

      <div className="max-w-sm">
        <Input
          placeholder="Search title, author, ISBN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        keyOf={(b) => b.id}
        isLoading={isLoading}
        skeletonRows={6}
        emptyIcon={<BookOpenIcon />}
        emptyTitle={search ? 'No titles match that search' : 'No books in the catalogue'}
        emptyBody={
          search ? 'Try a different title, author or ISBN.' : 'Add the first title to get started.'
        }
        emptyAction={
          !search ? (
            <Button variant="knust" onClick={() => setCreating(true)}>
              Add book
            </Button>
          ) : undefined
        }
      />

      {remove.isError && <Alert>{apiErrorMessage(remove.error)}</Alert>}
    </div>
  );
}
