import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import { HelpLayout } from './HelpLayout';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</div>
    </Card>
  );
}

export default function Privacy() {
  return (
    <HelpLayout
      title="Your Data"
      subtitle="What this system stores about you, and why."
      current="/help/privacy"
    >
      <Card className="border-accent/40 bg-accent-soft">
        <p className="text-sm leading-relaxed text-accent-softfg">
          This is a plain description of what the library system holds, written so you can see it
          without having to ask. It is not the university's formal privacy policy. For the
          university's official statement, or to make a request about your records, contact the
          library.
        </p>
      </Card>

      <Section title="What is held">
        <ul className="flex flex-col gap-2.5">
          {[
            ['Who you are', 'Your name, email address, member ID and membership type.'],
            [
              'Your phone number',
              'Collected so the library can reach you about a book that is due or a fine on your account.',
            ],
            [
              'Your borrowing',
              'Loans, returns, renewals, reservations and fines, with their dates. This is the library’s record of the books themselves, not only of you.',
            ],
            ['Notifications', 'The reminders and notices sent to you, and whether you have read them.'],
            [
              'Your password',
              'Stored only as a scrambled value that cannot be turned back into your password. Nobody at the library can read it.',
            ],
          ].map(([label, text]) => (
            <li key={label} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                <span className="font-semibold text-fg">{label}.</span> {text}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Who can see it">
        <p>
          You can see all of it from your own account. Library staff can see your contact details
          and your borrowing record, because that is what running a loan desk requires.
          Administrators can additionally see the log of staff actions.
        </p>
        <p className="mt-3">
          Other members cannot see anything about you. Your phone number and email are not shown in
          the catalogue, in reservation queues, or anywhere else another member can reach.
        </p>
      </Section>

      <Section title="What staff actions are recorded">
        <p>
          When a member of staff issues or takes back a book, renews a loan, records or waives a
          fine, or changes an account, the system records who did it and when. This exists so the
          library can answer questions about its own records, particularly where money is involved.
        </p>
      </Section>

      <Section title="How long it is kept">
        <p>
          Borrowing records are kept as part of the library's records. If an account is closed, the
          account is withdrawn from use but the loan history behind it remains, so the library can
          still account for its books.
        </p>
      </Section>

      <Section title="Correcting your details">
        <p>
          You can update your own contact details and password from{' '}
          <Link to="/profile" className="font-medium text-accent hover:underline">
            Profile
          </Link>
          . Your name, member ID and membership type are changed by library staff, so ask at the
          desk. For anything else about your records,{' '}
          <Link to="/help/contact" className="font-medium text-accent hover:underline">
            contact the library
          </Link>
          .
        </p>
      </Section>
    </HelpLayout>
  );
}
