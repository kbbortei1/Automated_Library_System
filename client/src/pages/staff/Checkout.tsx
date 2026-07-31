import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Button, Card, Input } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import type { Eligibility, Paginated, User } from '../../types';

export default function Checkout() {
  const [memberSearch, setMemberSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [accession, setAccession] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const { data: members } = useQuery({
    queryKey: ['checkout-members', memberSearch],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { search: memberSearch || undefined } }))
        .data,
    enabled: memberSearch.length >= 2,
  });

  const { data: eligibility } = useQuery({
    queryKey: ['eligibility', selected?.id],
    queryFn: async () =>
      (await api.get<Eligibility>(`/circulation/eligibility/${selected!.id}`)).data,
    enabled: !!selected,
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const copy = (await api.get('/catalog/copies/lookup', { params: { accessionNumber: accession } }))
        .data as { id: string };
      return (await api.post('/circulation/checkout', { userId: selected!.id, copyId: copy.id })).data;
    },
    onSuccess: (loan: { copy: { book: { title: string } }; dueDate: string }) => {
      setResult(
        `✓ Checked out "${loan.copy.book.title}" — due ${new Date(loan.dueDate).toLocaleDateString()}`,
      );
      setAccession('');
      setError('');
    },
    onError: (e) => {
      setError(apiErrorMessage(e));
      setResult('');
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Checkout" subtitle="Issue a copy to a member." />

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">1. Find member</h2>
        <Input
          placeholder="Search member by name or email…"
          value={memberSearch}
          onChange={(e) => {
            setMemberSearch(e.target.value);
            setSelected(null);
          }}
        />
        {!selected && members?.items?.length ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {members.items.slice(0, 6).map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setSelected(m)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span>
                    {m.fullName} <span className="text-slate-400">· {m.email}</span>
                  </span>
                  <span className="text-xs text-slate-400">{m.membershipType}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selected && (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">
                {selected.fullName} · {selected.email}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-brand-600 hover:underline"
              >
                Change
              </button>
            </div>
            {eligibility &&
              (eligibility.eligible ? (
                <p className="mt-1 text-green-700">✓ Eligible to borrow</p>
              ) : (
                <p className="mt-1 text-red-600">✗ {eligibility.reasons.join('; ')}</p>
              ))}
          </div>
        )}
      </Card>

      {selected && eligibility?.eligible && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-700">2. Scan copy</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              checkout.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <Input
              label="Accession number"
              required
              value={accession}
              onChange={(e) => setAccession(e.target.value)}
            />
            <Button type="submit" disabled={checkout.isPending}>
              Check out
            </Button>
          </form>
        </Card>
      )}

      {result && <Alert kind="success">{result}</Alert>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
