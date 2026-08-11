import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import type { Role } from '../types';

// Gates routes by authentication and (optionally) minimum role.
export function ProtectedRoute({ minRole }: { minRole?: Role }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-fg-muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (minRole && !hasRole(minRole)) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">403 Access denied</h2>
        <p className="mt-2 text-fg-muted">You don't have permission to view this page.</p>
      </div>
    );
  }
  return <Outlet />;
}
