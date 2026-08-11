import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Button, Card } from '../components/ui';
import { BookCover } from '../components/BookCover';
import type { Book } from '../types';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => (await api.get<Book>(`/catalog/books/${id}`)).data,
    enabled: !!id,
  });

  const reserve = useMutation({
    mutationFn: async () => (await api.post('/reservations', { bookId: id })).data,
    onSuccess: (r: { status: string; queuePosition: number }) => {
      setMsg({
        kind: 'success',
        text:
          r.status === 'READY'
            ? 'A copy is ready for you to collect!'
            : `Reserved, you are #${r.queuePosition} in the queue.`,
      });
      qc.invalidateQueries({ queryKey: ['book', id] });
    },
    onError: (e) => setMsg({ kind: 'error', text: apiErrorMessage(e) }),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (isError || !book) return <Alert>Book not found.</Alert>;

  const available = book.availableCopies > 0;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/catalogue" className="text-sm text-knust-700 hover:underline">
        ← Back to catalogue
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <div className="mx-auto aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-lg bg-slate-100 shadow-card">
            <BookCover isbn={book.isbn} coverImageUrl={book.coverImageUrl} title={book.title} size="L" />
          </div>
        </Card>

        <div className="md:col-span-2">
          <Card>
            <h1 className="font-display text-2xl font-bold text-knust-900">{book.title}</h1>
            <p className="mt-1 text-slate-600">
              by {book.authors.map((a) => a.name).join(', ')}
            </p>

            <span
              className={`mt-4 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {available
                ? `${book.availableCopies} of ${book.totalCopies} available`
                : 'No copies currently available'}
            </span>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">ISBN</dt>
                <dd className="font-medium text-slate-700">{book.isbn}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Category</dt>
                <dd className="font-medium text-slate-700">{book.category.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Publisher</dt>
                <dd className="font-medium text-slate-700">{book.publisher.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Published</dt>
                <dd className="font-medium text-slate-700">{book.publicationYear}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Language</dt>
                <dd className="font-medium text-slate-700">{book.language ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Edition</dt>
                <dd className="font-medium text-slate-700">{book.edition ?? '-'}</dd>
              </div>
            </dl>

            {book.description && (
              <p className="mt-6 text-sm leading-relaxed text-slate-600">{book.description}</p>
            )}

            {/* Members reserve titles; staff manage circulation at the desk. */}
            {!hasRole('LIBRARIAN') && (
              <div className="mt-6 flex flex-col gap-3">
                {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
                <div>
                  <Button variant="knust" onClick={() => reserve.mutate()} disabled={reserve.isPending}>
                    {available ? 'Reserve & hold a copy' : 'Join the reservation queue'}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  {available
                    ? 'A copy will be held for you to collect at the desk.'
                    : 'You will be promoted to the front of the queue when a copy is returned.'}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
