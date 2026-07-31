import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { api, apiErrorMessage } from '../lib/api';
import { Alert, Button, Card, Input } from '../components/ui';
import type { User } from '../types';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileMsg, setProfileMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const { data } = await api.patch<User>('/users/me', { fullName, phone: phone || null });
      setUser(data);
      setProfileMsg({ kind: 'success', text: 'Profile updated' });
    } catch (err) {
      setProfileMsg({ kind: 'error', text: apiErrorMessage(err) });
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    try {
      await api.post('/users/me/change-password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg({ kind: 'success', text: 'Password changed' });
    } catch (err) {
      setPwMsg({ kind: 'error', text: apiErrorMessage(err) });
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-navy-800">Profile</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">Account details</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          {profileMsg && <Alert kind={profileMsg.kind}>{profileMsg.text}</Alert>}
          <Input label="Email" value={user.email} disabled />
          {user.identifier && <Input label="Member ID" value={user.identifier} disabled />}
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Phone" value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
          <div>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-700">Change password</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          {pwMsg && <Alert kind={pwMsg.kind}>{pwMsg.text}</Alert>}
          <Input
            label="Current password"
            type="password"
            required
            value={pw.currentPassword}
            onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New password"
            type="password"
            required
            minLength={8}
            value={pw.newPassword}
            onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <div>
            <Button type="submit">Update password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
