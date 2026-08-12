import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Badge, Button } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { CheckCircleIcon } from '../../components/icons';
import { money } from '../../lib/format';
import type { Defaulter } from '../../types';

export default function Defaulters() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['defaulters'],
    queryFn: async () => (await api.get<Defaulter[]>('/fines/defaulters')).data,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: (_d, v) => {
      setError('');
      setNotice(v.status === 'SUSPENDED' ? 'Member suspended.' : 'Member reactivated.');
      qc.invalidateQueries({ queryKey: ['defaulters'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  const columns: Column<Defaulter>[] = [
    {
      header: 'Member',
      primary: true,
      cell: (d) => (
        <>
          <div className="font-medium text-fg">{d.fullName}</div>
          <div className="text-xs text-fg-subtle">{d.email}</div>
        </>
      ),
    },
    {
      header: 'Outstanding',
      className: 'font-semibold text-red-600 dark:text-red-400',
      cell: (d) => money(d.outstandingFines),
    },
    { header: 'Unpaid fines', cell: (d) => d.unpaidFineCount },
    { header: 'Overdue loans', cell: (d) => d.overdueLoans },
    {
      header: 'Status',
      cell: (d) => <Badge tone={d.status === 'ACTIVE' ? 'green' : 'red'}>{d.status}</Badge>,
    },
    {
      header: 'Action',
      action: true,
      cell: (d) => (
        <Button
          variant={d.status === 'ACTIVE' ? 'danger' : 'secondary'}
          className="px-3 py-1.5 text-xs"
          disabled={setStatus.isPending}
          onClick={() =>
            setStatus.mutate({
              id: d.id,
              status: d.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
            })
          }
        >
          {d.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader
        title="Defaulters"
        subtitle="Members with outstanding fines or overdue loans. Suspend to block further borrowing."
      />

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <DataTable
        columns={columns}
        rows={data}
        keyOf={(d) => d.id}
        isLoading={isLoading}
        emptyIcon={<CheckCircleIcon />}
        emptyTitle="No defaulters"
        emptyBody="Every member is inside their borrowing limits with nothing outstanding."
      />
    </div>
  );
}
