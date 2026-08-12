import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { BanknoteIcon } from '../../components/icons';
import { formatDate, money } from '../../lib/format';
import type { Fine, FineStatus, Paginated } from '../../types';

const STATUS_STYLES: Record<FineStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  WAIVED: 'bg-surface-3 text-fg-muted',
};

export default function Fines() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<FineStatus | ''>('UNPAID');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fines', status],
    queryFn: async () =>
      (
        await api.get<Paginated<Fine>>('/fines', {
          params: { status: status || undefined, pageSize: 50 },
        })
      ).data,
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pay' | 'waive' }) =>
      (await api.post(`/fines/${id}/${action}`)).data,
    onSuccess: (_d, v) => {
      setError('');
      setNotice(v.action === 'pay' ? 'Payment recorded.' : 'Fine waived.');
      qc.invalidateQueries({ queryKey: ['fines'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  // Staff work this screen to clear a balance, so the total in view is the
  // number that matters and it was not shown anywhere.
  const unpaidTotal = (data?.items ?? [])
    .filter((f) => f.status === 'UNPAID')
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const columns: Column<Fine>[] = [
    {
      header: 'Member',
      primary: true,
      className: 'font-medium text-fg',
      cell: (f) => f.user.fullName,
    },
    { header: 'Book', cell: (f) => f.loan.copy.book.title },
    { header: 'Reason', cell: (f) => f.reason },
    { header: 'Amount', className: 'font-medium text-fg', cell: (f) => money(f.amount) },
    { header: 'Issued', cell: (f) => formatDate(f.createdAt) },
    {
      header: 'Status',
      cell: (f) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[f.status]}`}>
          {f.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      action: true,
      cell: (f) =>
        f.status === 'UNPAID' ? (
          <div className="flex gap-2">
            <Button
              variant="knust"
              className="px-3 py-1.5 text-xs"
              disabled={act.isPending}
              onClick={() => act.mutate({ id: f.id, action: 'pay' })}
            >
              Mark paid
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={act.isPending}
              onClick={() => act.mutate({ id: f.id, action: 'waive' })}
            >
              Waive
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Fines" subtitle="Record payments and waive penalties." />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <Select
            label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as FineStatus | '')}
          >
            <option value="">All</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="WAIVED">Waived</option>
          </Select>
        </div>
        {unpaidTotal > 0 && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-fg-subtle">Unpaid in view</div>
            <div className="font-display text-2xl font-bold text-red-600 dark:text-red-400">
              {money(unpaidTotal)}
            </div>
          </div>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <DataTable
        columns={columns}
        rows={data?.items}
        keyOf={(f) => f.id}
        isLoading={isLoading}
        skeletonRows={6}
        emptyIcon={<BanknoteIcon />}
        emptyTitle={status === 'UNPAID' ? 'Nothing outstanding' : 'No fines found'}
        emptyBody={
          status === 'UNPAID'
            ? 'No unpaid fines across the collection.'
            : 'Try a different status filter.'
        }
      />
    </div>
  );
}
