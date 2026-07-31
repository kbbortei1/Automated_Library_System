import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Alert, Button, Card } from '../components/ui';
import { formatDate } from '../lib/format';
import type { Reservation, ReservationStatus } from '../types';

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  READY: 'bg-green-100 text-green-700',
  FULFILLED: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-slate-200 text-slate-500',
  EXPIRED: 'bg-red-100 text-red-700',
};

export default function MyReservations() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations/mine')).data,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => (await api.post(`/reservations/${id}/cancel`)).data,
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const active = (s: ReservationStatus) => s === 'PENDING' || s === 'READY';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-navy-800">My reservations</h1>
      {error && <Alert>{error}</Alert>}

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !data?.length ? (
          <p className="p-6 text-slate-500">You have no reservations.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
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
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.book.title}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.reservationDate)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.status === 'PENDING' ? `#${r.queuePosition}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.status === 'READY' ? formatDate(r.expiresAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {active(r.status) && (
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
