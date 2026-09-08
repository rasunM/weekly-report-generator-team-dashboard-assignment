# Weekly Report Generator & Team Dashboard — Backend

Express + TypeScript + Prisma + PostgreSQL backend for the "Weekly Report Generator & Team
Dashboard" technical assignment.

This follows the module boundaries, database schema, and review-workflow design from
`architecture-plan.md`, implemented in **Express** (per request) rather than the plan's original
NestJS suggestion — the "modular monolith" structure (independent modules, each owning its own
routes/controller/service, no cross-module DB access) is preserved, just without NestJS's DI
container/decorators.

## 1. Prerequisites

- Node.js 20+
- Docker (for the easiest way to run PostgreSQL) — or a local PostgreSQL 16 instance if you'd rather not use Docker

## 2. Install dependencies

```bash
cd backend
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

The defaults in `.env.example` already match the `docker-compose.yml` Postgres service below, so
for local dev you usually don't need to change anything except the JWT secrets if you want them to
be non-default.

## 4. Run the database

**Option A — Docker (recommended, one command):**

```bash
docker compose up -d
```

This starts Postgres, published on the **host port `5433`** (mapped to the container's internal
`5432`) with a `weekly_reports` database owned by the `report_app` user — matching `DATABASE_URL` in
`.env.example`. Host port 5433 (not Postgres's default 5432) is deliberate: it avoids colliding with
anything else already listening on 5432 on your machine, which is a common source of a confusing
`P1000: Authentication failed` error that has nothing to do with your actual password (see
troubleshooting below). Give it a couple of seconds to finish starting before running migrations.

If you also want to run the automated test suite (section 8b), create its separate
`weekly_reports_test` database once:

```bash
docker exec -it weekly-reports-postgres psql -U report_app -d weekly_reports -c "CREATE DATABASE weekly_reports_test OWNER report_app;"
```

**Option B — a local PostgreSQL install:** create a database and update `DATABASE_URL` in `.env` to
point at it (and optionally create a second database for `TEST_DATABASE_URL`).

**Troubleshooting: `P1000: Authentication failed`.** There are two distinct causes, worth checking in
this order:

1. **First-run timing.** Postgres hadn't fully finished its first-time initialization yet when the
   next command ran (the process starts almost instantly, but creating the `report_app` role/database
   takes a few seconds longer on the very first run against a fresh volume). Wait ~10-15 seconds and
   retry. Confirm it's actually healthy first: `docker ps` should show `weekly-reports-postgres` as
   `(healthy)`, not `(starting)`/`(unhealthy)`, and `docker logs weekly-reports-postgres` should end
   with `database system is ready to accept connections`. If the volume got into a bad state, wipe and
   restart clean: `docker compose down -v` then `docker compose up -d`.

2. **Port collision with something else on your machine (the more common cause on Windows).** If the
   container is healthy, its logs are clean, and `docker exec -it weekly-reports-postgres psql -U
   report_app -d weekly_reports -c "select 1"` succeeds (proving the credentials are correct
   *inside* the container) — but `npx prisma migrate dev` (running on your host) still fails the same
   way, something else on your machine is almost certainly listening on the port Prisma is actually
   connecting to. Two host processes can simultaneously bind the same port across IPv4/IPv6, so Windows
   silently routes your connection to the wrong Postgres instance (one that doesn't have the
   `report_app` role at all) instead of Docker's. Check with:

   ```powershell
   netstat -ano | findstr :5433
   ```

   This repo's `docker-compose.yml` already publishes Postgres on host port `5433` (not the Postgres
   default `5432`) specifically to sidestep this — if you still see a collision, or you changed the
   port back to `5432`, either free up the port or edit the host-side port in `docker-compose.yml`
   (`"5433:5432"` → e.g. `"5434:5432"`) and update `DATABASE_URL`/`TEST_DATABASE_URL` in `.env` to
   match. You can identify what's holding a conflicting port with
   `tasklist /svc | findstr <PID>` (the last column from `netstat`).

## 5. Run migrations

```bash
npx prisma migrate dev
```

This creates all tables from `prisma/schema.prisma` (see "Database design" below) and generates the
Prisma client. Re-run this any time the schema changes.

## 6. Seed the database

```bash
npm run seed
```

Creates 1 manager + 4 team members, 4 projects, and several weeks of reports in a realistic mix of
statuses (DRAFT, SUBMITTED, NEEDS_CORRECTION, APPROVED) — including one report that went through a
full correction cycle (rejected → edited → resubmitted → approved) so version history has real data
to show. Logins (all seeded users share one password so you can demo any role instantly):

| Role | Email | Password |
|---|---|---|
| Manager | `manager@example.com` | `Password123!` |
| Member | `liam@example.com` | `Password123!` |
| Member | `sofia@example.com` | `Password123!` |
| Member | `noah@example.com` | `Password123!` |
| Member | `maya@example.com` | `Password123!` |

`npm run seed` is destructive — it wipes existing rows first (see the comment at the top of
`prisma/seed.ts`). Re-run it any time you want a clean, known demo state.

## 7. Run the backend

```bash
npm run dev
```

Starts the API on `http://localhost:4000` (change `PORT` in `.env` if needed) with hot-reload.
`GET /health` returns `{ status: "ok" }` once it's up.

For a production-style run: `npm run build && npm start`.

---

## 8. How to test the backend/database

There are four complementary ways to verify the backend and its data, from "just look at it" to
"fully automated":

### a) Prisma Studio — visually browse/edit every table

```bash
npx prisma studio
```

