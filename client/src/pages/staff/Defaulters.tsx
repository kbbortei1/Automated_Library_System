import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { money } from '../../lib/format';
import type { Defaulter } from '../../types';

export default function Defaulters() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['defaulters'],
    queryFn: async () => (await api.get<Defaulter[]>('/fines/defaulters')).data,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['defaulters'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader
        title="Defaulters"
        subtitle="Members with outstanding fines or overdue loans. Suspend to block further borrowing."
      />

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-fg-muted">Loading…</p>
        ) : !data?.length ? (
          <p className="p-6 text-fg-muted">No defaulters. 🎉</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Unpaid fines</th>
                <th className="px-4 py-3 font-medium">Overdue loans</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-b border-border-subtle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-fg">{d.fullName}</div>
                    <div className="text-xs text-fg-subtle">{d.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">
                    {money(d.outstandingFines)}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{d.unpaidFineCount}</td>
                  <td className="px-4 py-3 text-fg-muted">{d.overdueLoans}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant={d.status === 'ACTIVE' ? 'danger' : 'secondary'}
                      onClick={() =>
                        setStatus.mutate({
                          id: d.id,
                          status: d.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                    >
                      {d.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                    </Button>
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
