import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiErrorMessage } from '../lib/api';
import { AuthLayout } from '../components/AuthLayout';
import { Alert, Button, Input } from '../components/ui';

const MEMBERSHIPS = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'PUBLIC', label: 'Public' },
] as const;

// The ID a member signs in with is named differently per population.
const ID_LABEL: Record<string, string> = {
  STUDENT: 'Student no. / index (optional)',
  FACULTY: 'Staff ID (optional)',
  PUBLIC: 'Member ID (optional)',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    identifier: '',
    password: '',
    phone: '',
    membershipType: 'STUDENT',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!form.phone.trim()) {
      setError('A phone number is required so the library can reach you about due dates and fines');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        identifier: form.identifier || undefined,
        password: form.password,
        phone: form.phone.trim(),
        membershipType: form.membershipType,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Register once to borrow, reserve and renew across the KNUST Library System."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && <Alert>{error}</Alert>}

        {/* Membership type as a segmented control, three fixed options read
            better than a dropdown and surface the ID field's meaning. */}
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-fg">Membership type</legend>
          <div className="grid grid-cols-3 gap-2">
            {MEMBERSHIPS.map((m) => {
              const active = form.membershipType === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm((f) => ({ ...f, membershipType: m.value }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-accent bg-accent-soft text-accent shadow-sm'
                      : 'border-border bg-surface text-fg-muted hover:bg-surface-2'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Input label="Full name" required value={form.fullName} onChange={update('fullName')} />

        <Input
          label="Email"
          type="email"
          required
          placeholder="you@st.knust.edu.gh"
          value={form.email}
          onChange={update('email')}
        />

        <Input
          label={ID_LABEL[form.membershipType]}
          value={form.identifier}
          onChange={update('identifier')}
          placeholder="used to sign in alongside your email"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            placeholder="min. 8 characters"
            value={form.password}
            onChange={update('password')}
          />
          <div>
            <Input
              label="Phone"
              type="tel"
              required
              value={form.phone}
              onChange={update('phone')}
              placeholder="024 123 4567"
            />
            {/* Ghana's Data Protection Act asks that a required field says why
                it is needed, not just that it is mandatory. */}
            <p className="mt-1 text-xs leading-relaxed text-fg-subtle">
              Used for due-date reminders and fine notices.
            </p>
          </div>
        </div>

        <Button type="submit" variant="knust" disabled={submitting} className="w-full py-2.5">
          {submitting ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
