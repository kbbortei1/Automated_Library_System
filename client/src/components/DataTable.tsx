import type { ReactNode } from 'react';
import { Card, EmptyState, Skeleton } from './ui';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Becomes the card title on small screens rather than a label/value pair. */
  primary?: boolean;
  /** Rendered unlabelled at the foot of the card, for buttons. */
  action?: boolean;
  /** Hidden on small screens, for columns that are noise on a phone. */
  hideOnCard?: boolean;
  className?: string;
}

/**
 * List rendering for the staff screens.
 *
 * Every staff list was a bare `<table>` inside `overflow-x-auto`, which means
 * a six-column horizontal scroll on a phone, plus a hand-rolled "Loading..."
 * string and a bare sentence for the empty case. Doing that ten times over
 * guarantees ten slightly different results, so the shape lives here once:
 * a table from md up, cards below it, skeletons while loading and a real
 * empty state.
 */
export function DataTable<T>({
  columns,
  rows,
  keyOf,
  isLoading = false,
  emptyTitle,
  emptyBody,
  emptyIcon,
  emptyAction,
  skeletonRows = 4,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  keyOf: (row: T) => string;
  isLoading?: boolean;
  emptyTitle: string;
  emptyBody?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  skeletonRows?: number;
}) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (!rows?.length) {
    return (
      <Card className="p-0">
        <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} action={emptyAction} />
      </Card>
    );
  }

  const primary = columns.find((c) => c.primary);
  const actions = columns.filter((c) => c.action);
  const details = columns.filter((c) => !c.primary && !c.action && !c.hideOnCard);

  return (
    <>
      {/* Cards below md: a wide table is unusable one-handed. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={keyOf(row)}>
            <Card className="flex flex-col gap-3 p-4">
              {primary && (
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-medium text-fg">{primary.cell(row)}</span>
                </div>
              )}
              {/* auto/1fr rather than an even split: labels are short and
                  values like an email need the remaining width, with
                  break-words so a long unbroken address cannot push the card
                  wider than the viewport. */}
              {details.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {details.map((c) => (
                    <div key={c.header} className="contents">
                      <dt className="text-fg-subtle">{c.header}</dt>
                      <dd className="min-w-0 break-words text-right text-fg-muted">
                        {c.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {actions.map((c) => (
                    <div key={c.header}>{c.cell(row)}</div>
                  ))}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-fg-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-3 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={keyOf(row)} className="border-b border-border-subtle last:border-0">
                {columns.map((c) => (
                  <td key={c.header} className={`px-4 py-3 ${c.className ?? 'text-fg-muted'}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
