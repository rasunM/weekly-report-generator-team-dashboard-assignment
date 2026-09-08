# Testing the API with Postman

## Database used, and how it connects to the backend

The backend uses **PostgreSQL**, accessed through **Prisma** (the ORM/query builder configured in
`prisma/schema.prisma`). There is no separate "database server" you run by hand — the connection is
entirely driven by one environment variable:

```
DATABASE_URL="postgresql://report_app:report_app_password@127.0.0.1:5433/weekly_reports?schema=public"
```

This lives in `backend/.env` (copy it from `.env.example` if you haven't already) and is read once
at startup by `src/config/env.ts`, then handed to Prisma's client (`src/common/prisma.ts`). Nothing
else in the code talks to Postgres directly - every module goes through that one shared
`PrismaClient` instance.

`docker-compose.yml` in the `backend` folder starts a real Postgres 16 container that already
matches this connection string (user `report_app`, password `report_app_password`, database
`weekly_reports`, published on host port `5433` - deliberately not Postgres's default `5432`, to
avoid colliding with any other Postgres already running on your machine) - so as long as that
container is running, `DATABASE_URL` above will work with zero changes.

## 1. Start the database and backend

From the `backend` folder:

```bash
npm install                 # once
cp .env.example .env        # once - already matches docker-compose.yml's defaults
docker compose up -d        # starts Postgres in the background
npx prisma migrate dev      # creates all tables (also generates the Prisma client)
npm run seed                # loads demo users/projects/reports
npm run dev                 # starts the API on http://localhost:4000
```

Confirm it's up: open `http://localhost:4000/health` in a browser, or `curl http://localhost:4000/health` - you should see `{"status":"ok"}`.

## 2. Import the Postman collection

1. Open Postman → **Import** (top-left) → select `backend/postman/Weekly-Reports.postman_collection.json`.
2. That's it - no separate environment file needed. The collection carries its own variables
   (`baseUrl`, `accessToken`, etc.), editable via the collection's **Variables** tab if you ever need
   to point `baseUrl` somewhere other than `http://localhost:4000/api` (e.g. a deployed instance).

## 3. Log in

Open the **Auth** folder and run **Login - Manager (seeded)** (or **Login - Member (seeded)**) - both
already have the seeded demo credentials filled in (`manager@example.com` / `Password123!`, etc. -
see the full list in `backend/README.md` section 6).

Each login request's **Tests** tab runs a small script that automatically saves the returned
`accessToken`/`refreshToken`/`userId` into the collection's variables. Every other request in the
collection is set to send `Authorization: Bearer {{accessToken}}` automatically (set once at the
collection level, under its own **Authorization** tab) - so once you've logged in, you can run *any*
other request with no extra setup.

To switch roles mid-testing (e.g. to see a manager-only route reject a member), just run the other
Login request - it overwrites `accessToken` with that user's token.

## 4. Suggested run order

The requests are grouped to match how you'd naturally exercise the app, and several of them
auto-save an id you'll need later (via their **Tests** script) - `reportId`, `projectId`,
`otherUserId`:

1. **Auth → Login - Member (seeded)**
2. **Reports → Create Report (member)** → saves `reportId`
3. **Reports → Get Report By Id**
4. **Reports → Submit Report (member)**
5. **Auth → Login - Manager (seeded)** (switch roles)
6. **Reports → List Reports (own history / team list)** - now returns the whole team's reports
7. **Review → Request Changes (manager)** - report goes to `NEEDS_CORRECTION`
8. **Auth → Login - Member (seeded)** (switch back)
9. **Reports → Update Report** - this creates a **new version** (check `versionHistory` in the response)
10. **Reports → Submit Report (member)** again
11. **Auth → Login - Manager (seeded)**
12. **Review → Approve (manager)** → report is now `APPROVED`
13. **Review → Review History** - both comments, each tied to the version it was made against
14. **Dashboard → Summary / Tasks Completed Trend / Status By Member / etc.**

For **Users** and **Projects**, run **Invite User (manager)** or **Create Project (manager)** first -
they save `otherUserId` / `projectId` for the requests below them in that folder.

## 5. Seeing RBAC actually reject something

This is the fastest way to confirm the access-control rules work, right inside Postman:

- Log in as a **member**, then run any request under **Dashboard** or **Users → List Users** → expect `403 Forbidden`.
- Log in as **Member A** (`liam@example.com`), create a report, note its id. Log in as a *different*
  member (`sofia@example.com`), then `GET /reports/{{reportId}}` using Liam's report id pasted in
  manually → expect `403 Forbidden`. (The collection's `reportId` variable will have overwritten
  itself if you created a report as Sofia too - just paste the specific id you want to test into the
  request URL for this check.)
- Log in as a **manager**, run `POST /reports` (Create Report) → expect `403 Forbidden` (managers
  never write report content).

## 6. If something returns 401/403/500 unexpectedly

- **401** on everything: your `accessToken` variable is empty or expired (access tokens expire in
  15 minutes by default - `JWT_ACCESS_EXPIRES_IN` in `.env`). Run a Login request again, or run
  **Auth → Refresh**.
- **403** on a request you expected to work: check which role you're logged in as (the last Login
  request you ran) - most routes are role- and/or ownership-restricted on purpose; see the table in
  `backend/README.md` section 10.
- **500**: check the terminal running `npm run dev` for the real stack trace - the API only ever
  returns a generic message to the client on purpose (see `src/common/middleware/error.middleware.ts`).
