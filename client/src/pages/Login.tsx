import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiErrorMessage } from '../lib/api';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your loans, reservations and fines at the Prempeh II Library."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}

        <Input
          label="Email, student no. or staff ID"
          type="text"
          autoComplete="username"
          placeholder="e.g. 20812345 or you@st.knust.edu.gh"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" variant="knust" disabled={submitting} className="w-full py-2.5">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-surface-3" />
        <span className="text-xs uppercase tracking-wide text-fg-subtle">New here</span>
        <span className="h-px flex-1 bg-surface-3" />
      </div>

      <Link
        to="/register"
        className="mt-4 flex w-full items-center justify-center rounded-lg border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent-soft"
      >
        Create a library account
      </Link>
    </AuthLayout>
  );
}
