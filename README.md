# Automated Library System (ALS)

A web-based library management system for the KNUST libraries: a **member portal** for
students, faculty and public borrowers, and a **staff and administrator back office**, served by
one REST API.

Members search the catalogue, see live availability, reserve titles they cannot get today, track
their loans and fines, and are reminded before a book falls due. Staff run a circulation desk built
around a barcode scanner. Administrators set the library's policy and can trace who did what.

> The systems proposal (problem, actors, requirements, design, stack) is supplied **alongside**
> this repository, not inside it. Read it first for the why; this file covers the how.

---

## Contents

- [Running it](#running-it) · [Seeded accounts](#seeded-accounts) · [Scripts](#scripts)
- [How it is put together](#how-it-is-put-together) · [Repository layout](#repository-layout)
- [Domain rules worth knowing](#domain-rules-worth-knowing)
- [API reference](#api-reference) · [Scheduled jobs](#scheduled-jobs)
- [Testing](#testing) · [Configuration](#configuration)
- [Build status](#build-status) · [Known gaps](#known-gaps)

---

## Running it

**Prerequisites:** Node.js **20+**, PostgreSQL **15+**.

```bash
npm install                     # installs both workspaces

cp server/.env.example server/.env
#   set DATABASE_URL to your Postgres connection string
#   the JWT secrets can be any non-empty strings in development

npm run db:migrate              # create the schema
npm run db:seed                 # settings, subject taxonomy, demo accounts, sample catalogue
npm run dev                     # API on :4000, client on :5173
```

Open <http://localhost:5173>. The client dev server proxies `/api` to the API, so no CORS
configuration is needed to develop. Health check: <http://localhost:4000/api/health>.

`npm run db:seed` is idempotent and safe to re-run; it will not duplicate anything.

### Seeded accounts

Sign in with **either the email or the member ID**, plus the password.

| Role | Email | Member ID | Password |
|---|---|---|---|
| ADMIN | `admin@als.local` | `STAFF-0001` | `Admin123!` |
| LIBRARIAN | `librarian@als.local` | `STAFF-0002` | `Librarian123!` |
| MEMBER | `member@als.local` | `STU-100245` | `Member123!` |

Development passwords only. Anything real needs its own accounts and secrets.

### Scripts

Run from the repository root.

| Script | Action |
|---|---|
| `npm run dev` | Server and client together |
| `npm run dev:server` / `npm run dev:client` | One at a time |
| `npm run build` | Type-check and build both |
| `npm test` | Backend test suite |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed defaults (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed |

---

## How it is put together

**Stack.** React 18 · Vite · TypeScript · Tailwind · React Router · TanStack Query · Recharts on
the front. Node 20 · Express 4 · TypeScript · Prisma 6 · PostgreSQL 15 · Zod · JWT · Nodemailer ·
node-cron behind it. Tests are Vitest and Supertest. One npm-workspaces repository, so a change to
an API contract and the screen consuming it travel together.

**Layering.** Every backend feature module is the same four layers:

```
routes  →  controller  →  service  →  Prisma
```

Routes declare the path and attach middleware. Controllers read the request and shape the
response, and stay thin on purpose. Services hold the business rules, so a rule has one home and
can be tested without an HTTP request. Prisma does the data access.

**Three decisions worth knowing before reading the code:**

1. **Transactions wrap anything that moves stock and money together.** Checkout, return-with-fine
   and reservation promotion each run inside a single Prisma transaction, so a copy can never be
   issued without its loan, or returned without its fine.

2. **Cross-module effects are hooks, not imports.** A return has to promote the reservation queue,
   but importing each service into the other would be a cycle. Circulation exposes hook points at
   start-up and the reservation module fills them in, so circulation knows something *may* claim a
   returned copy without knowing what. See the bottom of `reservation.service.ts`.

3. **Notifications are dispatched after commit, never inside it.** Notices raised during a
   transaction are queued and flushed once it commits, so a mail failure cannot roll back a return
   that already happened. The audit log follows the same principle and never throws.

**Authorisation** is enforced server-side, always. The browser is a convenience, never a
safeguard. Two separate checks:

- `requireRole(min)` gates the endpoint by rank (MEMBER 1, LIBRARIAN 2, ADMIN 3).
- `canAdminister(actor, target)` gates *who the action is aimed at*. Role alone is not enough: a
  librarian passing a LIBRARIAN check could otherwise suspend an administrator. Nobody may act on
  someone who outranks them, on a peer unless they are an admin, or on their own account.

### Repository layout

```
server/
  prisma/
    schema.prisma            14 models, UUID keys, soft delete where history matters
    seed.ts                  settings, subject taxonomy, demo accounts, sample catalogue
    migrations/
  src/
    app.ts                   router composition and middleware order
    index.ts                 startup, scheduler registration, graceful shutdown
    config/env.ts            environment parsed and validated by Zod at boot
    lib/                     prisma client, jwt, password, mailer, money, errors
    middleware/              auth (roles), validate (Zod), errorHandler
    modules/
      auth/                  register, login by email or member ID, refresh
      user/                  profile, member management, roles
      catalog/               books, copies, accession numbering, lookups
      circulation/           checkout, return, renew, eligibility rules
      reservation/           FIFO queue, promotion, expiry
      fine/                  automatic fines, payment, waiver, defaulters
      notification/          in-app records and email dispatch
      report/                dashboard, rankings, staff activity, audit trail
      setting/               library policy, published policy subset
      audit/                 who did what, and the staff activity summary
      scheduler/             overdue sweep, reminders, hold expiry

client/
  src/
    App.tsx                  routes, grouped by who may reach them
    components/              layouts, DataTable, shared UI, icon set
    lib/                     api client, auth context, theme, policy, formatting
    pages/                   member pages, staff/, admin/, help/
```

---

## Domain rules worth knowing

These are the rules a reviewer would otherwise have to reverse-engineer.

| Rule | Where it lives |
|---|---|
| A checkout is refused if the member is suspended, at their borrowing limit, or owes more than the threshold | `circulation/eligibility.service.ts` |
| A held copy is only ever released to the member it is held for | `circulation/circulation.service.ts` |
| Due date comes from the member's own loan period, not a global constant | `circulation/circulation.service.ts` |
| Renewal allowance is per membership type, falling back to a global default | `circulation/circulation.service.ts` |
| Renewal is refused while anyone is waiting for the title | hook in `reservation/reservation.service.ts` |
| An overdue fine is days late times the configured daily rate, raised on return | `circulation/circulation.service.ts` |
| Returning a copy promotes the front of the queue, or puts it back on the shelf | hook in `reservation/reservation.service.ts` |
| An uncollected hold expires and passes to the next member | `reservation/reservation.service.ts` |
| Accession numbers increment while preserving zero padding, and a batch is all-or-nothing | `catalog/copy.service.ts` |
| Every action that moves stock, money or an account records its actor | `audit/audit.service.ts` |

Policy values (loan period, fine rate, renewal allowances, borrowing limits, thresholds, windows)
live in the `Setting` table and are editable by an administrator at runtime. Nothing above is
hard-coded.

---

## API reference

Everything is under `/api`. Only the health check and the three auth routes are public; the rest
need `Authorization: Bearer <accessToken>`. **Staff** means LIBRARIAN or above, **Admin** means
ADMIN only.

| Area | Method and path | Access |
|---|---|---|
| Health | `GET /health` | public |
| Auth | `POST /auth/register · /auth/login · /auth/refresh` | public |
| ↳ login | body `{ identifier, password }`, identifier = email **or** member ID | public |
| Profile | `GET/PATCH /users/me`, `POST /users/me/change-password` | auth |
| Members | `GET /users`, `PATCH /users/:id/status` | staff |
| Roles | `PATCH /users/:id/role · /users/:id/membership` | admin |
| Catalogue | `GET /catalog/books`, `GET /catalog/books/:id` | auth |
| Catalogue | `POST/PUT/DELETE /catalog/books…`, copies, lookups | staff |
| Circulation | `GET /circulation/my-loans`, `POST /circulation/loans/:id/renew` | auth |
| Circulation | `POST /circulation/checkout · /return`, `GET /circulation/loans`, `/eligibility/:userId` | staff |
| Reservations | `POST /reservations`, `GET /reservations/mine`, `POST /reservations/:id/cancel` | auth |
| Reservations | `GET /reservations` (queue) | staff |
| Fines | `GET /fines/mine` | auth |
| Fines | `GET /fines`, `/fines/defaulters`, `POST /fines/:id/pay · /waive` | staff |
| Notifications | `GET /notifications`, `POST /notifications/read-all · /:id/read` | auth |
| Settings | `GET /settings/policy` (published subset) | auth |
| Settings | `GET /settings` (all), `PATCH /settings/:key` | staff / admin |
| Reports | `GET /reports/dashboard · /most-borrowed · /stock-status` | staff |
| Reports | `GET /reports/staff-activity · /audit-log` | admin |

Success returns the resource directly. Failure always returns the same envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": {} } }
```

422 validation · 401 unauthenticated · 403 forbidden · 409 unique constraint · 404 missing.

### Scheduled jobs

| Job | Schedule | Effect |
|---|---|---|
| Overdue sweep | nightly 01:00 | notify borrowers, then mark loans past due as OVERDUE |
| Due-soon reminders | daily 08:00 | notify members of loans due inside the reminder window |
| Hold expiry | hourly | expire uncollected holds and pass the copy on |

Each job is a plain function a test can call directly. Toggle with `ENABLE_CRON`.

---

## Testing

```bash
npm test
```

**12 suites, 56 tests.** They run over real HTTP with Supertest against a real PostgreSQL
database rather than mocks, because what matters most here is transactional and a mock cannot
show that a transaction rolled back. Each suite creates and removes its own data.

| Suite | Tests | What it protects |
|---|---|---|
| Health | 1 | Process up, database reachable |
| Authentication | 8 | Registration, sign-in by email and member ID, refresh, bad credentials |
| Phone validation | 5 | Ghanaian formats accepted, missing and malformed refused |
| Authorisation | 6 | No acting on a superior, a peer, or oneself |
| Catalogue | 5 | Book creation, duplicate ISBN, search and filtering |
| Accession numbering | 5 | Zero padding preserved, whole batch refused on collision |
| Circulation | 4 | Transactional checkout and return, due dates, fine calculation |
| Eligibility | 3 | Suspension, borrowing limit and fine threshold each block a loan |
| Reservations | 6 | Queue order, promotion, expiry, cancellation, re-sequencing |
| Fines | 5 | Creation, payment, waiver, defaulters report |
| Notifications and scheduler | 4 | Notification records, overdue sweep, reminder window |
| Published policy | 4 | Members read policy, unlisted keys stay private |

> Run against a development database.

---

## Configuration

`server/.env`, from `server/.env.example`. Parsed and validated by Zod at start-up, so a bad
value fails immediately with a readable message rather than at first use.

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port, default 4000 |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes |
| `BCRYPT_ROUNDS` | bcrypt cost, 10 or higher |
| `SMTP_*` / `MAIL_FROM` | Email transport, blank uses a console transport in development |
| `ENABLE_CRON` | Turn scheduled jobs on or off |

---

## Build status

Each phase ended in a verification gate: not finished until demonstrated against a running system.

- [x] **0** Scaffold: both apps boot, Prisma reaches Postgres, health check
- [x] **1** Auth and RBAC: register, login, refresh, hashing, role middleware
- [x] **2** Catalogue and inventory: books, copies, shared lookups
- [x] **3** Search: catalogue, filters, live availability
- [x] **4** Circulation: transactional checkout, return, renew, overdue sweep
- [x] **5** Reservations: queue, promotion on return, cancel and expiry
- [x] **6** Fines: automatic fines, pay and waive, defaulters, suspension
- [x] **7** Notifications and reporting: in-app and email, cron, dashboard charts
- [x] **8** Polish: responsive navigation, error boundary, empty and loading states, tests
- [x] **9** Identity and oversight: KNUST branding, light and dark themes, icon set, barcode
      circulation console, audit trail, required phone numbers, member Support pages

---

## Known gaps

Stated rather than left to be discovered.

- **Notifications are in-app and email only.** Phone numbers are collected and required, and the
  registration form states that reminders are the reason, but SMS dispatch is not implemented.
  Until it is, the number supports staff contacting a borrower directly.
- **Fines are settled at the desk.** Staff record a payment or a waiver and both are attributed.
  There is no online payment; mobile money is the intended next step.
- **Library contact details ship empty.** `library_phone`, `library_email`, `library_hours` and
  `library_locations` are seeded blank, and the member Support pages say so rather than showing
  something unverified. An administrator fills them in under Settings.
- **No fine appeals workflow.** A member disputes a fine at the desk; a librarian waives it.

### Beyond this scope

Mobile money settlement · SMS notifications · university single sign-on · MARC 21, Z39.50 and
SIP2 interoperability · RFID and self-service kiosks · multi-branch holdings · native mobile app
· recommendations from borrowing patterns.
