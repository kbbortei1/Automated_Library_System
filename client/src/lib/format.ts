export function formatDate(iso?: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isOverdue(dueDate: string, status: string): boolean {
  return status !== 'RETURNED' && new Date(dueDate).getTime() < Date.now();
}

// Ghana cedi, matches the design template.
export function money(amount: string | number): string {
  return `GH₵${Number(amount).toFixed(2)}`;
}
