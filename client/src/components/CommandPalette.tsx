import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  BookOpenIcon,
  CalendarIcon,
  ExchangeIcon,
  GridIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from './icons';
import type { Book, Paginated, User } from '../types';

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  to: string;
  group: string;
}

const ACTIONS: Item[] = [
  { id: 'a-dash', label: 'Dashboard', icon: <GridIcon />, to: '/', group: 'Go to' },
  { id: 'a-cat', label: 'Catalogue', icon: <BookOpenIcon />, to: '/staff/books', group: 'Go to' },
  {
    id: 'a-circ',
    label: 'Circulation console',
    hint: 'Check out and return',
    icon: <ExchangeIcon />,
    to: '/staff/circulation',
    group: 'Go to',
  },
  {
    id: 'a-res',
    label: 'Reservation queue',
    icon: <CalendarIcon />,
    to: '/staff/reservations',
    group: 'Go to',
  },
  { id: 'a-mem', label: 'Members', icon: <UsersIcon />, to: '/staff/members', group: 'Go to' },
  { id: 'a-fine', label: 'Fines', icon: <BanknoteIcon />, to: '/staff/fines', group: 'Go to' },
  {
    id: 'a-def',
    label: 'Defaulters',
    icon: <AlertTriangleIcon />,
    to: '/staff/defaulters',
    group: 'Go to',
  },
];

/**
 * Ctrl/Cmd+K palette for the staff console.
 *
 * Staff repeat the same few jumps all day: find a member, find a title, get
 * to circulation. Doing that through the sidebar plus a page search costs
 * several clicks each time; this collapses it to one keystroke and a query.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const search = q.trim();
  const enabled = open && search.length >= 2;

  const { data: members } = useQuery({
    queryKey: ['palette-members', search],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { search } })).data.items.slice(0, 5),
    enabled,
  });

  const { data: books } = useQuery({
    queryKey: ['palette-books', search],
    queryFn: async () =>
      (await api.get<Paginated<Book>>('/catalog/books', { params: { q: search, pageSize: 5 } })).data
        .items,
    enabled,
  });

  const items = useMemo<Item[]>(() => {
    const actions = ACTIONS.filter(
      (a) => !search || a.label.toLowerCase().includes(search.toLowerCase()),
    );
    if (hasRole('ADMIN')) {
      actions.push({
        id: 'a-set',
        label: 'Settings',
        icon: <SettingsIcon />,
        to: '/admin/settings',
        group: 'Go to',
      });
    }
    const memberItems: Item[] = (members ?? []).map((m) => ({
      id: `m-${m.id}`,
      label: m.fullName,
      hint: m.email,
      icon: <UsersIcon />,
      to: '/staff/members',
      group: 'Members',
    }));
    const bookItems: Item[] = (books ?? []).map((b) => ({
      id: `b-${b.id}`,
      label: b.title,
      hint: `${b.availableCopies}/${b.totalCopies} available`,
      icon: <BookOpenIcon />,
      to: `/staff/books/${b.id}/copies`,
      group: 'Titles',
    }));
    return [...actions, ...memberItems, ...bookItems];
  }, [members, books, search, hasRole]);

  useEffect(() => {
    setActive(0);
  }, [items.length]);

  if (!open) return null;

  const choose = (item: Item) => {
    setOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      choose(items[active]);
    }
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-cardhover"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search members, titles, or jump to a page…"
            className="w-full bg-transparent py-3.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-fg-subtle sm:block">
            Esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-2">
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-fg-muted">
              {search.length >= 2 ? 'Nothing matches that.' : 'Type at least two characters.'}
            </li>
          )}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id}>
                {header && (
                  <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
                    {header}
                  </div>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                    i === active ? 'bg-accent-soft text-accent-softfg' : 'text-fg hover:bg-surface-2'
                  }`}
                >
                  <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="shrink-0 truncate text-xs text-fg-subtle">{item.hint}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
