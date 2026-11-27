import { Hono } from 'hono';
import { eq, or, and, gt, isNull } from 'drizzle-orm';
import { users, profiles, userPreferences, emailVerifications, passwordResets } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { hashPassword, verifyPassword, sha256Hex, randomToken } from '../auth/password.js';
import { sessionCookieHeader, clearSessionCookieHeader } from '../auth/session.js';
import { getSecret } from '../auth/middleware.js';
import { sendMail, verificationEmail, resetEmail } from '../lib/mailer.js';
import { requireAuth } from '../auth/middleware.js';
import { registerSchema, loginSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/validation.js';
import { parseBody } from '../lib/helpers.js';
import { safeUser } from '../lib/helpers.js';
import { rateLimitMiddleware } from '../lib/rate-limit.js';

const auth = new Hono<{ Bindings: Env }>();
auth.use('/login', rateLimitMiddleware(10, 60_000));
auth.use('/register', rateLimitMiddleware(10, 60_000));

auth.post('/register', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid registration data', parsed.error.flatten());
  const v = parsed.data;
  const existing = await db.select().from(users).where(or(eq(users.email, v.email), eq(users.username, v.username))).limit(1);
  if (existing.length) return fail(c, 409, 'conflict', 'Email or username already in use');
  const now = Date.now();
  const [user] = await db.insert(users).values({ username: v.username, email: v.email, passwordHash: await hashPassword(v.password), displayName: v.displayName, dateOfBirth: v.dateOfBirth, gender: v.gender, location: v.location ?? null, createdAt: now, updatedAt: now }).returning();
  await db.insert(profiles).values({ userId: user.id, profileCompletion: 30 });
  await db.insert(userPreferences).values({ userId: user.id });
  const token = randomToken();
  await db.insert(emailVerifications).values({ userId: user.id, tokenHash: sha256Hex(token), expiresAt: now + 24 * 3600_000 });
  const appUrl = (c.env.APP_URL as string) ?? process.env.APP_URL ?? 'http://localhost:5173';
  await sendMail(c.env as Record<string, string | undefined>, { to: user.email, ...verificationEmail(user.displayName, `${appUrl}/verify-email?token=${token}`) });
  // Dev only: return the token in the response so the local flow can be completed without email.
  // Production (Resend configured) must NOT rely on this; the token is also emailed.
  const devToken = (c.env.RESEND_API_KEY as string) ? undefined : token;
  return ok(c, { user: safeUser(user), ...(devToken ? { devVerificationToken: devToken } : {}) }, 201);
});

auth.post('/login', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid login data');
  const [user] = await db.select().from(users).where(or(eq(users.email, parsed.data.emailOrUsername), eq(users.username, parsed.data.emailOrUsername))).limit(1);
  if (!user || user.deletedAt || !(await verifyPassword(parsed.data.password, user.passwordHash))) return fail(c, 401, 'invalid_credentials', 'Invalid email/username or password');
  if (user.status !== 'active') return fail(c, 403, 'account_suspended', 'Account is suspended');
  c.header('Set-Cookie', sessionCookieHeader(getSecret(c), user.id));
  return ok(c, { user: safeUser(user) });
});

auth.post('/logout', (c) => { c.header('Set-Cookie', clearSessionCookieHeader()); return ok(c, { loggedOut: true }); });

auth.post('/verify-email', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid token');
  const [rec] = await db.select().from(emailVerifications).where(and(eq(emailVerifications.tokenHash, sha256Hex(parsed.data.token)), gt(emailVerifications.expiresAt, Date.now()), isNull(emailVerifications.usedAt))).limit(1);
  if (!rec) return fail(c, 400, 'invalid_token', 'Verification link is invalid or expired');
  await db.update(emailVerifications).set({ usedAt: Date.now() }).where(eq(emailVerifications.id, rec.id));
  await db.update(users).set({ emailVerified: 1 }).where(eq(users.id, rec.userId));
  return ok(c, { verified: true });
});

auth.post('/forgot-password', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid email');
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Always return ok to avoid email enumeration.
  if (user) {
    const token = randomToken();
    await db.insert(passwordResets).values({ userId: user.id, tokenHash: sha256Hex(token), expiresAt: Date.now() + 3600_000 });
    const appUrl = (c.env.APP_URL as string) ?? process.env.APP_URL ?? 'http://localhost:5173';
    await sendMail(c.env as Record<string, string | undefined>, { to: user.email, ...resetEmail(user.displayName, `${appUrl}/reset-password?token=${token}`) });
    if (!(c.env.RESEND_API_KEY as string)) c.header('X-Dev-Reset-Token', token);
  }
  return ok(c, { sent: true });
});

auth.post('/reset-password', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid data', parsed.error.flatten());
  const [rec] = await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, sha256Hex(parsed.data.token)), gt(passwordResets.expiresAt, Date.now()), isNull(passwordResets.usedAt))).limit(1);
  if (!rec) return fail(c, 400, 'invalid_token', 'Reset link is invalid or expired');
  await db.update(passwordResets).set({ usedAt: Date.now() }).where(eq(passwordResets.id, rec.id));
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: Date.now() }).where(eq(users.id, rec.userId));
  return ok(c, { reset: true });
});

auth.get('/me', requireAuth, async (c) => {
  const db = getDb(c.env); const authCtx: any = (c as any).get('auth');
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, authCtx.userId)).limit(1);
  return ok(c, { user: safeUser(authCtx.user), profile: profile ?? null });
});

auth.delete('/me', requireAuth, async (c) => {
  const db = getDb(c.env); const authCtx: any = (c as any).get('auth');
  await db.update(users).set({ deletedAt: Date.now(), status: 'deleted', updatedAt: Date.now() }).where(eq(users.id, authCtx.userId));
  c.header('Set-Cookie', clearSessionCookieHeader());
  return ok(c, { deleted: true });
});

export default auth;
