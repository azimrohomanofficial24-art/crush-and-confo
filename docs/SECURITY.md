# Security — Crush and Confo

## Authentication

- **Passwords:** Argon2id (`argon2` in the Node dev server). The Workers
  runtime cannot run the native `argon2` module, so production uses a
  WebCrypto-compatible fallback — see `apps/worker/src/auth/password.ts`
  (Agent B). Passwords are never stored in plaintext, never logged, and never
  returned by any API (admin `safeUser` strips `passwordHash`).
- **Sessions:** secure HttpOnly cookies (`apps/worker/src/auth/session.ts`).
  No tokens in localStorage. Admin sessions are separate: cookie subject
  `admin:<id>` against the `admin_users` table, checked by `requireAdmin` on
  every admin route.
- **First admin:** created only via `npm run seed:admin` (prints a one-time
  password to the terminal only). There is **no public admin registration**
  form anywhere in the app.
- **Password reset / email verification:** single-use expiring tokens; only
  token *hashes* are stored (`email_verifications`, `password_resets`).

## Age gate — strictly 18+

Age is calculated **server-side** from date of birth (`is18Plus` in
`packages/validation/src/index.ts`, `ageFromDob` in
`apps/worker/src/matching/score.ts`). Registration is rejected if under 18.
The frontend never enforces this alone with a checkbox.

## Authorization

- Chat opens only after a mutual match; conversations are match-gated.
- No self-like / self-match / self-pass (400 `invalid`); duplicate
  likes/matches are rejected (unique pair indexes in the DB).
- Blocked and suspended users are excluded from matching discovery.
- Users can only mutate their own resources (own profile, own posts /
  confessions / comments); admin routes are role-checked server-side.
- All admin mutations write an `audit_logs` row (admin id, action, target,
  details) — visible at `/admin/audit-logs`.

## Privacy

- Anonymous confessions **never expose `authorId` in public API responses**.
  The id is stored server-side so admins can investigate abuse
  (`GET /api/admin/confessions` only) — anonymous does not mean unmoderated.
- Profile privacy settings (`isPrivate`, `showAge`) are honoured by the
  profile endpoints.
- Reports and blocks are available to every user (`/api/reports`,
  `/api/blocks`).

## Abuse / rate limiting

- Rate limiting (`apps/worker/src/lib/rate-limit.ts`): KV-backed in
  production, in-memory fallback locally. Auth and write endpoints are the
  priority; tune limits in the worker if abuse appears.
- Content moderation: admin moderation queue (`/admin/moderation`), reports
  queue (`/admin/reports`), suspend/reactivate (`/admin/users`), hide for
  confessions and posts.

## Secrets & data handling

- No real secrets in this repo: `.env.example` is placeholders only; `.env`
  is gitignored; production secrets live in `wrangler secret put` and GitHub
  Actions secrets. CI (`ci.yml`) never prints secrets.
- Uploads go to R2 (`crush-and-confo-uploads`); no user content is stored in
  git.
- Account deletion (`DELETE /api/auth/me`) removes the account; related rows
  cascade via FKs where defined.
- Local dev uses a local SQLite file, never the live D1.

## Known gaps (to fix, not to hide)

- The admin UI notes backend gaps honestly (no announcements endpoint, no ban
  endpoint, no admin post list, no stats breakdowns) — see `docs/STATUS.md`.
  Those are missing *features*, not silent failures.
- Resend is dev-mode only until a domain is verified (docs/EMAIL.md) — no
  production email until then.
- A full security review (dependency audit, CSP headers, upload validation)
  has not been run yet; run `npm audit` and add security headers before
  announcing the public launch.
