# Crush and Confo — Confess. Connect. Match.

A social + confession + matching web platform. Matching is **one part** of the
site, not the whole site: users also post, confess (anonymously or publicly),
join the community, message mutual matches, and get notified.

- **Tagline:** Confess. Connect. Match.
- **Design:** Premium White Glassmorphism — frosted glass cards, pink
  (#F52D91) → purple (#873BFA) gradient buttons, lavender (#E9DFFF) accents,
  deep navy (#17142C) type on a #F7F5FF background. See
  `docs/design-references/reference-a-white-glass-dashboard.png`.
- **Strictly 18+.** Age is calculated server-side from date of birth;
  registration is rejected if under 18.
- **Status:** live at **https://crush-and-confo.crush-and-confo.workers.dev**
  (deployed 2026-11-27, D1/R2/KV live; production database is fresh and empty —
  **no demo data anywhere**). GitHub:
  [azimrohomanofficial24-art/crush-and-confo](https://github.com/azimrohomanofficial24-art/crush-and-confo)
  (public). The 2026-11-27 no-demo-data + photo-led Discover refactor is built
  and tested locally and is **not yet redeployed** — see
  [docs/STATUS.md](docs/STATUS.md) for what is live vs. pending.

## Stack

| Layer | Tech |
|---|---|
| Frontend | TypeScript, React 18, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod, Framer Motion, Lucide React |
| Backend | TypeScript, Hono on Cloudflare Workers (Node dev server for local work) |
| Database | Cloudflare D1 / SQLite, Drizzle ORM, versioned SQL in `migrations/` |
| Storage | R2 (uploads), KV (cache / rate limits), Durable Objects (`ChatRoom` for chat) |
| Email | Resend — **dev mode only** until a domain is verified (see `docs/EMAIL.md`) |
| Tests | Vitest (unit) + Playwright (responsive smoke) |

## Project layout

```
apps/web/            Frontend (Vite + React). Admin UI: src/pages/admin/**, src/components/admin/**
apps/worker/         Backend (Hono). Routes in src/routes/, DB in src/db/, matching in src/matching/
packages/shared/     Shared types
packages/validation/ Zod schemas (registration, posts, confessions, admin login, …)
migrations/          D1/SQLite migrations (0001_initial.sql, 0002_announcements.sql)
scripts/             Seed scripts — LOCAL DEV ONLY (demo users + first admin).
                     Never seed demo users into the remote/production database.
tests/               Vitest unit tests + Playwright smoke test
docs/                Architecture, API, deployment, email, security, status
wrangler.jsonc       Cloudflare Workers + Static Assets config (D1/R2/KV/DO bindings)
```

## Local setup

Requirements: Node.js 20+.

```bash
git clone <repo-url>        # after the GitHub publish step in docs/STATUS.md
cd crush-and-confo
cp .env.example .env        # placeholders only — never commit .env
npm install
```

### Run (two terminals)

```bash
# Terminal 1 — web (Vite, http://localhost:5173, proxies /api to the worker)
npm run dev

# Terminal 2 — worker dev server (Hono on Node, local SQLite file, NOT live D1)
npm run dev:worker
```

### Seed data (local dev only) + first admin

```bash
npm run seed          # LOCAL DEV ONLY: demo users, sample confessions / posts /
                      # matches / messages / notifications, into the LOCAL SQLite
                      # file. NEVER run against the remote D1 database — the
                      # live site must stay fresh with no demo data.
npm run seed:admin    # creates the FIRST admin account.
                      # Prints a ONE-TIME password to the terminal only.
                      # Usage: npm run seed:admin -- admin@example.com "Admin Name"
                      # There is NO public admin registration form.
                      # For the LIVE site, run this against the remote DB only
                      # when the admin account is needed (see docs/STATUS.md).
```

Admin login lives at `/admin/login` (separate from user login). The admin
console is at `/admin` (dashboard, users, moderation, reports, announcements,
settings, audit logs). Admin pages refuse to render admin data on 401/403 and
redirect to `/admin/login`.

### Tests

```bash
npm test              # Vitest unit tests (matching score + validation schemas)
PLAYWRIGHT_RUN_SMOKE=1 npx playwright test --config tests/playwright.config.ts
                      # responsive smoke test (375px + 1280px, no horizontal
                      # overflow); needs `npm run dev` running first
```

### Build / typecheck

```bash
npm run build
npm run typecheck
```

## Deployment (Cloudflare Free tier)

Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Summary:

```bash
# 1. Create the Cloudflare resources (once)
wrangler d1 create crush-and-confo-db
wrangler r2 bucket create crush-and-confo-uploads
wrangler kv namespace create crush-and-confo-kv
# 2. Paste the returned D1 database_id / KV namespace id into wrangler.jsonc
# 3. Set production secrets (never in git)
wrangler secret put SESSION_SECRET
wrangler secret put RESEND_API_KEY   # only after domain verification, see docs/EMAIL.md
# 4. Migrate + deploy
npm run db:migrate:remote
npm run deploy
```

Deployment is manual only (GitHub Actions `deploy.yml` is `workflow_dispatch`).
A custom domain is a **later** step — the first deployment uses a free
`*.workers.dev` / `*.pages.dev` address.

## Match score — transparent, not scientific

Match % is a transparent heuristic: shared interests (10 pts each, max 40),
same city 25 / same country 12, age proximity (≤2y: 20, ≤5y: 15, ≤10y: 8, else 0),
same intention 15 — total max 100. The breakdown is returned with every discover
result. **It is not scientifically validated**, and the UI and API docs say so.
Chat opens only after a mutual match; no self-likes, no duplicate likes/matches,
blocked/suspended users are excluded.

## Email

Resend runs in **dev mode** locally: verification / reset emails are logged,
not sent. Production sending requires a verified sending domain — see
[docs/EMAIL.md](docs/EMAIL.md). No real API keys are in this repo.

## Security

See [docs/SECURITY.md](docs/SECURITY.md): Argon2id passwords (WebCrypto fallback
documented for Workers), HttpOnly session cookies, server-side 18+ check,
rate limiting, role-checked admin routes with audit logs, anonymous confessions
never expose the author in public interfaces.

## Known limitations

- **No demo data, by design.** The live site shows only real user content.
  Empty states are honest ("No posts yet", "No matches yet"). The local seed
  scripts are for local development only.
- Email is dev-mode only until a Resend domain is verified.
- The first deployment uses a free Cloudflare address; custom domain comes later.
- Profile photos upload to R2 and are served by the Worker
  (`POST /api/uploads/avatar`, `GET /api/uploads/:key`). Photo upload on
  *posts* is not built yet — the Create Post Photo button was removed rather
  than left fake.
- Premium / payments are not built — there is no Premium upsell anywhere in
  the UI (no checkout, no paid features).
- Playwright smoke test has not run yet (no browser binary in this environment).
- The 2026-11-27 refactor (this repo state) is not yet redeployed or pushed to
  GitHub — see [docs/STATUS.md](docs/STATUS.md).
