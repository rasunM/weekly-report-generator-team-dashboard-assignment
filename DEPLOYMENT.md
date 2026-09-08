# Deployment Guide — Backend on Render, Frontend on Vercel

This guide walks through putting your **backend** (`backend/`) on Render with a managed Postgres database, and your **frontend** (`frontend/`) on Vercel. Both platforms deploy straight from your GitHub repo (`weekly-report-generator-team-dashboard`), so once this is set up, a `git push` to `main` redeploys both automatically.

Do the backend first — the frontend needs the backend's URL to talk to it.

---

## Part 1: Backend on Render

### 1. Create the Postgres database

1. Go to [render.com](https://render.com) and sign in (GitHub sign-in is easiest).
2. Click **New +** → **PostgreSQL**.
3. Give it a name (e.g. `weekly-reports-db`), pick the free plan (or a paid one if you want it to last past 30 days — the free Postgres instance expires after 30 days), pick a region close to you, and click **Create Database**.
4. Once it's ready, open the database page and copy the **Internal Database URL**. You'll need it in step 2. (Use the *Internal* one, not the External one — it's faster and free because it stays inside Render's network, and your web service will be in the same region.)

### 2. Create the web service

1. Click **New +** → **Web Service**.
2. Connect your GitHub account if you haven't, and select the `weekly-report-generator-team-dashboard` repo.
3. Fill in the settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run prisma:generate && npm run build`
   - **Start Command:** `npm run prisma:migrate:deploy && npm start`
   - **Instance Type:** Free is fine to start (it spins down after inactivity and takes ~30–60s to wake back up — a paid instance avoids that if it matters for your use case)

   > The start command runs `prisma migrate deploy` (applies your database migrations) every time the service starts, then starts the server. That's what turns your empty Postgres database into one with all your tables. It's safe to run repeatedly — it only applies migrations that haven't run yet.

4. Add the environment variables (**Environment** tab → **Add Environment Variable**):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Internal Database URL you copied in step 1 |
   | `JWT_ACCESS_SECRET` | a long random string (see below) |
   | `JWT_REFRESH_SECRET` | a different long random string |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL — leave a placeholder like `https://placeholder.vercel.app` for now, you'll fix this in Part 3 |

   To generate a secret, run this on your own machine and paste the result in:
   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Do this twice — once for each of `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Never reuse the `dev-access-secret-change-me` values from `.env.example`.

   > You don't need to set `PORT` — Render sets it automatically and your app already reads `process.env.PORT`.

5. Click **Create Web Service**. Render will build and deploy. Watch the **Logs** tab — you should see `prisma migrate deploy` apply your migration, then `API listening on http://localhost:<port>`.

6. Once it's live, copy the service URL Render gives you, e.g. `https://weekly-reports-api.onrender.com`. Test it by visiting `https://weekly-reports-api.onrender.com/health` in your browser — you should see `{"status":"ok"}`.

Your backend's actual API base is that URL plus `/api`, e.g. `https://weekly-reports-api.onrender.com/api` — that's what the frontend will call.

---

## Part 2: Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** → **Project**, and import the same `weekly-report-generator-team-dashboard` repo.
3. In the import settings:
   - **Root Directory:** click **Edit** and set it to `frontend`
   - Vercel will auto-detect Next.js — leave the build/output settings as default.
4. Expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://weekly-reports-api.onrender.com/api` (your Render URL from Part 1, step 6, with `/api` on the end) |

   > `NEXT_PUBLIC_` variables get baked into the frontend at build time, so if you ever change this later you'll need to redeploy for it to take effect (Vercel's "Redeploy" button, no code change needed).

5. Click **Deploy**. Vercel builds and gives you a URL like `https://weekly-report-generator-team-dashboard.vercel.app`.

---

## Part 3: Connect them (fix CORS)

Your backend needs to know it's allowed to accept requests from your Vercel URL.

1. Copy your actual Vercel URL from the deployment you just did.
2. Go back to Render → your web service → **Environment** tab.
3. Update `CORS_ORIGIN` to your real Vercel URL, e.g.:
   ```
   https://weekly-report-generator-team-dashboard.vercel.app
   ```
   No trailing slash. If you also want to allow a custom domain later, you can list multiple origins separated by commas — your backend already supports that (`CORS_ORIGIN` is split on commas).
4. Save — Render will automatically redeploy the backend with the new value.

---

## Part 4: Verify it all works

1. Visit your Vercel URL.
2. Try registering a user and logging in.
3. Open your browser's dev tools → Network tab, and confirm requests are going to your Render `/api` URL and succeeding (not blocked by CORS, not 500 errors).
4. If something's wrong, check:
   - **Render → Logs** for backend errors
   - **Browser console** for CORS errors (usually means `CORS_ORIGIN` on Render doesn't exactly match your Vercel URL)
   - **Vercel → Deployments → your deployment → Environment Variables** to confirm `NEXT_PUBLIC_API_URL` is set correctly (and redeploy if you changed it)

---

## Quick reference: which env vars go where

**Render (backend) — Environment tab:**
```
DATABASE_URL=<Render Postgres Internal Database URL>
JWT_ACCESS_SECRET=<random secret>
JWT_REFRESH_SECRET=<random secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
```

**Vercel (frontend) — Project Settings → Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

Neither of these ever needs to go in your git repo — they live only in each platform's dashboard, which is exactly why `.env` and `.env.local` are in your `.gitignore`.

---

## Notes on the free tiers

- **Render free web service:** spins down after 15 minutes of no traffic, and takes 30–60 seconds to wake up on the next request. Fine for a demo/assignment; annoying for real users. Upgrade to a paid instance ($7/mo at time of writing) to keep it always on.
- **Render free Postgres:** expires 30 days after creation, then you must upgrade to a paid plan to keep the data. Worth knowing before you rely on it long-term.
- **Vercel free (Hobby) plan:** no time limits for a project like this — fine to leave running indefinitely.

---

## Ongoing deploys

Once this is set up, both platforms auto-deploy from `main`:
- `git push` → Render rebuilds the backend and reruns `prisma migrate deploy` (so new migrations apply automatically)
- `git push` → Vercel rebuilds the frontend

If you only changed frontend code, Render won't need to redeploy (and vice versa) — both platforms watch the whole repo but only redeploy when their `Root Directory` folder actually changed, so unrelated pushes don't waste a build.

Sources:
- [How to deploy a Node.js and PostgreSQL App on Render](https://mattermost.com/blog/deploy-nodejs-app-on-render/)
- [Environment variables — Vercel Docs](https://vercel.com/docs/environment-variables)
