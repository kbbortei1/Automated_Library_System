import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Alert, Badge, Button, Card, Input } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { UsersIcon } from '../../components/icons';
import type { Paginated, User } from '../../types';

interface StaffActivity {
  id: string;
  fullName: string;
  role: string;
  counts: Record<string, number>;
  total: number;
}

const RANK = { MEMBER: 1, LIBRARIAN: 2, ADMIN: 3 } as const;

export default function Members() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const [view, setView] = useState<'members' | 'staff'>('members');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Patrons only. Staff accounts are managed in the other view, by an admin.
  const members = useQuery({
    queryKey: ['members', search],
    queryFn: async () =>
      (
        await api.get<Paginated<User>>('/users', {
          params: { search: search || undefined, role: 'MEMBER' },
        })
      ).data,
    enabled: view === 'members',
  });

  const librarians = useQuery({
    queryKey: ['staff-users', 'LIBRARIAN'],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { role: 'LIBRARIAN' } })).data.items,
    enabled: view === 'staff' && isAdmin,
  });
  const admins = useQuery({
    queryKey: ['staff-users', 'ADMIN'],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { role: 'ADMIN' } })).data.items,
    enabled: view === 'staff' && isAdmin,
  });

  const activity = useQuery({
    queryKey: ['staff-activity'],
    queryFn: async () =>
      (await api.get<{ days: number; staff: StaffActivity[] }>('/reports/staff-activity')).data,
    enabled: view === 'staff' && isAdmin,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: (_d, v) => {
      setError('');
      setNotice(v.status === 'SUSPENDED' ? 'Account suspended.' : 'Account reactivated.');
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  // Mirrors canAdminister on the server, which is the actual guard. This only
  // stops staff being offered a button that would return 403.
  const canAdminister = (target: { id: string; role: string }) => {
    if (!user || user.id === target.id) return false;
    const mine = RANK[user.role as keyof typeof RANK] ?? 0;
    const theirs = RANK[target.role as keyof typeof RANK] ?? 0;
    if (theirs > mine) return false;
    if (theirs === mine && user.role !== 'ADMIN') return false;
    return true;
  };

  const statusAction = (u: User) =>
    !canAdminister(u) ? (
      <span className="text-xs text-fg-subtle">-</span>
    ) : (
      <Button
        variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'}
        className="px-3 py-1.5 text-xs"
        disabled={setStatus.isPending}
        onClick={() =>
          setStatus.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })
        }
      >
        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
      </Button>
    );

  const memberColumns: Column<User>[] = [
    { header: 'Name', primary: true, className: 'font-medium text-fg', cell: (m) => m.fullName },
    { header: 'Email', cell: (m) => m.email },
    { header: 'Phone', cell: (m) => m.phone || <span className="text-fg-subtle">not given</span> },
    { header: 'Type', cell: (m) => m.membershipType },
    {
      header: 'Status',
      cell: (m) => <Badge tone={m.status === 'ACTIVE' ? 'green' : 'red'}>{m.status}</Badge>,
    },
    { header: 'Action', action: true, cell: statusAction },
  ];

  const byId = new Map((activity.data?.staff ?? []).map((s) => [s.id, s]));
  const staffRows = [...(admins.data ?? []), ...(librarians.data ?? [])];
  const count = (u: User, action: string) => byId.get(u.id)?.counts[action] ?? 0;

  const staffColumns: Column<User>[] = [
    { header: 'Name', primary: true, className: 'font-medium text-fg', cell: (u) => u.fullName },
    { header: 'Role', cell: (u) => <Badge tone={u.role === 'ADMIN' ? 'navy' : 'blue'}>{u.role}</Badge> },
    { header: 'Checkouts', cell: (u) => count(u, 'LOAN_CHECKOUT') },
    { header: 'Returns', cell: (u) => count(u, 'LOAN_RETURN') },
    { header: 'Fines settled', cell: (u) => count(u, 'FINE_PAID') + count(u, 'FINE_WAIVED') },
    {
      header: 'Status',
      cell: (u) => <Badge tone={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status}</Badge>,
    },
    { header: 'Action', action: true, cell: statusAction },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader
        title={view === 'members' ? 'Members' : 'Staff'}
        subtitle={
          view === 'members'
            ? 'Search, suspend, and reactivate library patrons.'
            : 'Librarian and administrator accounts, with desk activity.'
        }
      />

      {isAdmin && (
        <div className="inline-flex w-fit rounded-lg border border-border bg-surface-2 p-1">
          {(['members', 'staff'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === v ? 'bg-accent text-accent-fg shadow-sm' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {v === 'members' ? 'Members' : 'Staff'}
            </button>
          ))}
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {view === 'members' ? (
        <>
          <div className="max-w-sm">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DataTable
            columns={memberColumns}
            rows={members.data?.items}
            keyOf={(m) => m.id}
            isLoading={members.isLoading}
            emptyIcon={<UsersIcon />}
            emptyTitle={search ? 'No members match that search' : 'No members yet'}
            emptyBody={
              search
                ? 'Try a different name or email address.'
                : 'Members appear here once they register.'
            }
          />
        </>
      ) : (
        <>
          {/* Counts describe the shift as much as the person, so the framing is
              workload, not a ranking. Rows stay alphabetical for the same
              reason. */}
          <Card className="border-accent/40 bg-accent-soft p-4">
            <p className="text-sm text-accent-softfg">
              Desk activity over the last {activity.data?.days ?? 30} days. Useful for spotting an
              unevenly covered desk and for tracing who processed a transaction. It reflects which
              shifts were busy, so it is not a measure of who works hardest.
            </p>
          </Card>
          <DataTable
            columns={staffColumns}
            rows={staffRows}
            keyOf={(u) => u.id}
            isLoading={librarians.isLoading || admins.isLoading || activity.isLoading}
            emptyIcon={<UsersIcon />}
            emptyTitle="No staff accounts"
            emptyBody="Librarian and administrator accounts appear here."
          />
        </>
      )}
    </div>
  );
}
