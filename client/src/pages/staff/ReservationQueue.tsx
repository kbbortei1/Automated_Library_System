import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Select } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { formatDate } from '../../lib/format';
import type { Reservation, ReservationStatus } from '../../types';

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  READY: 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  FULFILLED: 'bg-surface-3 text-fg',
  CANCELLED: 'bg-surface-3 text-fg-muted',
  EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

export default function ReservationQueue() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReservationStatus | ''>('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reservation-queue', status],
    queryFn: async () =>
      (await api.get<Reservation[]>('/reservations', { params: { status: status || undefined } }))
        .data,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => (await api.post(`/reservations/${id}/cancel`)).data,
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['reservation-queue'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Reservation Queue" subtitle="Manage holds across the collection." />

      <div className="max-w-xs">
        <Select
          label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ReservationStatus | '')}
        >
          <option value="">Active (all)</option>
          <option value="PENDING">Pending</option>
          <option value="READY">Ready</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-fg-muted">Loading…</p>
        ) : !data?.length ? (
          <p className="p-6 text-fg-muted">No reservations.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Member</th>
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
                  <td className="px-4 py-3 text-fg-muted">{r.user.fullName}</td>
                  <td className="px-4 py-3 text-fg-muted">
                    {r.status === 'PENDING' ? `#${r.queuePosition}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {r.status === 'READY' ? formatDate(r.expiresAt) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {(r.status === 'PENDING' || r.status === 'READY') && (
                      <Button
                        variant="danger"
                        onClick={() => cancel.mutate(r.id)}
                        disabled={cancel.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
