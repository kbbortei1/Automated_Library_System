import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Badge, Card, Skeleton } from '../components/ui';
import { formatDate, isOverdue, money } from '../lib/format';
import StaffDashboard from './staff/StaffDashboard';
import type { Fine, Loan, Reservation } from '../types';

const DUE_SOON_DAYS = 3;

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Relative wording for a due date, so the member does not do the arithmetic. */
function dueLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

function Tile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const valueTone = { default: 'text-knust-800', warn: 'text-amber-600', danger: 'text-red-600' }[
    tone
  ];
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

/** One row of the "needs your attention" banner. */
function ActionRow({
  tone,
  text,
  to,
  cta,
}: {
  tone: 'danger' | 'warn' | 'good';
  text: string;
  to: string;
  cta: string;
}) {
  const styles = {
    danger: 'border-red-200 bg-red-50 text-red-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    good: 'border-knust-200 bg-knust-50 text-knust-800',
  }[tone];
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${styles}`}
    >
      <span className="text-sm font-medium">{text}</span>
      <Link to={to} className="text-sm font-semibold underline underline-offset-2">
        {cta}
      </Link>
    </div>
  );
}

function SectionCard({
  title,
  linkTo,
  linkLabel,
  loading,
  children,
}: {
  title: string;
  linkTo: string;
  linkLabel: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-knust-900">{title}</h2>
        <Link to={linkTo} className="text-sm font-medium text-knust-700 hover:underline">
          {linkLabel}
        </Link>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function MiniEmpty({ text, to, cta }: { text: string; to: string; cta: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      <Link
        to={to}
        className="mt-3 inline-block text-sm font-semibold text-knust-700 hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}

function MemberDashboard() {
  const { user } = useAuth();

  const loans = useQuery({
    queryKey: ['my-loans', true],
    queryFn: async () =>
      (await api.get<Loan[]>('/circulation/my-loans', { params: { active: true } })).data,
  });

  const fines = useQuery({
    queryKey: ['my-fines'],
    queryFn: async () => (await api.get<{ fines: Fine[]; outstanding: number }>('/fines/mine')).data,
  });

  const reservations = useQuery({
    queryKey: ['my-reservations'],
    queryFn: async () => (await api.get<Reservation[]>('/reservations/mine')).data,
  });

  const loading = loans.isLoading || fines.isLoading || reservations.isLoading;

  const active = loans.data ?? [];
  const overdue = active.filter((l) => isOverdue(l.dueDate, l.status));
  const dueSoon = active.filter(
    (l) => !isOverdue(l.dueDate, l.status) && daysUntil(l.dueDate) <= DUE_SOON_DAYS,
  );
  const ready = (reservations.data ?? []).filter((r) => r.status === 'READY');
  const pending = (reservations.data ?? []).filter((r) => r.status === 'PENDING');
  const outstanding = fines.data?.outstanding ?? 0;
  const limit = user?.borrowingLimit ?? 0;

  // Soonest due first, so the top of the list is the most urgent.
  const upcoming = [...active].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  const needsAttention = overdue.length > 0 || ready.length > 0 || outstanding > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-knust-900">
            Welcome, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your loans, reservations and fines at the Prempeh II Library.
          </p>
        </div>
        <Badge tone="green">{user?.membershipType}</Badge>
      </div>

      {/* Anything needing the member to act, surfaced above the numbers. */}
      {!loading && needsAttention && (
        <div className="flex flex-col gap-2">
          {overdue.length > 0 && (
            <ActionRow
              tone="danger"
              text={`${overdue.length} book${overdue.length === 1 ? ' is' : 's are'} overdue. Return ${overdue.length === 1 ? 'it' : 'them'} to stop further fines.`}
              to="/my-loans"
              cta="View loans"
            />
          )}
          {ready.length > 0 && (
            <ActionRow
              tone="good"
              text={`${ready.length} reservation${ready.length === 1 ? ' is' : 's are'} ready for collection${
                ready[0].expiresAt ? `, collect by ${formatDate(ready[0].expiresAt)}` : ''
              }.`}
              to="/my-reservations"
              cta="View reservations"
            />
          )}
          {outstanding > 0 && (
            <ActionRow
              tone="warn"
              text={`You owe ${money(outstanding)} in unpaid fines, payable at the library desk.`}
              to="/my-fines"
              cta="View fines"
            />
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="On loan"
            value={`${active.length} / ${limit}`}
            hint={`${Math.max(limit - active.length, 0)} more allowed`}
          />
          <Tile
            label="Due soon"
            value={dueSoon.length}
            hint={`Within ${DUE_SOON_DAYS} days`}
            tone={dueSoon.length > 0 ? 'warn' : 'default'}
          />
          <Tile
            label="Reservations"
            value={ready.length + pending.length}
            hint={
              ready.length > 0 ? `${ready.length} ready to collect` : `${pending.length} in queue`
            }
          />
          <Tile
            label="Outstanding"
            value={money(outstanding)}
            hint={outstanding > 0 ? 'Payable at the desk' : 'Nothing owed'}
            tone={outstanding > 0 ? 'danger' : 'default'}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Currently borrowed"
          linkTo="/my-loans"
          linkLabel="All loans"
          loading={loading}
        >
          {!upcoming.length ? (
            <MiniEmpty
              text="You have nothing on loan."
              to="/catalogue"
              cta="Browse the catalogue"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.slice(0, 5).map((l) => {
                const late = isOverdue(l.dueDate, l.status);
                const soon = daysUntil(l.dueDate) <= DUE_SOON_DAYS;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                      {l.copy.book.title}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        late ? 'text-red-600' : soon ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    >
                      {dueLabel(l.dueDate)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Reservations"
          linkTo="/my-reservations"
          linkLabel="All reservations"
          loading={loading}
        >
          {!ready.length && !pending.length ? (
            <MiniEmpty text="No active reservations." to="/catalogue" cta="Reserve a title" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...ready, ...pending].slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {r.book.title}
                  </span>
                  {r.status === 'READY' ? (
                    <Badge tone="green">Ready</Badge>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-500">
                      #{r.queuePosition} in queue
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  if (!user) return null;

  // Staff land on the reporting dashboard; members see their account summary.
  if (hasRole('LIBRARIAN')) return <StaffDashboard />;

  return <MemberDashboard />;
}
