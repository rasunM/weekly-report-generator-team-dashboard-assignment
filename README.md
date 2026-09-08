# Weekly Report Generator & Team Dashboard

A full-stack app for submitting structured weekly work reports, running them through a
manager review/correction cycle, and giving managers a consolidated team dashboard.

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Express + TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Deployed:** frontend on Vercel, backend + database on Render

Live demo:

| | |
|---|---|
| Frontend | https://weekly-report-generator-team-dashbo-rho.vercel.app/ |
| Backend API | https://weekly-report-generator-team-dashboard-7gl8.onrender.com |
| Backend health check | https://weekly-report-generator-team-dashboard-7gl8.onrender.com/health |

Full deployment/hosting write-up: see [`DEPLOYMENT.md`](./DEPLOYMENT.md). Database design and API
reference: see [`backend/README.md`](./backend/README.md). ER diagram: [`docs/ER-Diagram.png`](./docs/ER-Diagram.png).

---

## Repository layout

```
assignment/
├── backend/     Express + TypeScript + Prisma API
├── frontend/    Next.js app
├── docs/        ER diagram, presentation
└── DEPLOYMENT.md
```

`backend/` and `frontend/` are two independent Node projects (their own `package.json`,
`node_modules`, `.gitignore`) living in one repo — there's no shared root `package.json`, so every
command below is run from inside the relevant folder.

---

## 1. Prerequisites

Install these once, before anything else:

- **Node.js 20+** and npm
- **Docker Desktop** (easiest way to run PostgreSQL locally — see step 4). A local PostgreSQL 16
  install works too if you'd rather not use Docker.
- **Git**

Verify:

```bash
node -v      # v20 or newer
docker -v    # any recent version
```

---

## 2. Installing dependencies

Both projects have their own `node_modules` — install each separately:

```bash
# Backend
cd backend
npm install

# Frontend (in a separate terminal / after cd ../frontend)
cd frontend
npm install
```

---

## 3. Running the database

The backend needs a running PostgreSQL instance before it will start.

**Option A — Docker (recommended, one command):**

```bash
cd backend
docker compose up -d
```

This starts a `postgres:16-alpine` container (`weekly-reports-postgres`) published on **host port
`5433`** — not the Postgres default `5432` — specifically to avoid colliding with any other Postgres
already running on your machine. It creates a `weekly_reports` database owned by user `report_app`,
matching the connection string already in `backend/.env.example`. Give it a few seconds to finish
starting (`docker ps` should show it as `healthy`) before running migrations.

If you also plan to run the automated test suite, create its separate test database once:

```bash
docker exec -it weekly-reports-postgres psql -U report_app -d weekly_reports \
  -c "CREATE DATABASE weekly_reports_test OWNER report_app;"
```

To stop the database later: `docker compose down` (add `-v` to also wipe its data volume).

**Option B — a local PostgreSQL install:** create a database yourself and point `DATABASE_URL` (see
next step) at it instead.

**Troubleshooting — `P1000: Authentication failed`:** almost always means something else on your
machine is already listening on port 5433 (or 5432, if you changed it back), so your connection is
silently routed to the wrong Postgres instance. Check with `netstat -ano | findstr :5433` on
Windows, or free up the port / change it in both `docker-compose.yml` and `.env`.

---

## 4. Running the backend

```bash
cd backend
cp .env.example .env
```

The defaults in `.env.example` already match the Docker Postgres from step 3, so for local dev you
typically don't need to change anything except the JWT secrets if you want non-default ones.

Apply the database schema and seed some demo data:

```bash
npx prisma migrate dev
npm run seed
```

`npm run seed` creates 1 manager + 4 team members, 4 projects, and several weeks of reports across
every status (including one that went through a full correction cycle), so the dashboard has
something real to show. It's destructive — it wipes existing rows first, so it's safe to re-run
any time you want a clean demo state.

Seeded logins (all share one password):

| Role | Email | Password |
|---|---|---|
| Manager | `manager@example.com` | `Password123!` |
| Member | `liam@example.com` | `Password123!` |
| Member | `sofia@example.com` | `Password123!` |
| Member | `noah@example.com` | `Password123!` |
| Member | `maya@example.com` | `Password123!` |

Start the API:

```bash
npm run dev
```

Runs on **http://localhost:4000** with hot-reload. Confirm it's up: `GET http://localhost:4000/health`
should return `{"status":"ok"}`.

For a production-style run instead: `npm run build && npm start`.

---

## 5. Running the frontend

In a separate terminal, with the backend already running:

```bash
cd frontend
```

Confirm `frontend/.env.local` exists with:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

(It's already checked in with this value pointing at your local backend — only change it if your
backend is running somewhere else.)

Start the dev server:

```bash
npm run dev
```

Runs on **http://localhost:3000**. Open it, log in with one of the seeded accounts above, and
you're in.

For a production-style run instead: `npm run build && npm start`.

---

## 6. Day-to-day

Once everything's set up, you only need:

```bash
# terminal 1 — database (only needed once per reboot; it keeps running in the background)
cd backend && docker compose up -d

# terminal 2
cd backend && npm run dev

# terminal 3
cd frontend && npm run dev
```

---

## 7. Testing

```bash
cd backend

# one-time: apply the schema to the separate TEST database
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy   # Windows: set DATABASE_URL=...&& npx prisma migrate deploy

npm test
```

`tests/rbac.test.ts` exercises the real Express app against the real (test) database — no mocks —
covering role-based access control (a member can never read another member's report or hit a
manager-only route) and the full review cycle (draft → submit → request changes → edit → resubmit →
approve), asserting each resubmission creates a new `ReportVersion` rather than overwriting one.

Other ways to inspect the backend/data: **Prisma Studio** (`npx prisma studio`, GUI at
`localhost:5555`), the **Postman collection** in `backend/postman/`, or `docker exec -it
weekly-reports-postgres psql -U report_app -d weekly_reports` for raw SQL. Full detail on all of
these is in [`backend/README.md`](./backend/README.md#8-how-to-test-the-backenddatabase).

---

## 8. Deploying

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full walkthrough of hosting the backend + database on
Render and the frontend on Vercel, including which environment variables go where.
