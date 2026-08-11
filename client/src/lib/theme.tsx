import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'knust.theme';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function readPref(): ThemePref {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/** Single place that touches the DOM, shared with the anti-flash script in index.html. */
function apply(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

interface ThemeContextValue {
  pref: ThemePref;
  isDark: boolean;
  setPref: (p: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() => readPref());
  const [isDark, setIsDark] = useState(
    () => pref === 'dark' || (pref === 'system' && systemPrefersDark()),
  );

  const sync = useCallback((p: ThemePref) => {
    apply(p);
    setIsDark(p === 'dark' || (p === 'system' && systemPrefersDark()));
  }, []);

  const setPref = useCallback(
    (p: ThemePref) => {
      localStorage.setItem(STORAGE_KEY, p);
      setPrefState(p);
      sync(p);
    },
    [sync],
  );

  useEffect(() => {
    sync(pref);
  }, [pref, sync]);

  // Follow the OS while the preference is "system".
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => sync('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref, sync]);

  return (
    <ThemeContext.Provider value={{ pref, isDark, setPref }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
