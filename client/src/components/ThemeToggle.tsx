import { useTheme } from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';

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
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
