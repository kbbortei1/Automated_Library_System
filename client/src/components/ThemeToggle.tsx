import { useTheme } from '../lib/theme';

/**
 * Light/dark switch for the app header.
 *
 * Toggling writes an explicit preference, which stops following the OS. That
 * is the intent: someone reaching for this wants a specific theme, not the
 * system default they just overrode.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, setPref } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setPref(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`rounded-lg p-2 transition ${className}`}
    >
      {isDark ? (
        // Sun
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        // Moon
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
          />
        </svg>
      )}
    </button>
  );
}
