import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Alert, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { BooksIcon } from '../components/icons';
import { formatDate, isOverdue } from '../lib/format';
import type { Loan } from '../types';

/** Effective status, treating a passed due date on an active loan as overdue. */
function effectiveStatus(l: Loan): string {
  return isOverdue(l.dueDate, l.status) && l.status === 'ACTIVE' ? 'OVERDUE' : l.status;
}

function StatusPill({ loan }: { loan: Loan }) {
  const overdue = isOverdue(loan.dueDate, loan.status);
  const tone =
    loan.status === 'RETURNED'
      ? 'bg-surface-3 text-fg'
      : overdue || loan.status === 'OVERDUE'
        ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
        : 'bg-accent-soft text-accent';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {effectiveStatus(loan)}
    </span>
  );
}

export default function MyLoans() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-loans', activeOnly],
    queryFn: async () =>
      (await api.get<Loan[]>('/circulation/my-loans', { params: { active: activeOnly } })).data,
  });

  const renew = useMutation({
    mutationFn: async (loanId: string) =>
      (await api.post<Loan>(`/circulation/loans/${loanId}/renew`)).data,
    onSuccess: (loan) => {
      setError('');
      // Renewal previously succeeded silently; confirm the new due date.
      setNotice(`Renewed "${loan.copy.book.title}". Now due ${formatDate(loan.dueDate)}.`);
      qc.invalidateQueries({ queryKey: ['my-loans'] });
    },
    onError: (e) => {
      setNotice('');
      setError(apiErrorMessage(e));
    },
  });

  const renewButton = (l: Loan) =>
    l.status !== 'RETURNED' && (
      <Button
        variant="knust"
        onClick={() => renew.mutate(l.id)}
        disabled={renew.isPending}
        className="px-3 py-1.5 text-xs"
      >
        {renew.isPending && renew.variables === l.id ? 'Renewing...' : 'Renew'}
      </Button>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-fg">My loans</h1>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="accent-accent"
          />
          Active only
        </label>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {isLoading ? (
        <Card className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : !data?.length ? (
        <Card className="p-0">
          <EmptyState
            icon={<BooksIcon />}
            title={activeOnly ? 'No books on loan' : 'No loans yet'}
            body={
              activeOnly
                ? 'Nothing is currently checked out to you.'
                : 'Once you borrow a book it will appear here.'
            }
            action={
              <Link
                to="/catalogue"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover"
              >
                Browse the catalogue
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* Cards on small screens: the six-column table below needs a
              horizontal scroll on a phone, which is unusable one-handed. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {data.map((l) => {
              const overdue = isOverdue(l.dueDate, l.status);
              return (
                <li key={l.id}>
                  <Card className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-fg">{l.copy.book.title}</span>
                      <StatusPill loan={l} />
                    </div>
                    <dl className="grid grid-cols-2 gap-y-1 text-xs">
                      <dt className="text-fg-subtle">Checked out</dt>
                      <dd className="text-right text-fg-muted">{formatDate(l.checkoutDate)}</dd>
                      <dt className="text-fg-subtle">Due</dt>
                      <dd
                        className={`text-right ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-fg-muted'}`}
                      >
                        {formatDate(l.dueDate)}
                      </dd>
                      <dt className="text-fg-subtle">Renewals</dt>
                      <dd className="text-right text-fg-muted">{l.renewalCount}</dd>
                    </dl>
                    {renewButton(l)}
                  </Card>
                </li>
              );
            })}
          </ul>

          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Checked out</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Renewals</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => {
                  const overdue = isOverdue(l.dueDate, l.status);
                  return (
                    <tr key={l.id} className="border-b border-border-subtle">
                      <td className="px-4 py-3 font-medium text-fg">{l.copy.book.title}</td>
                      <td className="px-4 py-3 text-fg-muted">{formatDate(l.checkoutDate)}</td>
                      <td
                        className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-fg-muted'}`}
                      >
                        {formatDate(l.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill loan={l} />
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{l.renewalCount}</td>
                      <td className="px-4 py-3">{renewButton(l)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
