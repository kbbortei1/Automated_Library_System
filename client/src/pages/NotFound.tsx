import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="font-display text-5xl font-bold text-fg">404</h1>
      <p className="text-fg-muted">That page doesn't exist.</p>
      <Link
        to="/"
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
