import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Select } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
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

  const { data, isLoading } = useQuery({
    queryKey: ['fines', status],
    queryFn: async () =>
      (await api.get<Paginated<Fine>>('/fines', { params: { status: status || undefined, pageSize: 50 } }))
        .data,
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'pay' | 'waive' }) =>
      (await api.post(`/fines/${id}/${action}`)).data,
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['fines'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Fines" subtitle="Record payments and waive penalties." />

      <div className="max-w-xs">
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

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-fg-muted">Loading…</p>
        ) : !data?.items.length ? (
          <p className="p-6 text-fg-muted">No fines found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((f) => (
                <tr key={f.id} className="border-b border-border-subtle">
                  <td className="px-4 py-3 font-medium text-fg">{f.user.fullName}</td>
                  <td className="px-4 py-3 text-fg-muted">{f.loan.copy.book.title}</td>
                  <td className="px-4 py-3 text-fg-muted">{f.reason}</td>
                  <td className="px-4 py-3 font-medium text-fg">{money(f.amount)}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[f.status]}`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.status === 'UNPAID' && (
                      <div className="flex gap-2">
                        <Button onClick={() => act.mutate({ id: f.id, action: 'pay' })}>
                          Mark paid
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => act.mutate({ id: f.id, action: 'waive' })}
                        >
                          Waive
                        </Button>
                      </div>
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
