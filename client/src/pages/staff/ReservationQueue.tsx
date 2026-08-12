import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { CalendarIcon } from '../../components/icons';
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
  const [notice, setNotice] = useState('');

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
      setNotice('Reservation cancelled.');
      qc.invalidateQueries({ queryKey: ['reservation-queue'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  // A READY hold expires, so staff need to see how many are waiting collection.
  const readyCount = (data ?? []).filter((r) => r.status === 'READY').length;

  const columns: Column<Reservation>[] = [
    { header: 'Title', primary: true, className: 'font-medium text-fg', cell: (r) => r.book.title },
    { header: 'Member', cell: (r) => r.user.fullName },
    { header: 'Queue', cell: (r) => (r.status === 'PENDING' ? `#${r.queuePosition}` : '-') },
    {
      header: 'Status',
      cell: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
          {r.status}
        </span>
      ),
    },
    {
      header: 'Collect by',
      cell: (r) => (r.status === 'READY' ? formatDate(r.expiresAt) : '-'),
    },
    {
      header: 'Action',
      action: true,
      cell: (r) =>
        r.status === 'PENDING' || r.status === 'READY' ? (
          <Button
            variant="danger"
            className="px-3 py-1.5 text-xs"
            onClick={() => cancel.mutate(r.id)}
            disabled={cancel.isPending}
          >
            Cancel
          </Button>
        ) : null,
    },
  ];

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
      {notice && <Alert kind="success">{notice}</Alert>}
      {readyCount > 0 && (
        <Alert kind="info">
          {readyCount} {readyCount === 1 ? 'hold is' : 'holds are'} waiting collection at the desk.
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={data}
        keyOf={(r) => r.id}
        isLoading={isLoading}
        skeletonRows={5}
        emptyIcon={<CalendarIcon />}
        emptyTitle={status ? `No ${status.toLowerCase()} reservations` : 'No reservations'}
        emptyBody={
          status
            ? 'Try a different status filter.'
            : 'Holds appear here when members reserve a title.'
        }
      />
    </div>
  );
}
