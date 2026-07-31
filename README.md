# 📚 BiblioHub

Automated Library Management System — a web app with a **member portal** and a **staff/admin back office** over one API.

- **Frontend:** React 18 · Vite · TypeScript · Tailwind · React Router · TanStack Query · Axios · Recharts
- **Backend:** Node 20 · Express 4 · TypeScript · Prisma · PostgreSQL 15+ · JWT · Zod · Nodemailer · node-cron
- **Roles:** MEMBER → LIBRARIAN → ADMIN (RBAC enforced server-side)

> Email, in-app notifications, and reservations are **core scope**.

---

## Monorepo layout

```
.
├── server/   Express + Prisma API
│   ├── prisma/        schema.prisma, seed.ts, migrations
│   └── src/           config, lib, middleware, feature modules
├── client/   React + Vite SPA
│   └── src/           lib, components, pages
└── package.json       npm workspaces + dev scripts
```

---

## Prerequisites

- Node.js **20+**
- PostgreSQL **15+** running locally (or reachable via `DATABASE_URL`)

---

## Quick start

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure the server environment
cp server/.env.example server/.env
#   → edit DATABASE_URL with your Postgres credentials
#   → set JWT secrets (any non-empty strings in dev)

# (optional) client env — defaults work via Vite proxy
cp client/.env.example client/.env

# 3. Create the database schema and seed defaults
npm run db:migrate      # runs prisma migrate dev
npm run db:seed         # seeds Settings (and admin user in later phases)

# 4. Run both apps together
npm run dev
#   API    → http://localhost:4000  (health: /api/health)
#   Client → http://localhost:5173
```

The client dev server proxies `/api` to the API, so no CORS setup is needed in development.

### Seeded accounts

`npm run db:seed` creates three login accounts. You can sign in with **either the email or the member ID** (staff ID / student number / index), plus the password.

| Role | Email | Member ID | Password |
|---|---|---|---|
| ADMIN | `admin@bibliohub.local` | `STAFF-0001` | `Admin123!` |
| LIBRARIAN | `librarian@bibliohub.local` | `STAFF-0002` | `Librarian123!` |
| MEMBER | `member@bibliohub.local` | `STU-100245` | `Member123!` |

---

## Scripts (root)

| Script | Action |
|---|---|
| `npm run dev` | Run server + client together (concurrently) |
| `npm run dev:server` / `npm run dev:client` | Run one app |
| `npm run build` | Type-check and build both apps |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed default data |
| `npm run db:reset` | Drop, re-migrate, and re-seed |
| `npm test` | Run backend tests (Vitest + Supertest) |

---

## Environment variables (`server/.env`)

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port (default 4000) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes |
| `BCRYPT_ROUNDS` | bcrypt cost (≥10) |
| `SMTP_*` / `MAIL_FROM` | Email transport (blank → console/Ethereal in dev) |
| `ENABLE_CRON` | Toggle scheduled jobs |

---

## Build status

Phased roadmap — verification gate after each phase.

- [x] **Phase 0** — Scaffold (both apps boot, Prisma↔Postgres, health check)
- [x] **Phase 1** — Auth & RBAC (register/login/refresh, JWT, bcrypt, role middleware, auth UI)
- [x] **Phase 2** — Catalogue & inventory (book CRUD, copies, reusable lookups)
- [x] **Phase 3** — Search (public catalogue, filters, book detail live availability)
- [x] **Phase 4** — Circulation (transactional checkout/return/renew, overdue sweep)
- [x] **Phase 5** — Reservations (FIFO queue, promote-on-return, cancel/expire)
- [x] **Phase 6** — Fines & enforcement (auto-fine, pay/waive, defaulters, suspend)
- [x] **Phase 7** — Notifications & email + reports (in-app + email, cron jobs, dashboard charts)
- [x] **Phase 8** — Polish (responsive nav, error boundary, empty/loading states, tests, docs)

---

## API reference (overview)

All routes are under `/api`. Protected routes require `Authorization: Bearer <accessToken>`.
RBAC is enforced server-side; **Staff** = LIBRARIAN+, **Admin** = ADMIN only.

| Area | Method & path | Access |
|---|---|---|
| Health | `GET /health` | public |
| Auth | `POST /auth/register · /auth/login · /auth/refresh` | public |
| ↳ login | body `{ identifier, password }` — `identifier` = email **or** member ID | public |
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
| Reports | `GET /reports/dashboard · /most-borrowed · /stock-status` | staff |
| Settings | `GET /settings` (staff), `PATCH /settings/:key` (admin) | staff/admin |

### Scheduled jobs (node-cron)

| Job | Schedule | Effect |
|---|---|---|
| Overdue sweep | nightly 01:00 | notify + mark ACTIVE loans past due as OVERDUE |
| Due-soon reminders | daily 08:00 | notify members of loans due within the reminder window |
| Hold expiry | hourly | expire READY reservations and release/promote the copy |

Toggle with `ENABLE_CRON` in `server/.env`.

---

## Testing

Backend tests use Vitest + Supertest against the real database (happy + failure paths across
auth, RBAC, catalogue, circulation, eligibility, reservations, fines, notifications/scheduler).

```bash
npm test          # from repo root (runs the server workspace suite)
```

> Tests create and clean up their own data; run them against a dev database.

---

## Architecture

Layered backend per module: **routes → controller → service → Prisma**. Controllers stay thin;
business rules live in services. Cross-module side effects (reservation promotion on return,
notification dispatch) are wired through registered hooks to keep modules decoupled and avoid
circular imports. Money-and-state transitions (checkout, return + fine, reservation promotion)
run inside Prisma transactions.

---

## Future enhancements (out of scope)

MARC 21 / Z39.50 / SIP2 / RFID interoperability · multi-tenant SaaS · payment gateway integration · native mobile app · LLM-based recommendations.
