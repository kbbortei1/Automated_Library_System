import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Avatar } from './ui';
import { KnustCrest } from './KnustCrest';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { CommandPalette } from './CommandPalette';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  BookOpenIcon,
  CalendarIcon,
  CloseIcon,
  ExchangeIcon,
  GridIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from './icons';

const icons = {
  dashboard: <GridIcon />,
  catalogue: <BookOpenIcon />,
  circulation: <ExchangeIcon />,
  reservations: <CalendarIcon />,
  members: <UsersIcon />,
  fines: <BanknoteIcon />,
  defaulters: <AlertTriangleIcon />,
  settings: <SettingsIcon />,
};

interface NavItem {
  to: string;
  label: string;
  icon: keyof typeof icons;
  admin?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/staff/books', label: 'Catalogue', icon: 'catalogue' },
  { to: '/staff/circulation', label: 'Circulation', icon: 'circulation' },
  { to: '/staff/reservations', label: 'Reservations', icon: 'reservations' },
  { to: '/staff/members', label: 'Members', icon: 'members' },
  { to: '/staff/fines', label: 'Fines', icon: 'fines' },
  { to: '/staff/defaulters', label: 'Defaulters', icon: 'defaulters' },
];
const SECONDARY: NavItem[] = [{ to: '/admin/settings', label: 'Settings', icon: 'settings', admin: true }];

function SidebarLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-accent text-accent-fg shadow-sm'
            : 'text-fg-muted hover:bg-surface-3 hover:text-fg'
        }`
      }
    >
      {icons[item.icon]}
      {item.label}
    </NavLink>
  );
}

export function StaffLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const secondary = SECONDARY.filter((i) => !i.admin || hasRole('ADMIN'));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-3 py-5">
        <KnustCrest className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-base font-bold leading-tight text-fg">KNUST Library</h1>
          <p className="text-xs text-fg-subtle">
            {hasRole('ADMIN') ? 'Administrator' : 'Librarian'}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {PRIMARY.map((i) => (
          <SidebarLink key={i.to} item={i} onClick={close} />
        ))}
        {secondary.length > 0 && (
          <>
            <div className="my-3 border-t border-border" />
            {secondary.map((i) => (
              <SidebarLink key={i.to} item={i} onClick={close} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user?.fullName ?? '?'} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-fg">{user?.fullName}</div>
            <div className="text-xs capitalize text-fg-subtle">{user?.role.toLowerCase()}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-fg-muted transition hover:bg-surface-3 hover:text-fg"
          >
            Sign out
          </button>
          <ThemeToggle className="hidden text-fg-muted hover:bg-surface-3 hover:text-fg lg:block" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      <CommandPalette />
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <KnustCrest className="h-7 w-7" />
          <span className="font-display text-base font-bold text-fg">KNUST Library</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-fg-muted hover:bg-surface-3 hover:text-fg" />
          <NotificationBell />
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-fg-muted transition hover:bg-surface-3 hover:text-fg"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="absolute left-0 top-0 h-full w-72 bg-surface shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:block">
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
