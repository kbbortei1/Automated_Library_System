import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

type ButtonVariant = 'primary' | 'accent' | 'knust' | 'secondary' | 'danger' | 'ghost';

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 shadow-sm',
    accent: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 shadow-sm',
    knust: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50 shadow-sm',
    secondary: 'bg-surface text-fg border border-border hover:bg-surface-2',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm',
    ghost: 'text-fg-muted hover:bg-surface-3',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  label,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>}
      <input
        className={`w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>}
      <select
        className={`w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/25',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
    info: 'bg-accent-soft text-accent border-accent/40',
  };
  return <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles[kind]}`}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    // Shadows are a light-mode affordance: on a dark surface there is nothing
    // for them to darken against, so the border carries the edge instead.
    <div
      className={`rounded-xl border border-border bg-surface p-6 shadow-card dark:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}

// Grey block standing in for content while a query is in flight. Sized by the
// caller so the placeholder matches the shape of what is about to land.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-3 ${className}`} />;
}

// Empty result placeholder. `action` should offer the way out of the empty
// state (usually a route back to the catalogue) rather than leaving a dead end.
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {/* The chip sizes whatever icon it is given, so callers pass a bare
          <SomeIcon /> without repeating dimensions at every call site. */}
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-softfg [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </span>
      )}
      <div>
        <p className="font-semibold text-fg">{title}</p>
        {body && <p className="mt-1 text-sm text-fg-muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'navy';

export function Badge({
  children,
  tone = 'gray',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    gray: 'bg-surface-3 text-fg-muted',
    green: 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-accent-soft text-accent',
    navy: 'bg-accent text-white',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// Coloured status dot + label (availability, etc.).
export function StatusDot({ tone, children }: { tone: 'green' | 'amber' | 'red'; children: ReactNode }) {
  const dot = { green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-accent' : 'bg-surface-3'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// KPI card used on the staff dashboard.
export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = 'text-fg',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-fg-muted">{label}</span>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
            {icon}
          </span>
        )}
      </div>
      <div className={`font-display text-3xl font-bold ${accent}`}>{value}</div>
      {hint && <div className="text-xs text-fg-subtle">{hint}</div>}
    </Card>
  );
}

// Initials avatar with a deterministic tone.
export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const tones = ['bg-accent-hover', 'bg-accent', 'bg-amber-600', 'bg-emerald-600', 'bg-rose-500'];
  const tone = tones[name.charCodeAt(0) % tones.length];
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${tone} ${className}`}
    >
      {initials}
    </span>
  );
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
