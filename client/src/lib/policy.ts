import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** The library's published policy, as returned by GET /settings/policy. */
export type LibraryPolicy = Record<string, string>;

export function useLibraryPolicy() {
  return useQuery({
    queryKey: ['library-policy'],
    queryFn: async () => (await api.get<LibraryPolicy>('/settings/policy')).data,
    // Policy changes rarely and every Support page reads it, so hold it a while
    // rather than refetching on each navigation.
    staleTime: 10 * 60 * 1000,
  });
}

/** A numeric policy value, or null when it is absent or not a number. */
export function policyNumber(policy: LibraryPolicy | undefined, key: string): number | null {
  const raw = policy?.[key];
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/** A text policy value, trimmed, or null when it has not been filled in yet. */
export function policyText(policy: LibraryPolicy | undefined, key: string): string | null {
  const raw = policy?.[key]?.trim();
  return raw ? raw : null;
}

/**
 * Renewal allowance for a membership type.
 *
 * Mirrors the server: the per-type setting wins where one exists, and
 * max_renewals is the fallback. Kept in step with renewLoan in
 * circulation.service.ts.
 */
export function renewalsFor(
  policy: LibraryPolicy | undefined,
  membershipType: string,
): number | null {
  const perType = policyNumber(policy, `max_renewals_${membershipType.toLowerCase()}`);
  return perType ?? policyNumber(policy, 'max_renewals');
}

export function borrowingLimitFor(
  policy: LibraryPolicy | undefined,
  membershipType: string,
): number | null {
  return policyNumber(policy, `borrowing_limit_${membershipType.toLowerCase()}`);
}
