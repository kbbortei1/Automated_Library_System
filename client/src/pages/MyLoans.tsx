import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Alert, Button, Card } from '../components/ui';
import { formatDate, isOverdue } from '../lib/format';
import type { Loan } from '../types';

export default function MyLoans() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-loans', activeOnly],
    queryFn: async () =>
      (await api.get<Loan[]>('/circulation/my-loans', { params: { active: activeOnly } })).data,
  });

  const renew = useMutation({
    mutationFn: async (loanId: string) =>
      (await api.post(`/circulation/loans/${loanId}/renew`)).data,
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['my-loans'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">My loans</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !data?.length ? (
          <p className="p-6 text-slate-500">You have no {activeOnly ? 'active ' : ''}loans.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
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
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.copy.book.title}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(l.checkoutDate)}</td>
                    <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                      {formatDate(l.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.status === 'RETURNED'
                            ? 'bg-slate-200 text-slate-700'
                            : overdue || l.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {overdue && l.status === 'ACTIVE' ? 'OVERDUE' : l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{l.renewalCount}</td>
                    <td className="px-4 py-3">
                      {l.status !== 'RETURNED' && (
                        <Button onClick={() => renew.mutate(l.id)} disabled={renew.isPending}>
                          Renew
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
