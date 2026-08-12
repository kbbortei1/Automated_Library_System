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
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BanknoteIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '../../components/icons';
import { money } from '../../lib/format';
import type { DashboardStats, Loan, MostBorrowed, Paginated } from '../../types';

function QuickAction({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg bg-accent-fg/10 px-4 py-3 transition hover:bg-accent-fg/20"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-fg/15 text-accent-fg">
        <ArrowRightIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-accent-fg">{title}</span>
        <span className="block text-xs text-accent-fg/70">{desc}</span>
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
            <StatCard label="Active Loans" value={stats.activeLoans} icon={<BookOpenIcon />} />
            <StatCard
              label="Overdue Loans"
              value={stats.overdueLoans}
              accent="text-red-600 dark:text-red-400"
              hint="Requires action"
              icon={<AlertTriangleIcon />}
            />
            <StatCard
              label="Total Fines"
              value={money(stats.outstandingFines)}
              icon={<BanknoteIcon />}
            />
            <StatCard
              label="Pending Reservations"
              value={stats.pendingReservations}
              hint={`${stats.readyReservations} ready for pickup`}
              icon={<CalendarIcon />}
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
              <div className="rounded-xl bg-accent p-5 shadow-card dark:shadow-none">
                <h2 className="text-lg font-bold text-accent-fg">Quick Actions</h2>
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
