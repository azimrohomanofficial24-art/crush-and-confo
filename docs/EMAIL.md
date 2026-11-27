# Email — Resend (dev mode only)

## Current state: dev mode

Email is implemented with Resend, but **no real key is configured anywhere**
and no email is actually sent. In local dev (`RESEND_DEV_MODE=true`,
`RESEND_API_KEY` empty) the mailer logs verification / password-reset messages
instead of sending them — see `apps/worker/src/lib/mailer.ts`.

This is deliberate: the project must not send real email until a sending domain
is verified (below). Dev-mode behaviour is documented in the README and in
`docs/STATUS.md`; no user-facing flow pretends an email was delivered.

## What uses email

- `POST /api/auth/verify-email` — single-use expiring verification token
  (`email_verifications` table, token hash stored, never the raw token).
- `POST /api/auth/forgot-password` / `POST /api/auth/reset-password` —
  single-use expiring reset token (`password_resets` table).
- `EMAIL_FROM` is `Crush and Confo <noreply@example.com>` in dev — a
  placeholder, not a real mailbox.

## Production setup (required before real sending)

1. Create a Resend account at https://resend.com (free tier is enough to start).
2. **Verify a sending domain** (Resend Dashboard → Domains → Add Domain):
   add the DNS records Resend shows (SPF, DKIM, DMARC) at the domain's DNS
   provider. Verification is what allows sending from your own domain instead
   of Resend's sandbox; the sandbox only delivers to the account owner's own
   address, which is why this step blocks production email.
3. Create an API key (Resend Dashboard → API Keys) with sending permission.
4. Set it as a Worker secret — **never in git, never in `.env`**:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
5. Set the sender to an address on the verified domain, e.g.
   `Crush and Confo <noreply@<your-domain>>` — update `EMAIL_FROM` in
   `wrangler.jsonc` (`vars` / `env.production.vars`) and redeploy.
6. Set `RESEND_DEV_MODE=false` for production (`env.production.vars` in
   `wrangler.jsonc` already does this).
7. Test end-to-end on the deployed site: register a test account, confirm the
   verification email arrives, and test forgot-password. Then delete the test
   account.

## Local testing without Resend

With dev mode on, run the flows locally and read the logged message (token /
link) from the worker dev server output. That is the supported way to test
verify-email and password-reset before the domain is verified.

## Secrets hygiene

- `.env.example` contains only the placeholder names (`RESEND_API_KEY=`,
  `EMAIL_FROM=…`); `.env` is gitignored.
- Rotate the Resend key if it is ever exposed; delete it from Resend and
  create a new one, then `wrangler secret put RESEND_API_KEY` again.
