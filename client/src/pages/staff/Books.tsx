import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Input } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { BookForm } from '../../components/BookForm';
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
        <h1 className="mb-6 text-2xl font-bold text-navy-800">
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

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Catalogue" subtitle="Manage titles, copies, and inventory.">
        <Button onClick={() => setCreating(true)}>+ Add book</Button>
      </StaffHeader>

      <div className="max-w-sm">
        <Input
          placeholder="Search title, author, ISBN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !data?.items.length ? (
          <p className="p-6 text-slate-500">No books found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Authors</th>
                <th className="px-4 py-3 font-medium">ISBN</th>
                <th className="px-4 py-3 font-medium">Available</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((b) => (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{b.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.authors.map((a) => a.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.isbn}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-700">
                      {b.availableCopies}/{b.totalCopies}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        to={`/staff/books/${b.id}/copies`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Copies
                      </Link>
                      <button
                        onClick={() => setEditing(b)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${b.title}"?`)) remove.mutate(b.id);
                        }}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {remove.isError && <Alert>{apiErrorMessage(remove.error)}</Alert>}
      </Card>
    </div>
  );
}
