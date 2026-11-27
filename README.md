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
- **Status:** local build in progress. No GitHub repo and no live deployment
  exist yet — see [docs/STATUS.md](docs/STATUS.md) for the exact remaining steps.

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
migrations/          D1/SQLite migrations (0001_initial.sql)
scripts/             Seed scripts (demo data + first admin)
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

### Seed demo data + first admin

```bash
npm run seed          # demo users (John Bay @john_bay, Samiya, 19, Dhaka),
                      # sample confessions / posts / matches / messages / notifications
npm run seed:admin    # creates the FIRST admin account.
                      # Prints a ONE-TIME password to the terminal only.
                      # Usage: npm run seed:admin -- admin@example.com "Admin Name"
                      # There is NO public admin registration form.
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

- Admin: the backend does not yet expose announcements, a ban endpoint, an
  admin post list, or stats breakdowns (active/verified/suspended users,
  matches, messages). The admin UI shows those gaps honestly instead of
  inventing data — details in [docs/STATUS.md](docs/STATUS.md).
- Email is dev-mode only until a Resend domain is verified.
- The first deployment uses a free Cloudflare address; custom domain comes later.
- `apps/web` has no `src/main.tsx` / `src/App.tsx` yet (Agent A, in progress),
  so `npm run build` for the web workspace cannot succeed until that lands.
