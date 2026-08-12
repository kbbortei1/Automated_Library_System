import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Badge, Button, Input } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { UsersIcon } from '../../components/icons';
import type { Paginated, User } from '../../types';

export default function Members() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['members', search],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { search: search || undefined } })).data,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: (_d, v) => {
      setError('');
      setNotice(v.status === 'SUSPENDED' ? 'Member suspended.' : 'Member reactivated.');
      qc.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  const columns: Column<User>[] = [
    { header: 'Name', primary: true, className: 'font-medium text-fg', cell: (m) => m.fullName },
    { header: 'Email', cell: (m) => m.email },
    { header: 'Role', cell: (m) => m.role },
    { header: 'Type', cell: (m) => m.membershipType },
    {
      header: 'Status',
      cell: (m) => <Badge tone={m.status === 'ACTIVE' ? 'green' : 'red'}>{m.status}</Badge>,
    },
    {
      header: 'Action',
      action: true,
      cell: (m) => (
        <Button
          variant={m.status === 'ACTIVE' ? 'danger' : 'secondary'}
          className="px-3 py-1.5 text-xs"
          disabled={setStatus.isPending}
          onClick={() =>
            setStatus.mutate({
              id: m.id,
              status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
            })
          }
        >
          {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Members" subtitle="Search, suspend, and reactivate library patrons." />

      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <DataTable
        columns={columns}
        rows={data?.items}
        keyOf={(m) => m.id}
        isLoading={isLoading}
        emptyIcon={<UsersIcon />}
        emptyTitle={search ? 'No members match that search' : 'No members yet'}
        emptyBody={
          search
            ? 'Try a different name or email address.'
            : 'Members appear here once they register.'
        }
      />
    </div>
  );
}