Opens a local GUI at `http://localhost:5555` where you can inspect and edit every row in every
table — the fastest way to *see* that seeding worked, that a submitted report really created a new
`ReportVersion` row, that a `ReviewComment` links to the right version, etc., without writing any
SQL or API calls.

### b) The automated RBAC + workflow test suite (the assignment's "strongly recommended" bonus)

```bash
# one-time: apply the schema to the TEST database (separate from your dev data)
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy   # on Windows: set DATABASE_URL=...&& npx prisma migrate deploy

npm test
```

`tests/rbac.test.ts` spins up the Express app in-process (via Supertest — no real network port, no
manual login through curl needed) and exercises, against the real database:

- Unauthenticated requests are rejected (401)
- Manager-only endpoints (`/api/users`, `/api/dashboard/*`, `/api/review/*`) reject a MEMBER token (403)
- Member-only endpoints (creating/editing/submitting a report) reject a MANAGER token (403)
- A member can never read, edit, or submit **another** member's report (403), while a manager can
  read anyone's
- The full review cycle: create draft → submit → manager requests changes → member edits (asserts a
  **new** `ReportVersion` is created, not an overwrite) → resubmit → manager approves
- A report that isn't `SUBMITTED` rejects an approve/request-changes call (the workflow state-machine guard)
- The manager's approve/request-changes endpoints structurally cannot smuggle in report-content
  edits (extra fields sent alongside `comment` are silently dropped by validation and never persisted)

Every test hits real HTTP routes → real controllers → real services → the real (test) Postgres
database — nothing is mocked, so a pass here is a strong signal the actual API works, not just that
some function returns the right value in isolation.

### c) Postman

A ready-to-import Postman collection covering every endpoint (with login requests that
auto-save your access token) lives in `postman/Weekly-Reports.postman_collection.json` - see
`postman/POSTMAN_GUIDE.md` for the full walkthrough.

### d) Manual smoke test via curl (or Postman/Insomnia)

```bash
# Log in as the seeded manager
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","password":"Password123!"}' | jq

# Use the accessToken from the response above
export TOKEN="<accessToken>"

# List every team member's reports for review
curl -s http://localhost:4000/api/reports -H "Authorization: Bearer $TOKEN" | jq

# Dashboard summary metrics
curl -s http://localhost:4000/api/dashboard/summary -H "Authorization: Bearer $TOKEN" | jq
```

Log in as a member (e.g. `liam@example.com`) the same way to try creating/editing/submitting a
report, or to confirm a 403 when trying to hit a manager-only route with a member's token.

### e) Direct SQL, if you want to eyeball the raw rows

```bash
docker exec -it weekly-reports-postgres psql -U report_app -d weekly_reports
```

```sql
select id, "userId", status, "weekStart", "currentVersionId" from reports;
select id, "reportId", "versionNumber", "submittedAt" from report_versions order by "reportId", "versionNumber";
select action, comment, "reportVersionId" from review_comments;
```

---

## 9. Database design

See `prisma/schema.prisma` for the full annotated schema. The key design decision, in one sentence:
**`Report` is a slot for one (user, week, project); `ReportVersion` is an immutable snapshot of its
content**, and a new `ReportVersion` row is only created the moment an *already-submitted* version
gets edited again — this is what gives the "keep previous versions visible, not overwritten" bonus
requirement for free, without a separate audit-log table. `ReviewComment` always links to both the
`Report` and the exact `ReportVersion` it was made against, so it's unambiguous which version a
manager's comment refers to even after several correction cycles.

An ER diagram image (required deliverable) should be generated from this schema — e.g. via
`npx prisma-erd-generator` or by screenshotting Prisma Studio's schema view / a dbdiagram.io import
of `schema.prisma`.

## 10. API overview

All routes are prefixed with `/api` and (except `/api/auth/*` and `/health`) require
`Authorization: Bearer <accessToken>`.

| Module | Routes |
|---|---|
| `auth` | `POST /auth/register`, `/login`, `/refresh`, `/logout` |
| `users` | `GET /users/me`; manager-only: `GET /users`, `GET /users/:userId/profile`, `POST /users` (invite), `PATCH /users/:userId/role`, `DELETE /users/:userId` |
| `projects` | `GET /projects`, `GET /projects/:id` (any authenticated user); manager-only: `POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id`, `POST /projects/:id/members`, `DELETE /projects/:id/members/:userId` |
| `reports` | `GET /reports` (own history for members, filterable team-wide list for managers), `POST /reports`, `GET /reports/:id`, `GET /reports/:id/versions/:n`, `PATCH /reports/:id`, `POST /reports/:id/submit` — all member-scoped/ownership-checked except the manager's read access |
| `review` | manager-only: `POST /review/:reportId/approve`, `POST /review/:reportId/request-changes`; `GET /review/:reportId/history` (member can read their own) |
| `dashboard` | manager-only: `GET /dashboard/summary`, `/tasks-trend`, `/status-by-member`, `/workload-by-project`, `/hours-by-type`, `/activity-feed` |

Every list endpoint accepts `page`/`pageSize` query params; `reports` and `dashboard` endpoints
accept additional filters (`status`, `projectId`, `userId`, `weekStart`/`weekEnd`) per the
assignment's pagination/filtering requirement.

## 11. What's not built yet

This repository currently covers the **backend only**, per the request that produced it. Still to
do for a complete submission: the Next.js/React frontend (structure suggested in
`architecture-plan.md` section 7), the AI Chat Assistant (optional/bonus), an ER diagram export, and
wiring CI (lint + `npm test` on push).
