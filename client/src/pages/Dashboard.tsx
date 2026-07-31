import { useAuth } from '../lib/auth';
import { Card } from '../components/ui';
import StaffDashboard from './staff/StaffDashboard';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  if (!user) return null;

  // Staff land on the reporting dashboard; members see their account summary.
  if (hasRole('LIBRARIAN')) return <StaffDashboard />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Welcome, {user.fullName}</h1>
        <p className="text-slate-500">
          {user.role === 'MEMBER'
            ? 'Browse the catalogue, manage your loans, reservations and fines.'
            : 'Staff console — circulation, catalogue and member management.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <h3 className="text-sm font-medium text-slate-500">Membership</h3>
          <p className="mt-1 text-lg font-semibold text-slate-800">{user.membershipType}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-500">Borrowing limit</h3>
          <p className="mt-1 text-lg font-semibold text-slate-800">{user.borrowingLimit} books</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-500">Loan period</h3>
          <p className="mt-1 text-lg font-semibold text-slate-800">{user.loanPeriodDays} days</p>
        </Card>
      </div>

      <Card>
        <p className="text-sm text-slate-500">
          Catalogue, circulation, reservations, fines, and reports arrive in the next build phases.
        </p>
      </Card>
    </div>
  );
}
