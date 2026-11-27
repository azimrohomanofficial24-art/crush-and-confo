# Deployment — Crush and Confo (Cloudflare Free tier)

No live deployment exists yet. This document is the exact procedure to do the
first one. Nothing here has been run against a live Cloudflare account.

## 0. Prerequisites

- A Cloudflare account (free tier is enough).
- `wrangler` (installed as a devDependency; run via `npx wrangler`).
- The GitHub publish step done first (see `docs/STATUS.md`) — deployment does
  not depend on GitHub, but keeping the code in the repo first is the plan.
- No secrets in git, ever. Production secrets go in via `wrangler secret put`
  (Worker secrets) and GitHub Actions secrets (CI/CD).

## 1. Log in and create the resources (once)

```bash
npx wrangler login
npx wrangler d1 create crush-and-confo-db
npx wrangler r2 bucket create crush-and-confo-uploads
npx wrangler kv namespace create crush-and-confo-kv
```

Each command prints an id. Paste them into `wrangler.jsonc`, replacing:

- `REPLACE_WITH_D1_DATABASE_ID` → the D1 `database_id`
- `REPLACE_WITH_KV_NAMESPACE_ID` → the KV namespace `id`

Names are fixed by the contract: database `crush-and-confo-db`, bucket
`crush-and-confo-uploads`, namespace `crush-and-confo-kv`, Durable Object
class `ChatRoom` (binding `CHAT_ROOM`). The DO class is exported from
`apps/worker/src/index.ts`; no separate creation step is needed beyond the
`durable_objects` + `migrations` entries already in `wrangler.jsonc`.

## 2. Set production secrets

```bash
npx wrangler secret put SESSION_SECRET
# paste a random 32-byte hex secret (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

npx wrangler secret put RESEND_API_KEY
# ONLY after the Resend domain is verified — see docs/EMAIL.md.
# Until then, leave RESEND_DEV_MODE=true behaviour (emails logged, not sent).
```

Also confirm `wrangler.jsonc` → `env.production.vars.APP_URL` matches the
address Cloudflare gives you (initially a free `*.workers.dev` /
`*.pages.dev` address).

## 3. Migrate the database and deploy

```bash
npm run build
npm run db:migrate:remote   # wrangler d1 migrations apply crush-and-confo-db --remote
npm run deploy              # npm run build && wrangler deploy
```

`wrangler.jsonc` serves the Vite build (`apps/web/dist`) as static assets with
SPA fallback and routes `/api/*` to the Worker. Verify afterwards:

```bash
curl https://<your-address>/api/health
# {"ok":true,"data":{"status":"ok","service":"crush-and-confo","time":...}}
```

## 4. First admin (production)

Run the seed against the remote database (or create the admin via a one-off
local run pointed at the remote D1 — do not paste the one-time password
anywhere except a password manager):

```bash
npm run seed:admin -- admin@example.com "Admin Name"
# prints a ONE-TIME password to the terminal only — save it immediately
```

Then sign in at `https://<your-address>/admin/login`.

## 5. GitHub Actions deploy (manual only)

`.github/workflows/deploy.yml` runs only on `workflow_dispatch` (a human
triggers it in the Actions tab). Before the first run, set these repo secrets
(Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` — API token with Workers + D1 + R2 + Pages
  permissions (create at https://dash.cloudflare.com/profile/api-tokens)
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard

The workflow builds, applies remote D1 migrations, then `wrangler deploy --env
production`. It never contains a token itself.

## 6. Custom domain (later step)

The domain has not been bought yet. When it is:

1. Buy the domain, add it in Cloudflare Dashboard → Workers & Pages →
   `crush-and-confo` → Custom Domains (or Pages → Custom domains).
2. Update `wrangler.jsonc` → `env.production.vars.APP_URL` to the new domain.
3. Update Resend verified domain to match (docs/EMAIL.md) and re-deploy.
4. Verify `/api/health` and `/admin/login` on the new domain.

## 7. Rollback / troubleshooting

- `npx wrangler deployments list` / `npx wrangler rollback` — roll back a bad Worker deploy.
- `npx wrangler d1 migrations apply crush-and-confo-db --remote` — re-apply migrations (they are versioned; already-applied ones are skipped).
- `npx wrangler tail` — live Worker logs.
- Local dev never touches live D1: the worker dev server uses a local SQLite
  file (`DATABASE_URL=file:./.dev.db` in `.env`), and `npm run db:migrate:local`
  targets `--local`.
