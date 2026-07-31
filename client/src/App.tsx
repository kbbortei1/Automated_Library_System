import { Routes, Route } from 'react-router-dom';
import { RoleLayout } from './components/RoleLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Catalogue from './pages/Catalogue';
import BookDetail from './pages/BookDetail';
import MyLoans from './pages/MyLoans';
import MyReservations from './pages/MyReservations';
import MyFines from './pages/MyFines';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import Members from './pages/staff/Members';
import Books from './pages/staff/Books';
import BookCopies from './pages/staff/BookCopies';
import Checkout from './pages/staff/Checkout';
import Returns from './pages/staff/Returns';
import Loans from './pages/staff/Loans';
import Circulation from './pages/staff/Circulation';
import ReservationQueue from './pages/staff/ReservationQueue';
import Fines from './pages/staff/Fines';
import Defaulters from './pages/staff/Defaulters';
import Settings from './pages/admin/Settings';

export default function App() {
  return (
    <Routes>
      {/* Public auth screens (no app chrome) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated app, wrapped in a role-aware shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayout />}>
          {/* Shared (any authenticated user) */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/catalogue/:id" element={<BookDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />

          {/* Member self-service */}
          <Route path="/my-loans" element={<MyLoans />} />
          <Route path="/my-reservations" element={<MyReservations />} />
          <Route path="/my-fines" element={<MyFines />} />

          {/* Staff (LIBRARIAN+) */}
          <Route element={<ProtectedRoute minRole="LIBRARIAN" />}>
            <Route path="/staff/books" element={<Books />} />
            <Route path="/staff/books/:id/copies" element={<BookCopies />} />
            <Route path="/staff/circulation" element={<Circulation />} />
            <Route path="/staff/checkout" element={<Checkout />} />
            <Route path="/staff/returns" element={<Returns />} />
            <Route path="/staff/loans" element={<Loans />} />
            <Route path="/staff/members" element={<Members />} />
            <Route path="/staff/reservations" element={<ReservationQueue />} />
            <Route path="/staff/fines" element={<Fines />} />
            <Route path="/staff/defaulters" element={<Defaulters />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute minRole="ADMIN" />}>
            <Route path="/admin/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
