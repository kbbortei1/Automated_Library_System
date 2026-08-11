import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { NotificationBell } from './NotificationBell';
import { KnustCrest } from './KnustCrest';
import { ThemeToggle } from './ThemeToggle';
import { CloseIcon, MenuIcon } from './icons';
import { Avatar } from './ui';

const LINKS = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/my-loans', label: 'My Loans' },
  { to: '/my-reservations', label: 'Reservations' },
  { to: '/my-fines', label: 'Fines' },
];

function TopLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `border-b-2 px-1 pb-0.5 text-sm font-medium transition ${
          isActive
            ? 'border-gold-500 text-white'
            : 'border-transparent text-chrome-muted hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function MemberLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-black/20 bg-chrome text-chrome-fg">
        <nav className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <KnustCrest className="h-9 w-9" />
            <span className="font-display text-lg font-extrabold leading-none tracking-tight text-chrome-fg">
              KNUST Library
            </span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <TopLink key={l.to} {...l} />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="text-chrome-muted hover:bg-white/10 hover:text-white" />
            <NotificationBell />
            <Link
              to="/profile"
              className="rounded-full ring-2 ring-transparent transition hover:ring-accent/30"
            >
              <Avatar name={user?.fullName ?? '?'} />
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-chrome-muted transition hover:bg-white/10 hover:text-white sm:block"
            >
              Logout
            </button>
            {/* Swapping the glyph for the state makes it clear the button
                closes the menu it just opened. */}
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-lg p-2 text-chrome-muted transition hover:bg-white/10 hover:text-white md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </nav>
        {open && (
          <div className="flex flex-col gap-1 border-t border-white/15 px-4 py-3 md:hidden">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-chrome-muted hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login');
              }}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-chrome-muted hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <KnustCrest className="h-8 w-8" />
              <h3 className="font-display text-lg font-bold text-fg">KNUST Library</h3>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
              The Prempeh II Library and the college libraries of Kwame Nkrumah University of
              Science and Technology, in one catalogue.
            </p>
            <p className="mt-3 font-display text-sm italic text-accent">
              Nyansapɔ Wɔsane No Badwenma
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>Borrowing Rules</li>
              <li>Library Locations</li>
              <li>Contact Staff</li>
              <li>Help Center</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fg">Account</h4>
            <ul className="mt-3 space-y-2 text-sm text-fg-muted">
              <li>
                <Link to="/my-loans" className="hover:text-accent">
                  Reading History
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-accent">
                  Profile Settings
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="hover:text-accent">
                  Notifications
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 text-xs text-fg-subtle sm:flex-row sm:px-6">
            <span>
              © {new Date().getFullYear()} Kwame Nkrumah University of Science and Technology,
              Kumasi.
            </span>
            <span className="flex gap-4">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
