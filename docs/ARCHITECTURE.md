# Architecture — Crush and Confo

## Overview

```
Browser (React + Vite, http://localhost:5173)
   │  /api/* proxied to the worker dev server
   ▼
Worker dev server (Hono on Node, apps/worker/src/server.ts, :8787)
   │  local SQLite file (better-sqlite3 via Drizzle) — NOT live D1
   ▼
Cloudflare Workers (production, wrangler.jsonc)
   ├─ D1  crush-and-confo-db        (binding DB)
   ├─ R2  crush-and-confo-uploads   (binding UPLOADS)
   ├─ KV  crush-and-confo-kv        (binding CACHE)
   └─ DO  ChatRoom                  (binding CHAT_ROOM)
```

The web app is served as static assets by the Worker (`assets.directory:
./apps/web/dist`, SPA fallback) in production; locally Vite serves it and
proxies `/api` to the Node dev server.

## Frontend — `apps/web`

- React 18 + TypeScript + Vite + Tailwind CSS (tokens in `tailwind.config.js`:
  bg `#F7F5FF`, pink `#F52D91`, purple `#873BFA`, lavender `#E9DFFF`, navy
  `#17142C`, ink `#211B3B`, muted `#77728C`, success/warning/error).
  Shared component classes (`.glass`, `.btn-gradient`, `.input`, …) live in
  `src/index.css`.
- Routing: React Router. Public pages (`/`, `/explore`, `/matching`,
  `/confessions`, `/community`, `/messages`, `/notifications`,
  `/profile/:username`, `/about`, `/contact`, `/privacy`, `/terms`,
  `/guidelines`, `/safety`, `/login`, `/register`, …) plus protected pages.
  **Admin routes are not wired into the main router yet** — Agent A owns
  `src/main.tsx` / `src/App.tsx` (missing as of 2026-11-27); the admin route
  table is exported from `src/pages/admin/index.ts` (`adminRoutes`) for them
  to mount.
- Data: `src/lib/api.ts` (fetch client) + TanStack Query; `src/lib/auth.tsx`
  (session); `src/lib/demoData.ts` (clearly-labelled local fallback data used
  while the API is unavailable).
- **Admin UI** (`src/pages/admin/**`, `src/components/admin/**`, Agent C):
  self-contained pages that only import from inside the admin folders, plus
  `react`, `react-router-dom` and `lucide-react`. Each page guards itself:
  `useAdminGuard` verifies `GET /api/admin/me` before rendering; `useAdminData`
  fetches with loading skeletons, empty states, and error-with-retry; on
  401/403 it redirects to `/admin/login?next=…&reason=…` and renders nothing.
  Admin pages call the real `/api/admin/*` endpoints (see `docs/API.md`) and
  state plainly where the backend does not yet expose data (announcements,
  ban, admin post list, stats breakdowns) instead of inventing it.

## Backend — `apps/worker`

- Hono app (`src/app.ts`): mounts route modules under `/api/*`, CORS with
  credentials, `{ ok, data }` / `{ ok: false, error }` envelope
  (`src/lib/errors.ts`), global 404 + error handler.
- Entry points: `src/server.ts` (Node dev server via `@hono/node-server`,
  `tsx watch`), `src/index.ts` (Workers entry; routes `/api/chat/*` WebSocket
  upgrades to the `ChatRoom` Durable Object, 503 if unbound).
- Auth (`src/auth/`): Argon2id password hashing (`argon2` in Node dev; a
  WebCrypto-compatible fallback is documented for Workers — see
  `docs/SECURITY.md`), HttpOnly session cookies (`session.ts`), `requireAuth` /
  `requireAdmin` / `optionalAuth` middleware. Admin sessions are separate:
  cookie subject `admin:<id>` against the `admin_users` table.
- Matching (`src/matching/score.ts`): transparent score — shared interests
  10 pts each (max 40), same city 25 / same country 12, age proximity
  20/15/8/0 by band, same intention 15; max 100; `SCORE_NOTE` states it is not
  scientifically validated. `ageFromDob` is shared by registration (18+).
- Validation (`packages/validation/src/index.ts`): Zod schemas for register,
  login, profiles, preferences, posts, comments, confessions, messages, likes,
  reports, blocks, admin login, pagination, discover query.
- DB (`src/db/`): Drizzle ORM over D1 (production) / better-sqlite3 (local).
  `schema.ts` defines all 25 CONTRACT tables with FKs, unique indexes
  (likes pair, matches pair, follows pair, blocks pair, …) and status indexes.
  `migrate.ts` applies `migrations/*.sql`; `seed-data.ts` builds demo content.
- Chat (`src/do/ChatRoom.ts`): Durable Object for typing indicators and
  presence; local dev falls back to polling (`GET /conversations/:id/poll`).
- Email (`src/lib/mailer.ts`): Resend in dev mode — messages are logged, not
  sent (see `docs/EMAIL.md`).
- Rate limiting (`src/lib/rate-limit.ts`): KV-backed in production, in-memory
  fallback locally.

## Database — 25 tables

`users, profiles, user_preferences, interests, user_interests, likes, matches,
conversations, conversation_members, messages, posts, post_likes, comments,
follows, confessions, confession_likes, notifications, reports, blocks,
saved_posts, email_verifications, password_resets, admin_users, audit_logs,
platform_settings` — see `apps/worker/src/db/schema.ts` and
`migrations/0001_initial.sql`. Timestamps are integer ms since epoch; ids are
UUID text. `confessions.author_id` is kept server-side for admin investigation
and is never returned by public endpoints.

## Key flows

- **Registration:** `POST /api/auth/register` → Zod validate → 18+ check from
  DOB → Argon2id hash → user + profile rows → single-use expiring email
  verification token (dev mode: logged).
- **Matching:** `GET /api/matching/discover` filters to active, non-self,
  not-yet-liked/passed, unblocked, unmatched candidates, scores each with
  `computeMatchScore`, returns score + breakdown. Mutual likes create a match
  and a conversation; chat is match-gated.
- **Confession:** `POST /api/confessions` (anonymous flag) → public list never
  includes `authorId`; admin list does (investigation only); admin hide sets
  status `hidden`.
- **Admin action:** every admin mutation (suspend/reactivate, report resolve,
  hide, settings change) writes an `audit_logs` row with admin id, action,
  target and details.

## Testing

- Vitest unit tests in `tests/` import the real worker matching module and the
  real Zod schemas (see `tests/README.md`).
- Playwright smoke test (`tests/smoke.spec.ts`): home page at 375px and
  1280px, asserts no horizontal overflow; skipped unless
  `PLAYWRIGHT_RUN_SMOKE=1` with the dev server running.
- CI (`.github/workflows/ci.yml`): install → typecheck → build → Vitest.

## Deployment

Workers + Static Assets, one `wrangler deploy` (see `docs/DEPLOYMENT.md`).
Bindings in `wrangler.jsonc`: D1 `DB`, R2 `UPLOADS`, KV `CACHE`, DO
`CHAT_ROOM` (class `ChatRoom`). Secrets via `wrangler secret put`, never in git.
Deploy workflow is manual (`workflow_dispatch`) only.
