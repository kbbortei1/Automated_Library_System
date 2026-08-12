import { Link } from 'react-router-dom';
import { Card, Skeleton } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { money } from '../../lib/format';
import {
  borrowingLimitFor,
  policyNumber,
  renewalsFor,
  useLibraryPolicy,
} from '../../lib/policy';
import { HelpLayout } from './HelpLayout';

const TYPES = ['STUDENT', 'FACULTY', 'PUBLIC'] as const;

function Rule({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="text-sm text-fg-muted">{label}</div>
      <div className="text-right">
        <div className="font-semibold text-fg">{value}</div>
        {note && <div className="text-xs text-fg-subtle">{note}</div>}
      </div>
    </div>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function BorrowingRules() {
  const { user } = useAuth();
  const { data: policy, isLoading } = useLibraryPolicy();

  const fineRate = policyNumber(policy, 'fine_rate_per_day');
  const blockAt = policyNumber(policy, 'fine_block_threshold');
  const holdHours = policyNumber(policy, 'reservation_ready_window_hours');
  const reminderDays = policyNumber(policy, 'due_soon_reminder_days');
  const defaultLoan = policyNumber(policy, 'default_loan_period_days');

  return (
    <HelpLayout
      title="Borrowing Rules"
      subtitle="The rules your account is actually held to, taken live from the library's current settings."
      current="/help/borrowing-rules"
    >
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {user && (
            <Card>
              <h2 className="text-lg font-bold text-fg">Your account</h2>
              <p className="mt-1 text-sm text-fg-muted">
                You are registered as a{' '}
                <span className="font-semibold text-fg">{user.membershipType.toLowerCase()}</span>{' '}
                member.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-2 p-4">
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Books at once</div>
                  <div className="mt-1 text-2xl font-bold text-fg">{user.borrowingLimit}</div>
                </div>
                <div className="rounded-lg bg-surface-2 p-4">
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Loan period</div>
                  <div className="mt-1 text-2xl font-bold text-fg">
                    {user.loanPeriodDays}
                    <span className="ml-1 text-sm font-medium text-fg-muted">days</span>
                  </div>
                </div>
                <div className="rounded-lg bg-surface-2 p-4">
                  <div className="text-xs uppercase tracking-wide text-fg-subtle">Renewals</div>
                  <div className="mt-1 text-2xl font-bold text-fg">
                    {renewalsFor(policy, user.membershipType) ?? '-'}
                    <span className="ml-1 text-sm font-medium text-fg-muted">per loan</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-fg-subtle">
                Your limit and loan period are set on your account, so they can differ from the
                standard figures below if a librarian has adjusted them for you.
              </p>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold text-fg">By membership type</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Membership</th>
                    <th className="py-2 pr-4 font-medium">Books at once</th>
                    <th className="py-2 font-medium">Renewals per loan</th>
                  </tr>
                </thead>
                <tbody>
                  {TYPES.map((t) => {
                    const mine = user?.membershipType === t;
                    return (
                      <tr
                        key={t}
                        className={`border-b border-border-subtle last:border-0 ${
                          mine ? 'bg-accent-soft' : ''
                        }`}
                      >
                        <td className="py-3 pr-4 font-medium text-fg">
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                          {mine && (
                            <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-fg">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-fg-muted">
                          {borrowingLimitFor(policy, t) ?? '-'}
                        </td>
                        <td className="py-3 text-fg-muted">{renewalsFor(policy, t) ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-fg">Loans, fines and holds</h2>
            <div className="mt-2">
              <Rule
                label="Standard loan period"
                value={defaultLoan !== null ? plural(defaultLoan, 'day') : '-'}
                note="Counted from the day the book is issued"
              />
              <Rule
                label="Overdue fine"
                value={fineRate !== null ? `${money(fineRate)} per day` : '-'}
                note="Charged automatically when the book comes back late"
              />
              <Rule
                label="Borrowing stops when you owe more than"
                value={blockAt !== null ? money(blockAt) : '-'}
                note="Settle at the desk and borrowing resumes straight away"
              />
              <Rule
                label="Time to collect a reserved book"
                value={holdHours !== null ? plural(holdHours, 'hour') : '-'}
                note="After that it passes to the next member waiting"
              />
              <Rule
                label="Reminder before a book is due"
                value={reminderDays !== null ? plural(reminderDays, 'day') : '-'}
                note="Sent to your notifications and your email"
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-fg">When borrowing is refused</h2>
            <p className="mt-1 text-sm text-fg-muted">
              The desk will tell you which of these applies. There are only three reasons:
            </p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="font-semibold text-fg">You already have your maximum out.</span>{' '}
                  Return or renew something first. Your current loans are on{' '}
                  <Link to="/my-loans" className="font-medium text-accent hover:underline">
                    My Loans
                  </Link>
                  .
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="font-semibold text-fg">You owe more than the limit above.</span>{' '}
                  Check the balance on{' '}
                  <Link to="/my-fines" className="font-medium text-accent hover:underline">
                    My Fines
                  </Link>{' '}
                  and settle it at the desk.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="font-semibold text-fg">Your account is suspended.</span> Speak to
                  a librarian; only staff can lift a suspension.
                </span>
              </li>
            </ul>
          </Card>
        </>
      )}
    </HelpLayout>
  );
}
