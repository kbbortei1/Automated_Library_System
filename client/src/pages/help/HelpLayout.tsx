import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../../components/icons';

const SUPPORT_LINKS = [
  { to: '/help', label: 'Help Centre' },
  { to: '/help/borrowing-rules', label: 'Borrowing Rules' },
  { to: '/help/locations', label: 'Library Locations' },
  { to: '/help/contact', label: 'Contact Staff' },
  { to: '/help/privacy', label: 'Your Data' },
];

/**
 * Shared shell for the Support pages. Keeps the sibling links on screen so a
 * member who lands on the wrong one is a click away from the right one,
 * rather than having to scroll back to the footer.
 */
export function HelpLayout({
  title,
  subtitle,
  current,
  children,
}: {
  title: string;
  subtitle?: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-accent"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to the library
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-fg sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>

      <nav aria-label="Support" className="flex flex-wrap gap-2 border-b border-border pb-4">
        {SUPPORT_LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            aria-current={l.to === current ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              l.to === current
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}

/** A question and its answer. Native disclosure, so it works without script. */
export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-border-subtle last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-semibold text-fg marker:content-none hover:text-accent">
        {q}
        <span
          aria-hidden
          className="shrink-0 text-fg-subtle transition group-open:rotate-45"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-fg-muted">{children}</div>
    </details>
  );
}

/**
 * Shown where the library has not published a detail yet. Saying so is better
 * than printing a placeholder a member might act on.
 */
export function NotPublished({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-fg-muted">
      The library has not published {what} yet. Ask at the circulation desk in the meantime.
    </p>
  );
}
