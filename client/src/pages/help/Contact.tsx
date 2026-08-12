import { Link } from 'react-router-dom';
import { Card, Skeleton } from '../../components/ui';
import { policyText, useLibraryPolicy } from '../../lib/policy';
import { HelpLayout, NotPublished } from './HelpLayout';

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="border-b border-border-subtle py-3 last:border-0">
      <div className="text-xs uppercase tracking-wide text-fg-subtle">{label}</div>
      {value ? (
        href ? (
          <a href={href} className="mt-1 block font-semibold text-accent hover:underline">
            {value}
          </a>
        ) : (
          <div className="mt-1 whitespace-pre-line font-semibold text-fg">{value}</div>
        )
      ) : (
        <div className="mt-1 text-sm text-fg-subtle">Not published yet</div>
      )}
    </div>
  );
}

export default function Contact() {
  const { data: policy, isLoading } = useLibraryPolicy();

  const phone = policyText(policy, 'library_phone');
  const email = policyText(policy, 'library_email');
  const hours = policyText(policy, 'library_hours');
  const nothingPublished = !phone && !email && !hours;

  return (
    <HelpLayout
      title="Contact Staff"
      subtitle="How to reach the library about your account, a loan, or a fine."
      current="/help/contact"
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <>
          <Card>
            <h2 className="text-lg font-bold text-fg">Library enquiries</h2>
            {nothingPublished ? (
              <div className="mt-3">
                <NotPublished what="its contact details" />
              </div>
            ) : (
              <div className="mt-2">
                <Detail
                  label="Phone"
                  value={phone}
                  href={phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined}
                />
                <Detail label="Email" value={email} href={email ? `mailto:${email}` : undefined} />
                <Detail label="Opening hours" value={hours} />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-fg">What the desk can help with</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Staff can see your borrowing record, so anything specific to your account is quickest
              in person or on the phone:
            </p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-fg-muted">
              {[
                'Issuing, returning and renewing books',
                'Checking why a loan was refused',
                'Settling or querying a fine',
                'Lifting a suspension on your account',
                'Correcting your name, member ID or contact details',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-fg-muted">
              Before you call, the{' '}
              <Link to="/help" className="font-medium text-accent hover:underline">
                Help Centre
              </Link>{' '}
              answers most questions about how borrowing works, and{' '}
              <Link to="/help/borrowing-rules" className="font-medium text-accent hover:underline">
                Borrowing Rules
              </Link>{' '}
              has the current limits and fine rate.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-fg">Staff contact details</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Individual librarians' personal phone numbers are not published here. Staff contact
              details are held for library administration only, and the library contacts you rather
              than the other way round. Use the enquiries line above and whoever is on duty will
              help you.
            </p>
          </Card>
        </>
      )}
    </HelpLayout>
  );
}
