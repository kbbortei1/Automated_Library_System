import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { apiErrorMessage } from '../lib/api';
import { Alert, Button, Card, Input, Select } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    identifier: '',
    password: '',
    phone: '',
    membershipType: 'PUBLIC',
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
    setSubmitting(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        identifier: form.identifier || undefined,
        password: form.password,
        phone: form.phone || undefined,
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
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-700">Create your account</h1>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <Input label="Full name" required value={form.fullName} onChange={update('fullName')} />
          <Input label="Email" type="email" required value={form.email} onChange={update('email')} />
          <Input
            label={
              form.membershipType === 'FACULTY'
                ? 'Staff ID (optional)'
                : form.membershipType === 'STUDENT'
                  ? 'Student no. / index (optional)'
                  : 'Member ID (optional)'
            }
            value={form.identifier}
            onChange={update('identifier')}
            placeholder="used to sign in alongside your email"
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={update('password')}
          />
          <Input label="Phone (optional)" value={form.phone} onChange={update('phone')} />
          <Select label="Membership type" value={form.membershipType} onChange={update('membershipType')}>
            <option value="PUBLIC">Public</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
          </Select>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
