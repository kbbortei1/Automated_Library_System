import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Card, Select } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { formatDate, isOverdue } from '../../lib/format';
import type { Loan, LoanStatus, Paginated } from '../../types';

export default function Loans() {
  const [status, setStatus] = useState<LoanStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['loans', status, page],
    queryFn: async () =>
      (
        await api.get<Paginated<Loan>>('/circulation/loans', {
          params: { status: status || undefined, page, pageSize: 20 },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Loans" subtitle="Circulation journal — active, overdue, and returned." />

      <div className="max-w-xs">
        <Select
          label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as LoanStatus | '');
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="RETURNED">Returned</option>
        </Select>
      </div>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !data?.items.length ? (
          <p className="p-6 text-slate-500">No loans found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Accession</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Returned</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((l) => {
                const overdue = isOverdue(l.dueDate, l.status);
                return (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.copy.book.title}</td>
                    <td className="px-4 py-3 text-slate-600">{l.user.fullName}</td>
                    <td className="px-4 py-3 text-slate-500">{l.copy.accessionNumber}</td>
                    <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                      {formatDate(l.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(l.returnDate)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          l.status === 'RETURNED'
                            ? 'gray'
                            : overdue || l.status === 'OVERDUE'
                              ? 'red'
                              : 'green'
                        }
                      >
                        {overdue && l.status === 'ACTIVE' ? 'OVERDUE' : l.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
