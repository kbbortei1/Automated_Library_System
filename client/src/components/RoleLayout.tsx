import { useAuth } from '../lib/auth';
import { MemberLayout } from './MemberLayout';
import { StaffLayout } from './StaffLayout';

// Picks the portal shell by role: staff (LIBRARIAN+) get the sidebar, members the top nav.
export function RoleLayout() {
  const { hasRole } = useAuth();
  return hasRole('LIBRARIAN') ? <StaffLayout /> : <MemberLayout />;
}
