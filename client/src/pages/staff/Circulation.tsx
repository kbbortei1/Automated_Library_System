import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Avatar, Badge, Button, Card } from '../../components/ui';
import { BookCover } from '../../components/BookCover';
import { StaffHeader } from '../../components/StaffHeader';
import { formatDate, money } from '../../lib/format';
import type { Eligibility, Loan, Paginated, User } from '../../types';

interface CopyLookup {
  id: string;
  accessionNumber: string;
  shelfLocation: string;
  status: string;
  book: { id: string; title: string; isbn: string };
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
      {n}
    </span>
  );
}

export default function Circulation() {
  const qc = useQueryClient();

  // Step 1 — member
  const [memberSearch, setMemberSearch] = useState('');
  const [member, setMember] = useState<User | null>(null);

  // Step 2 — copy
  const [accession, setAccession] = useState('');
  const [copy, setCopy] = useState<CopyLookup | null>(null);
  const [copyError, setCopyError] = useState('');

  // Quick return
  const [returnAccession, setReturnAccession] = useState('');

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data: members } = useQuery({
    queryKey: ['circ-members', memberSearch],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { search: memberSearch || undefined } })).data,
    enabled: memberSearch.length >= 2 && !member,
  });

  const { data: eligibility } = useQuery({
    queryKey: ['eligibility', member?.id],
    queryFn: async () => (await api.get<Eligibility>(`/circulation/eligibility/${member!.id}`)).data,
    enabled: !!member,
  });

  const { data: memberLoans } = useQuery({
    queryKey: ['member-active-loans', member?.id],
    queryFn: async () =>
      (await api.get<Paginated<Loan>>('/circulation/loans', { params: { userId: member!.id, status: 'ACTIVE' } }))
        .data,
    enabled: !!member,
  });

  const { data: activity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () =>
      (await api.get<Paginated<Loan>>('/circulation/loans', { params: { pageSize: 6 } })).data,
  });

  const lookupCopy = useMutation({
    mutationFn: async () =>
      (await api.get<CopyLookup>('/catalog/copies/lookup', { params: { accessionNumber: accession } })).data,
    onSuccess: (c) => {
      setCopy(c);
      setCopyError('');
    },
    onError: (e) => {
      setCopy(null);
      setCopyError(apiErrorMessage(e));
    },
  });

  const checkout = useMutation({
    mutationFn: async () =>
      (await api.post('/circulation/checkout', { userId: member!.id, copyId: copy!.id })).data,
    onSuccess: (loan: { copy: { book: { title: string } }; dueDate: string }) => {
      setToast({
        kind: 'success',
        text: `Checked out "${loan.copy.book.title}" — due ${formatDate(loan.dueDate)}`,
      });
      setCopy(null);
      setAccession('');
      qc.invalidateQueries({ queryKey: ['recent-activity'] });
      qc.invalidateQueries({ queryKey: ['member-active-loans'] });
      qc.invalidateQueries({ queryKey: ['eligibility'] });
    },
    onError: (e) => setToast({ kind: 'error', text: apiErrorMessage(e) }),
  });

  const quickReturn = useMutation({
    mutationFn: async () => {
      const c = (await api.get<CopyLookup>('/catalog/copies/lookup', { params: { accessionNumber: returnAccession } })).data;
      return (await api.post('/circulation/return', { copyId: c.id })).data;
    },
    onSuccess: (r: { loan: { copy: { book: { title: string } } }; fine: { amount: string } | null }) => {
      setToast({
        kind: r.fine ? 'error' : 'success',
        text: r.fine
          ? `Returned "${r.loan.copy.book.title}" — fine ${money(r.fine.amount)}`
          : `Returned "${r.loan.copy.book.title}" on time`,
      });
      setReturnAccession('');
      qc.invalidateQueries({ queryKey: ['recent-activity'] });
    },
    onError: (e) => setToast({ kind: 'error', text: apiErrorMessage(e) }),
  });

  return (
    <div>
      <StaffHeader title="Circulation Console" subtitle="Process loans, returns, and track inventory.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            quickReturn.mutate();
          }}
          className="hidden items-center gap-2 md:flex"
        >
          <input
            value={returnAccession}
            onChange={(e) => setReturnAccession(e.target.value)}
            placeholder="Scan accession for return"
            className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
          />
          <Button variant="secondary" type="submit" disabled={!returnAccession || quickReturn.isPending}>
            Quick Return
          </Button>
        </form>
      </StaffHeader>

      {toast && <div className="mb-5"><Alert kind={toast.kind}>{toast.text}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1 — member */}
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <StepBadge n={1} />
            <h2 className="text-lg font-bold text-navy-800">Identify Member</h2>
          </div>
          <input
            value={memberSearch}
            onChange={(e) => {
              setMemberSearch(e.target.value);
              setMember(null);
            }}
            placeholder="Search by name or member ID…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
          />

          {!member && members?.items?.length ? (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {members.items.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setMember(m)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Avatar name={m.fullName} />
                    <span className="flex-1">
                      <span className="font-medium text-slate-800">{m.fullName}</span>
                      <span className="block text-xs text-slate-400">
                        {m.identifier ?? m.email}
                      </span>
                    </span>
                    <Badge tone="gray">{m.membershipType}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {member && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={member.fullName} className="h-12 w-12 text-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy-800">{member.fullName}</span>
                    <Badge tone={member.status === 'ACTIVE' ? 'green' : 'red'}>{member.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-400">{member.identifier ?? member.email}</div>
                </div>
                <button onClick={() => setMember(null)} className="text-xs text-brand-600 hover:underline">
                  Change
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Current Loans</div>
                  <div className="font-semibold text-slate-800">
                    {memberLoans?.total ?? '—'} / {member.borrowingLimit}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs uppercase text-slate-400">Eligibility</div>
                  <div className={`font-semibold ${eligibility?.eligible ? 'text-green-600' : 'text-red-600'}`}>
                    {eligibility ? (eligibility.eligible ? 'Eligible' : 'Blocked') : '…'}
                  </div>
                </div>
              </div>
              {eligibility && !eligibility.eligible && (
                <p className="mt-2 text-xs text-red-600">{eligibility.reasons.join('; ')}</p>
              )}
            </div>
          )}
        </Card>

        {/* Step 2 — copy */}
        <Card className={member && eligibility?.eligible ? '' : 'opacity-60'}>
          <div className="mb-4 flex items-center gap-3">
            <StepBadge n={2} />
            <h2 className="text-lg font-bold text-navy-800">Scan Book Copy</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookupCopy.mutate();
            }}
          >
            <input
              value={accession}
              onChange={(e) => setAccession(e.target.value)}
              disabled={!member || !eligibility?.eligible}
              placeholder="Scan accession number or barcode…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 disabled:bg-slate-50"
            />
          </form>
          {copyError && <p className="mt-2 text-xs text-red-600">{copyError}</p>}

          {copy && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex gap-4">
                <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  <BookCover isbn={copy.book.isbn} title={copy.book.title} size="M" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-lg font-bold leading-snug text-navy-800">
                      {copy.book.title}
                    </h3>
                    <Badge tone={copy.status === 'AVAILABLE' ? 'green' : 'amber'}>{copy.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                  COPY #{copy.accessionNumber}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                  SHELF {copy.shelfLocation}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">ISBN {copy.book.isbn}</span>
              </div>
              <Button
                variant="accent"
                className="mt-4 w-full"
                disabled={copy.status !== 'AVAILABLE' || checkout.isPending}
                onClick={() => checkout.mutate()}
              >
                ✓ Process Checkout
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-lg font-bold text-navy-800">Recent Activity</h2>
          <Link to="/staff/loans" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View Journal
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          {!activity?.items.length ? (
            <p className="px-6 pb-6 text-sm text-slate-500">No recent circulation activity.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Transaction</th>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {activity.items.map((l) => {
                  const returned = Boolean(l.returnDate);
                  return (
                    <tr key={l.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-3">
                        <Badge tone={returned ? 'green' : 'gray'}>{returned ? 'RETURN' : 'CHECKOUT'}</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{l.copy.book.title}</td>
                      <td className="px-6 py-3 text-slate-600">{l.user.fullName}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {formatDate(returned ? l.returnDate : l.checkoutDate)}
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
  );
}
