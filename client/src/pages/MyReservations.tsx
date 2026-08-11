import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Alert, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { formatDate } from '../lib/format';
import type { Reservation, ReservationStatus } from '../types';

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  READY: 'bg-accent-soft text-accent',
  FULFILLED: 'bg-surface-3 text-fg',
  CANCELLED: 'bg-surface-3 text-fg-muted',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

const isActive = (s: ReservationStatus) => s === 'PENDING' || s === 'READY';

function StatusPill({ status }: { status: ReservationStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export default function MyReservations() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations/mine')).data,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => (await api.post(`/reservations/${id}/cancel`)).data,
    onSuccess: () => {
      setError('');
      setNotice('Reservation cancelled.');
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  const cancelButton = (r: Reservation) =>
    isActive(r.status) && (
      <Button
        variant="danger"
        onClick={() => cancel.mutate(r.id)}
        disabled={cancel.isPending}
        className="px-3 py-1.5 text-xs"
      >
        {cancel.isPending && cancel.variables === r.id ? 'Cancelling...' : 'Cancel'}
      </Button>
    );

  const ready = (data ?? []).filter((r) => r.status === 'READY');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-fg">My reservations</h1>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {/* A READY hold expires, so the collect-by date is what matters most. */}
      {ready.length > 0 && (
        <Alert kind="info">
          {ready.length === 1
            ? `"${ready[0].book.title}" is ready for collection`
            : `${ready.length} reservations are ready for collection`}
          {ready[0].expiresAt ? `. Collect by ${formatDate(ready[0].expiresAt)}.` : '.'}
        </Alert>
      )}

      {isLoading ? (
        <Card className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : !data?.length ? (
        <Card className="p-0">
          <EmptyState
            icon="🔖"
            title="No reservations"
            body="Reserve a title that is on loan and you will join the queue for the next free copy."
            action={
              <Link
                to="/catalogue"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
              >
                Browse the catalogue
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Cards on small screens: the six-column table below needs a
              horizontal scroll on a phone, which is unusable one-handed. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {data.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-fg">{r.book.title}</span>
                    <StatusPill status={r.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1 text-xs">
                    <dt className="text-fg-subtle">Reserved</dt>
                    <dd className="text-right text-fg-muted">{formatDate(r.reservationDate)}</dd>
                    {r.status === 'PENDING' && (
                      <>
                        <dt className="text-fg-subtle">Queue</dt>
                        <dd className="text-right text-fg-muted">#{r.queuePosition}</dd>
                      </>
                    )}
                    {r.status === 'READY' && (
                      <>
                        <dt className="text-fg-subtle">Collect by</dt>
                        <dd className="text-right font-semibold text-accent">
                          {formatDate(r.expiresAt)}
                        </dd>
                      </>
                    )}
                  </dl>
                  {cancelButton(r)}
                </Card>
              </li>
            ))}
          </ul>

          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Reserved</th>
                  <th className="px-4 py-3 font-medium">Queue</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Collect by</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle">
                    <td className="px-4 py-3 font-medium text-fg">{r.book.title}</td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(r.reservationDate)}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {r.status === 'PENDING' ? `#${r.queuePosition}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {r.status === 'READY' ? formatDate(r.expiresAt) : '-'}
                    </td>
                    <td className="px-4 py-3">{cancelButton(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
