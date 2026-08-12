import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Alert, Avatar, Button, Card, Select } from '../../components/ui';
import { StaffHeader } from '../../components/StaffHeader';
import { formatDate } from '../../lib/format';
import type { Paginated, Role, User } from '../../types';

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

const FIELD_META: Record<
  string,
  { label: string; helper: string; prefix?: string; multiline?: boolean }
> = {
  default_loan_period_days: { label: 'Default Loan Period (Days)', helper: 'The standard duration a book can be checked out.' },
  max_renewals: { label: 'Max Renewals', helper: 'Number of times a user can extend their loan.' },
  due_soon_reminder_days: { label: 'Reminder Window (Days Before Due)', helper: 'Days before due date to send automated notifications.' },
  fine_rate_per_day: { label: 'Fine Rate per Day', helper: 'Standard daily penalty for overdue items.', prefix: 'GH₵' },
  fine_block_threshold: { label: 'Block Threshold', helper: 'Prevent borrowing if fines exceed this amount.', prefix: 'GH₵' },
  reservation_ready_window_hours: { label: 'Reservation Hold (Hours)', helper: 'Hours a ready hold is kept before it expires.' },
  borrowing_limit_student: { label: 'Student Borrowing Limit', helper: 'Max concurrent loans for students.' },
  borrowing_limit_faculty: { label: 'Faculty Borrowing Limit', helper: 'Max concurrent loans for faculty.' },
  borrowing_limit_public: { label: 'Public Borrowing Limit', helper: 'Max concurrent loans for public members.' },
  max_renewals_student: { label: 'Student Renewals', helper: 'Renewals per loan for students.' },
  max_renewals_faculty: { label: 'Faculty Renewals', helper: 'Renewals per loan for faculty.' },
  max_renewals_public: { label: 'Public Renewals', helper: 'Renewals per loan for public members.' },
  library_phone: { label: 'Enquiries Phone', helper: 'Shown to members on Contact Staff. Leave blank to publish nothing.' },
  library_email: { label: 'Enquiries Email', helper: 'Shown to members on Contact Staff. Leave blank to publish nothing.' },
  library_hours: { label: 'Opening Hours', helper: 'Free text, for example "Mon to Fri, 8am to 8pm".' },
  library_locations: {
    label: 'Library Locations',
    helper: 'One library per line, as "Name | Where to find it | Hours". Blank hides the list.',
    multiline: true,
  },
};

