import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../lib/api';
import { Avatar, Badge, Card, StatCard } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { CheckCircleIcon } from '../../components/icons';
import { money } from '../../lib/format';
import type { DashboardStats, Loan, MostBorrowed, Paginated } from '../../types';

const ICONS = {
  loans: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  overdue: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  fines: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
  reservations: 'M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75',
};
function Icon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function QuickAction({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg bg-surface/10 px-4 py-3 transition hover:bg-surface/20"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface/15 text-white">
        <Icon d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-white/60">{desc}</span>
      </span>
    </Link>
  );
}

export default function StaffDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardStats>('/reports/dashboard')).data,
  });
  const { data: mostBorrowed } = useQuery({
    queryKey: ['most-borrowed'],
    queryFn: async () => (await api.get<MostBorrowed[]>('/reports/most-borrowed')).data,
  });
  const { data: overdue } = useQuery({
    queryKey: ['overdue-loans'],
    queryFn: async () =>
      (await api.get<Paginated<Loan>>('/circulation/loans', { params: { status: 'OVERDUE', pageSize: 5 } }))
        .data,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<{ key: string; value: string }[]>('/settings')).data,
  });

  const fineRate = Number(settings?.find((s) => s.key === 'fine_rate_per_day')?.value ?? 0);
  const daysOverdue = (due: string) =>
    Math.max(0, Math.ceil((Date.now() - new Date(due).getTime()) / 86400000));

  const topBorrowed = (mostBorrowed ?? []).slice(0, 4);
  const maxBorrow = Math.max(1, ...topBorrowed.map((b) => b.borrowCount));

  return (
    <div>
      <StaffHeader title="Library Overview">
        <div className="relative hidden sm:block">
          <input
            placeholder="Search books, members…"
            className="w-64 rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-fg-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607Z" />
          </svg>
        </div>
      </StaffHeader>

      {isLoading || !stats ? (
        <p className="text-fg-muted">Loading dashboard…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Loans" value={stats.activeLoans} icon={<Icon d={ICONS.loans} />} />
            <StatCard
              label="Overdue Loans"
              value={stats.overdueLoans}
              accent="text-red-600 dark:text-red-400"
              hint="Requires action"
              icon={<Icon d={ICONS.overdue} />}
            />
            <StatCard
              label="Total Fines"
              value={money(stats.outstandingFines)}
              icon={<Icon d={ICONS.fines} />}
            />
            <StatCard
              label="Pending Reservations"
              value={stats.pendingReservations}
              hint={`${stats.readyReservations} ready for pickup`}
              icon={<Icon d={ICONS.reservations} />}
            />
          </div>

          {/* Chart + quick actions */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-bold text-fg">New Members</h2>
              <p className="mb-4 text-sm text-fg-muted">Registrations (last 6 months)</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.newMemberTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="month" fontSize={12} stroke="#94a3b8" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1e3a5f" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <div className="flex flex-col gap-6">
              <div className="rounded-xl bg-accent-hover p-5 shadow-card">
                <h2 className="text-lg font-bold text-white">Quick Actions</h2>
                <div className="mt-4 flex flex-col gap-3">
                  <QuickAction to="/staff/circulation" title="Checkout Book" desc="Scan ISBN or enter member ID" />
                  <QuickAction to="/staff/circulation" title="Return Book" desc="Process standard return" />
                  <QuickAction to="/staff/members" title="Members" desc="Manage patron accounts" />
                </div>
              </div>

              <Card>
                <h2 className="mb-4 text-lg font-bold text-fg">Most Borrowed</h2>
                {topBorrowed.length ? (
                  <div className="space-y-3">
                    {topBorrowed.map((b) => (
                      <div key={b.book.id}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="truncate pr-2 text-fg">{b.book.title}</span>
                          <span className="font-semibold text-fg">{b.borrowCount}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-3">
                          <div
                            className="h-2 rounded-full bg-accent"
                            style={{ width: `${(b.borrowCount / maxBorrow) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-fg-muted">No loans recorded yet.</p>
                )}
              </Card>
            </div>
          </div>

          {/* Needs attention */}
          <Card className="p-0">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h2 className="text-lg font-bold text-fg">Needs Attention</h2>
                <p className="text-sm text-fg-muted">Overdue items requiring member contact</p>
              </div>
              <Link to="/staff/defaulters" className="text-sm font-semibold text-accent hover:text-accent">
                View All Defaulters
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              {!overdue?.items.length ? (
                <p className="flex items-center gap-2 px-6 pb-6 text-sm text-fg-muted">
                  <CheckCircleIcon className="h-4 w-4 text-accent" />
                  No overdue items.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-y border-border-subtle bg-surface-2 text-xs uppercase tracking-wide text-fg-subtle">
                    <tr>
                      <th className="px-6 py-3 font-medium">Member</th>
                      <th className="px-6 py-3 font-medium">Book Title</th>
                      <th className="px-6 py-3 font-medium">Days Overdue</th>
                      <th className="px-6 py-3 font-medium">Fine Accrued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.items.map((l) => {
                      const d = daysOverdue(l.dueDate);
                      return (
                        <tr key={l.id} className="border-b border-surface-2 last:border-0">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={l.user.fullName} />
                              <div>
                                <div className="font-medium text-fg">{l.user.fullName}</div>
                                <div className="text-xs text-fg-subtle">{l.user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-fg-muted">{l.copy.book.title}</td>
                          <td className="px-6 py-3">
                            <Badge tone={d > 7 ? 'red' : 'amber'}>{d} {d === 1 ? 'Day' : 'Days'}</Badge>
                          </td>
                          <td className="px-6 py-3 font-semibold text-red-600 dark:text-red-400">
                            {money(d * fineRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
