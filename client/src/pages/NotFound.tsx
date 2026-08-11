import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="font-display text-5xl font-bold text-knust-800">404</h1>
      <p className="text-slate-500">That page doesn't exist.</p>
      <Link
        to="/"
        className="rounded-md bg-knust-600 px-4 py-2 text-sm font-medium text-white hover:bg-knust-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
