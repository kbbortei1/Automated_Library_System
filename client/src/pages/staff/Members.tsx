import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Badge, Button, Card, Input } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import type { Paginated, User } from '../../types';

export default function Members() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['members', search],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { search: search || undefined } })).data,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
    onError: (e) => setError(apiErrorMessage(e)),
  });

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

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-fg-muted">Loading…</p>
        ) : !data?.items.length ? (
          <p className="p-6 text-fg-muted">No members found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m.id} className="border-b border-border-subtle">
                  <td className="px-4 py-3 font-medium text-fg">{m.fullName}</td>
                  <td className="px-4 py-3 text-fg-muted">{m.email}</td>
                  <td className="px-4 py-3 text-fg-muted">{m.role}</td>
                  <td className="px-4 py-3 text-fg-muted">{m.membershipType}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.status === 'ACTIVE' ? 'green' : 'red'}>{m.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant={m.status === 'ACTIVE' ? 'danger' : 'secondary'}
                      onClick={() =>
                        setStatus.mutate({
                          id: m.id,
                          status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })
                      }
                    >
                      {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
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