function Field({
  k,
  value,
  onChange,
}: {
  k: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const meta = FIELD_META[k] ?? { label: k, helper: '' };
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg">{meta.label}</label>
      <div className="relative">
        {meta.prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">
            {meta.prefix}
          </span>
        )}
        {meta.multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-lg border border-border bg-surface-2 py-2.5 text-sm outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/20 ${
              meta.prefix ? 'pl-12 pr-3.5' : 'px-3.5'
            }`}
          />
        )}
      </div>
      {meta.helper && <p className="mt-1 text-xs italic text-fg-subtle">{meta.helper}</p>}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </span>
        <h2 className="text-lg font-bold text-fg">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<Setting[]>('/settings')).data,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: { pageSize: 100 } })).data,
  });

  useEffect(() => {
    if (settings) setEdits(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  }, [settings]);

  const saveAll = useMutation({
    mutationFn: async () => {
      const changed = (settings ?? []).filter((s) => edits[s.key] !== s.value);
      await Promise.all(changed.map((s) => api.patch(`/settings/${s.key}`, { value: edits[s.key] })));
      return changed.length;
    },
    onSuccess: (n) => {
      setMsg({ kind: 'success', text: n ? `Saved ${n} setting(s)` : 'No changes to save' });
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => setMsg({ kind: 'error', text: apiErrorMessage(e) }),
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) =>
      (await api.patch(`/users/${id}/role`, { role })).data,
    onSuccess: () => {
      setMsg({ kind: 'success', text: 'Role updated' });
      qc.invalidateQueries({ queryKey: ['staff-users'] });
    },
    onError: (e) => setMsg({ kind: 'error', text: apiErrorMessage(e) }),
  });

  const get = (k: string) => edits[k] ?? '';
  const staffMembers = (staff?.items ?? []).filter((u) => u.role !== 'MEMBER');

  return (
    <div>
      <StaffHeader title="System Settings" subtitle="Configure library circulation, fines, and administrative access.">
        <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending}>
          Save All Changes
        </Button>
      </StaffHeader>

      {msg && <div className="mb-5"><Alert kind={msg.kind}>{msg.text}</Alert></div>}

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            icon="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            title="Circulation Rules"
          >
            <Field k="default_loan_period_days" value={get('default_loan_period_days')} onChange={(v) => setEdits((e) => ({ ...e, default_loan_period_days: v }))} />
            <Field k="max_renewals" value={get('max_renewals')} onChange={(v) => setEdits((e) => ({ ...e, max_renewals: v }))} />
            <Field k="due_soon_reminder_days" value={get('due_soon_reminder_days')} onChange={(v) => setEdits((e) => ({ ...e, due_soon_reminder_days: v }))} />
          </SectionCard>

          <SectionCard
            icon="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
            title="Fine Policy"
          >
            <Field k="fine_rate_per_day" value={get('fine_rate_per_day')} onChange={(v) => setEdits((e) => ({ ...e, fine_rate_per_day: v }))} />
            <Field k="fine_block_threshold" value={get('fine_block_threshold')} onChange={(v) => setEdits((e) => ({ ...e, fine_block_threshold: v }))} />
            <Field k="reservation_ready_window_hours" value={get('reservation_ready_window_hours')} onChange={(v) => setEdits((e) => ({ ...e, reservation_ready_window_hours: v }))} />
          </SectionCard>
        </div>

        <SectionCard
          icon="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          title="Borrowing Limits"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Field k="borrowing_limit_student" value={get('borrowing_limit_student')} onChange={(v) => setEdits((e) => ({ ...e, borrowing_limit_student: v }))} />
            <Field k="borrowing_limit_faculty" value={get('borrowing_limit_faculty')} onChange={(v) => setEdits((e) => ({ ...e, borrowing_limit_faculty: v }))} />
            <Field k="borrowing_limit_public" value={get('borrowing_limit_public')} onChange={(v) => setEdits((e) => ({ ...e, borrowing_limit_public: v }))} />
          </div>
          {/* Per-type renewals override Max Renewals above, which is only the
              fallback where a type has no value of its own. */}
          <div className="grid gap-5 sm:grid-cols-3">
            <Field k="max_renewals_student" value={get('max_renewals_student')} onChange={(v) => setEdits((e) => ({ ...e, max_renewals_student: v }))} />
            <Field k="max_renewals_faculty" value={get('max_renewals_faculty')} onChange={(v) => setEdits((e) => ({ ...e, max_renewals_faculty: v }))} />
            <Field k="max_renewals_public" value={get('max_renewals_public')} onChange={(v) => setEdits((e) => ({ ...e, max_renewals_public: v }))} />
          </div>
        </SectionCard>

        <SectionCard
          icon="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
          title="Published Contact Details"
        >
          <p className="-mt-2 text-sm text-fg-muted">
            Shown to members on the Contact Staff and Library Locations pages. Anything left blank
            is not published, and the page says so rather than showing an empty field.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field k="library_phone" value={get('library_phone')} onChange={(v) => setEdits((e) => ({ ...e, library_phone: v }))} />
            <Field k="library_email" value={get('library_email')} onChange={(v) => setEdits((e) => ({ ...e, library_email: v }))} />
          </div>
          <Field k="library_hours" value={get('library_hours')} onChange={(v) => setEdits((e) => ({ ...e, library_hours: v }))} />
          <Field k="library_locations" value={get('library_locations')} onChange={(v) => setEdits((e) => ({ ...e, library_locations: v }))} />
        </SectionCard>

        {/* Staff & user roles */}
        <Card className="p-0">
          <div className="px-6 pt-6">
            <h2 className="text-lg font-bold text-fg">Staff &amp; User Roles</h2>
            <p className="text-sm text-fg-muted">Manage permissions for staff members.</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border-subtle bg-surface-2 text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((u) => (
                  <tr key={u.id} className="border-b border-surface-2 last:border-0">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <span className="font-medium text-fg">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-fg-muted">{u.email}</td>
                    <td className="px-6 py-3 text-fg-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-3">
                      <Select
                        value={u.role}
                        onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}
                        className="w-36"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="LIBRARIAN">Librarian</option>
                        <option value="ADMIN">Admin</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
