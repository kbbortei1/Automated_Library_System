import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, EmptyState, Skeleton } from '../components/ui';
import { CheckCircleIcon } from '../components/icons';
import { formatDate, money } from '../lib/format';
import type { Fine, FineStatus } from '../types';

const STATUS_STYLES: Record<FineStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  PAID: 'bg-accent-soft text-accent',
  WAIVED: 'bg-surface-3 text-fg-muted',
};

function StatusPill({ status }: { status: FineStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export default function MyFines() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-fines'],
    queryFn: async () => (await api.get<{ fines: Fine[]; outstanding: number }>('/fines/mine')).data,
  });

  const outstanding = data?.outstanding ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-fg">My fines</h1>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm text-fg-muted">Outstanding balance</span>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-fg-subtle">
                {outstanding > 0 ? 'Settled at the library desk' : 'Nothing owed'}
              </p>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <span
              className={`font-display text-3xl font-bold ${
                outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-accent'
              }`}
            >
              {money(outstanding)}
            </span>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : !data?.fines.length ? (
        <Card className="p-0">
          <EmptyState
            icon={<CheckCircleIcon />}
            title="No fines"
            body="Nothing has been charged to your account. Return books by their due date to keep it that way."
          />
        </Card>
      ) : (
        <>
          {/* Cards on small screens: the five-column table below needs a
              horizontal scroll on a phone, which is unusable one-handed. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {data.fines.map((f) => (
              <li key={f.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-fg">{f.loan.copy.book.title}</span>
                    <StatusPill status={f.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1 text-xs">
                    <dt className="text-fg-subtle">Amount</dt>
                    <dd className="text-right font-semibold text-fg">{money(f.amount)}</dd>
                    <dt className="text-fg-subtle">Reason</dt>
                    <dd className="text-right text-fg-muted">{f.reason}</dd>
                    <dt className="text-fg-subtle">Issued</dt>
                    <dd className="text-right text-fg-muted">{formatDate(f.createdAt)}</dd>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.fines.map((f) => (
                  <tr key={f.id} className="border-b border-border-subtle">
                    <td className="px-4 py-3 font-medium text-fg">
                      {f.loan.copy.book.title}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{f.reason}</td>
                    <td className="px-4 py-3 font-medium text-fg">{money(f.amount)}</td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(f.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
