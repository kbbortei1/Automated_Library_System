/**
 * Money formatting for text the member actually reads: notification bodies,
 * emails, and the reasons a checkout was refused.
 *
 * The client has its own formatter for what it renders. This one exists so
 * that server-generated strings agree with it, rather than each call site
 * writing its own currency symbol and drifting.
 */
export function cedis(amount: number): string {
  return `GH₵${amount.toFixed(2)}`;
}
