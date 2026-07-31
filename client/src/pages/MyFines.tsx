import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card } from '../components/ui';
import { formatDate, money } from '../lib/format';
import type { Fine, FineStatus } from '../types';

const STATUS_STYLES: Record<FineStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
  WAIVED: 'bg-slate-200 text-slate-600',
};

export default function MyFines() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-fines'],
    queryFn: async () =>
      (await api.get<{ fines: Fine[]; outstanding: number }>('/fines/mine')).data,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-navy-800">My fines</h1>

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Outstanding balance</span>
          <span
            className={`text-2xl font-bold ${
              (data?.outstanding ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {money(data?.outstanding ?? 0)}
          </span>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !data?.fines.length ? (
          <p className="p-6 text-slate-500">You have no fines. 🎉</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
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
                <tr key={f.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.loan.copy.book.title}</td>
                  <td className="px-4 py-3 text-slate-600">{f.reason}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{money(f.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[f.status]}`}
                    >
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-slate-400">Fines are settled at the library desk.</p>
    </div>
  );
}
