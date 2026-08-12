import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge, Select } from '../../components/ui';
import { DataTable, type Column } from '../../components/DataTable';
import { StaffHeader } from '../../components/StaffHeader';
import { ExchangeIcon } from '../../components/icons';
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

  const columns: Column<Loan>[] = [
    {
      header: 'Book',
      primary: true,
      className: 'font-medium text-fg',
      cell: (l) => l.copy.book.title,
    },
    { header: 'Member', cell: (l) => l.user.fullName },
    { header: 'Accession', cell: (l) => l.copy.accessionNumber },
    {
      header: 'Due',
      className: 'text-fg-muted',
      cell: (l) => (
        <span
          className={
            isOverdue(l.dueDate, l.status) ? 'font-semibold text-red-600 dark:text-red-400' : ''
          }
        >
          {formatDate(l.dueDate)}
        </span>
      ),
    },
    { header: 'Returned', cell: (l) => formatDate(l.returnDate) },
    {
      header: 'Status',
      cell: (l) => {
        const overdue = isOverdue(l.dueDate, l.status);
        return (
          <Badge
            tone={
              l.status === 'RETURNED' ? 'gray' : overdue || l.status === 'OVERDUE' ? 'red' : 'green'
            }
          >
            {overdue && l.status === 'ACTIVE' ? 'OVERDUE' : l.status}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <StaffHeader title="Loans" subtitle="Circulation journal: active, overdue, and returned." />

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

      <DataTable
        columns={columns}
        rows={data?.items}
        keyOf={(l) => l.id}
        isLoading={isLoading}
        skeletonRows={6}
        emptyIcon={<ExchangeIcon />}
        emptyTitle={status ? `No ${status.toLowerCase()} loans` : 'No loans yet'}
        emptyBody={
          status
            ? 'Try a different status filter.'
            : 'Loans appear here once books are checked out at the desk.'
        }
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-fg-muted">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg-muted transition hover:bg-surface-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
