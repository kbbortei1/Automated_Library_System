import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import { money } from '../../lib/format';
import { policyNumber, useLibraryPolicy } from '../../lib/policy';
import { Faq, HelpLayout } from './HelpLayout';

export default function HelpCenter() {
  const { data: policy } = useLibraryPolicy();

  const fineRate = policyNumber(policy, 'fine_rate_per_day');
  const blockAt = policyNumber(policy, 'fine_block_threshold');
  const holdHours = policyNumber(policy, 'reservation_ready_window_hours');
  const reminderDays = policyNumber(policy, 'due_soon_reminder_days');

  // Rendered inline in the answers below so the FAQ never contradicts the
  // library's actual configuration.
  const rate = fineRate !== null ? `${money(fineRate)} per day` : 'a set daily rate';
  const limit = blockAt !== null ? money(blockAt) : 'a set limit';
  const hold = holdHours !== null ? `${holdHours} hours` : 'a set number of hours';
  const remind = reminderDays !== null ? `${reminderDays} days` : 'a few days';

  return (
    <HelpLayout
      title="Help Centre"
      subtitle="How borrowing, reserving, renewing and fines actually work here."
      current="/help"
    >
      <Card>
        <h2 className="text-lg font-bold text-fg">Borrowing and returning</h2>
        <div className="mt-2">
          <Faq q="How do I borrow a book?">
            Find the title in the catalogue and check that a copy is available, then take it to the
            circulation desk. A librarian scans your member ID and the copy, and the loan is issued
            with a due date. Books are always issued by staff, so you cannot check one out yourself
            from this site.
          </Faq>
          <Faq q="Why was I refused at the desk?">
            Only three things stop a loan: you already have your maximum number of books out, you
            owe more than {limit} in unpaid fines, or your account has been suspended. The desk will
            tell you which one it is. The exact figures for your membership are on the{' '}
            <Link to="/help/borrowing-rules" className="font-medium text-accent hover:underline">
              Borrowing Rules
            </Link>{' '}
            page.
          </Faq>
          <Faq q="How do I return a book?">
            Hand it in at the desk. A librarian scans the copy and the loan is closed immediately.
            If it is late, the fine is worked out and added to your account at that moment, so you
            will know the amount before you leave.
          </Faq>
          <Faq q="Can I see what I have borrowed before?">
            Yes. <Link to="/my-loans" className="font-medium text-accent hover:underline">My Loans</Link>{' '}
            shows everything currently out and everything you have returned, with the dates.
          </Faq>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-fg">Reservations</h2>
        <div className="mt-2">
          <Faq q="Every copy is out. What can I do?">
            Reserve the title. Open the book from the catalogue and choose to reserve it. You join a
            queue in the order people reserved, so your place is fixed the moment you ask, not by
            who happens to be standing at the desk when a copy comes back.
          </Faq>
          <Faq q="How will I know when it is ready?">
            When a copy is returned, the person at the front of the queue is promoted automatically
            and the copy is held for them rather than going back to the shelf. You get a
            notification here and by email the moment that happens.
          </Faq>
          <Faq q="How long is a reserved book held for me?">
            {hold} from the moment it is ready. If you have not collected it by then, the hold
            expires and the copy passes to the next person waiting. You are told when that happens,
            and you are free to reserve the title again and rejoin the queue.
          </Faq>
          <Faq q="Can I cancel a reservation?">
            Yes, at any time, from{' '}
            <Link to="/my-reservations" className="font-medium text-accent hover:underline">
              My Reservations
            </Link>
            . Everyone behind you moves up one place.
          </Faq>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-fg">Renewals</h2>
        <div className="mt-2">
          <Faq q="How do I renew a loan?">
            Renew it yourself from{' '}
            <Link to="/my-loans" className="font-medium text-accent hover:underline">My Loans</Link>.
            The due date is recalculated from the day you renew, not from the old due date.
          </Faq>
          <Faq q="Why can I not renew this book?">
            Usually because somebody else is waiting for it. If there is a reservation queue on a
            title, renewals are refused, because extending one person's loan indefinitely would make
            the queue meaningless. Otherwise you may have reached the renewal limit for your
            membership type, which is shown on the{' '}
            <Link to="/help/borrowing-rules" className="font-medium text-accent hover:underline">
              Borrowing Rules
            </Link>{' '}
            page.
          </Faq>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-fg">Fines</h2>
        <div className="mt-2">
          <Faq q="How is a fine worked out?">
            {rate}, counted from the day after the book was due until the day it is returned. It is
            calculated by the system when the book is checked back in, so the same lateness always
            costs the same amount.
          </Faq>
          <Faq q="How do I pay?">
            At the circulation desk. A librarian records the payment against the specific fine and
            your balance updates straight away. Every payment and every waiver is recorded against
            the member of staff who processed it.
          </Faq>
          <Faq q="Does owing a fine stop me borrowing?">
            Only once the unpaid total goes above {limit}. Below that you can keep borrowing
            normally. Your balance is on{' '}
            <Link to="/my-fines" className="font-medium text-accent hover:underline">My Fines</Link>.
          </Faq>
          <Faq q="I think a fine is wrong.">
            Raise it at the desk. A librarian can waive a fine where the library's policy allows it.
            There is no way to contest a fine through this site yet.
          </Faq>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-fg">Your account</h2>
        <div className="mt-2">
          <Faq q="Will I be reminded before a book is due?">
            Yes. A reminder goes out {remind} before the due date, and a further notice if a book
            becomes overdue. Both appear in{' '}
            <Link to="/notifications" className="font-medium text-accent hover:underline">
              Notifications
            </Link>{' '}
            and are sent to your email address.
          </Faq>
          <Faq q="Why do you need my phone number?">
            So the library can reach you about a book that is due or a fine on your account, in the
            cases where email does not get through. It is not shown to other members. What is held
            and why is set out on the{' '}
            <Link to="/help/privacy" className="font-medium text-accent hover:underline">
              Your Data
            </Link>{' '}
            page.
          </Faq>
          <Faq q="Can I sign in with my student number?">
            Yes. Either your email address or your member ID works, with the same password.
          </Faq>
          <Faq q="How do I change my details or password?">
            From <Link to="/profile" className="font-medium text-accent hover:underline">Profile</Link>.
            Changing your password needs your current one.
          </Faq>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-fg">Still stuck?</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Anything about your own account, a specific loan, or a fine is best handled at the desk,
          where staff can see your record.{' '}
          <Link to="/help/contact" className="font-medium text-accent hover:underline">
            Contact details are here
          </Link>
          .
        </p>
      </Card>
    </HelpLayout>
  );
}
