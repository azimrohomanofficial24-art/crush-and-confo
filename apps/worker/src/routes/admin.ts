import { Hono } from 'hono';
import { eq, desc, sql, like, or, and } from 'drizzle-orm';
import { users, adminUsers, reports, confessions, posts, auditLogs, platformSettings, announcements, matches, messages } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAdmin, audit } from '../auth/middleware.js';
import { adminLoginSchema } from '../lib/validation.js';
import { parseBody, safeUser, countRows } from '../lib/helpers.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { sessionCookieHeader, clearSessionCookieHeader } from '../auth/session.js';
import { getSecret } from '../auth/middleware.js';
import { pageLimit } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
// Separate admin login (admin_users table, not users).
r.post('/admin/login', async (c) => {
  const db = getDb(c.env); const body = await parseBody(c);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid login');
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, parsed.data.email)).limit(1);
  if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) return fail(c, 401, 'invalid_credentials', 'Invalid admin credentials');
  await db.update(adminUsers).set({ lastLoginAt: Date.now() }).where(eq(adminUsers.id, admin.id));
  c.header('Set-Cookie', sessionCookieHeader(getSecret(c), `admin:${admin.id}`));
  const { passwordHash: _p, ...rest } = admin as any;
  return ok(c, { admin: rest });
});
r.post('/admin/logout', (c) => { c.header('Set-Cookie', clearSessionCookieHeader()); return ok(c, { loggedOut: true }); });
r.get('/admin/me', requireAdmin, async (c) => {
  const admin: any = (c as any).get('admin'); const { passwordHash: _p, ...rest } = admin; return ok(c, { admin: rest });
});
// All routes below requireAdmin (role check server-side on every admin route).
r.get('/admin/stats', requireAdmin, async (c) => {
  const db = getDb(c.env);
  const count = async (table: any, cond?: any) => { const rows = cond ? await db.select().from(table).where(cond) : await db.select().from(table); return rows.length; };
  return ok(c, {
    users: await count(users), confessions: await count(confessions), posts: await count(posts),
    openReports: await count(reports, eq(reports.status, 'open')),
    activeUsers: await count(users, eq(users.status, 'active')),
    verifiedUsers: await count(users, eq(users.emailVerified, 1)),
    suspendedUsers: await count(users, eq(users.status, 'suspended')),
    bannedUsers: await count(users, eq(users.status, 'banned')),
    totalMatches: await count(matches), totalMessages: await count(messages),
  });
});
r.get('/admin/health', requireAdmin, async (c) => {
  const db = getDb(c.env);
  const env = c.env as Env;
  return ok(c, {
    email: { provider: 'resend', configured: Boolean(env.RESEND_API_KEY), mode: env.RESEND_API_KEY ? 'live' : 'dev', from: env.RESEND_FROM ?? null,
      note: env.RESEND_API_KEY ? 'Resend key is set; production sending needs a verified domain (see docs/EMAIL.md).' : 'No Resend key — verification/reset emails are logged to console only (dev mode).' },
    storage: { d1: Boolean(env.DB), r2Bucket: 'crush-and-confo-uploads', kvNamespace: 'crush-and-confo-kv',
      uploads: { posts: await countRows(db, posts), confessions: await countRows(db, confessions) },
      note: 'R2/KV bindings are configured in wrangler.jsonc; live usage is only counted once deployed to Cloudflare.' },
  });
});
r.get('/admin/users', requireAdmin, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const search = (c.req.query('search') ?? '').trim();
  const status = c.req.query('status');
  const conds: any[] = [];
  if (status && status !== 'all') conds.push(eq(users.status, status));
  if (search) {
    const q = `%${search.replace(/[%_]/g, '')}%`;
    conds.push(or(like(users.displayName, q), like(users.username, q), like(users.email, q)));
  }
  const rows = await db.select().from(users).where(conds.length ? and(...conds) : sql`1=1`).orderBy(desc(users.createdAt)).limit(limit);
  return ok(c, { items: rows.map(safeUser) });
});
r.post('/admin/users/:id/suspend', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.update(users).set({ status: 'suspended', updatedAt: Date.now() }).where(eq(users.id, c.req.param('id')));
  await audit(db, admin.id, 'user.suspend', 'user', c.req.param('id'));
  return ok(c, { suspended: true });
});
r.post('/admin/users/:id/reactivate', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.update(users).set({ status: 'active', updatedAt: Date.now() }).where(eq(users.id, c.req.param('id')));
  await audit(db, admin.id, 'user.reactivate', 'user', c.req.param('id'));
  return ok(c, { reactivated: true });
});
r.post('/admin/users/:id/ban', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.update(users).set({ status: 'banned', updatedAt: Date.now() }).where(eq(users.id, c.req.param('id')));
  await audit(db, admin.id, 'user.ban', 'user', c.req.param('id'));
  return ok(c, { banned: true });
});
r.get('/admin/posts', requireAdmin, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit);
  return ok(c, { items: rows });
});
// Announcements — admin broadcasts shown on the home dashboard.
r.get('/admin/announcements', requireAdmin, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(limit);
  return ok(c, { items: rows });
});
r.post('/admin/announcements', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin'); const body = await parseBody(c);
  const title = String(body.title ?? '').trim(); const text = String(body.body ?? '').trim();
  const audience = ['all', 'verified', 'premium'].includes(body.audience) ? body.audience : 'all';
  if (!title || !text) return fail(c, 400, 'validation_error', 'Title and body are required');
  if (title.length > 200 || text.length > 2000) return fail(c, 400, 'validation_error', 'Title (max 200) or body (max 2000) is too long');
  const [row] = await db.insert(announcements).values({ title, body: text, audience, active: 1, createdBy: admin.id }).returning();
  await audit(db, admin.id, 'announcement.create', 'announcement', row.id);
  return ok(c, { announcement: row }, 201);
});
r.patch('/admin/announcements/:id', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin'); const body = await parseBody(c);
  const patch: any = { updatedAt: Date.now() };
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.body !== undefined) patch.body = String(body.body).trim();
  if (body.audience !== undefined && ['all', 'verified', 'premium'].includes(body.audience)) patch.audience = body.audience;
  if (body.active !== undefined) patch.active = body.active ? 1 : 0;
  if (!patch.title && !patch.body && patch.audience === undefined && patch.active === undefined) return fail(c, 400, 'validation_error', 'Nothing to update');
  await db.update(announcements).set(patch).where(eq(announcements.id, c.req.param('id')));
  await audit(db, admin.id, 'announcement.update', 'announcement', c.req.param('id'));
  return ok(c, { updated: true });
});
r.delete('/admin/announcements/:id', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.delete(announcements).where(eq(announcements.id, c.req.param('id')));
  await audit(db, admin.id, 'announcement.delete', 'announcement', c.req.param('id'));
  return ok(c, { deleted: true });
});
r.get('/admin/reports', requireAdmin, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const status = c.req.query('status');
  const rows = await db.select().from(reports).where(status ? eq(reports.status, status) : sql`1=1`).orderBy(desc(reports.createdAt)).limit(limit);
  return ok(c, { items: rows });
});
r.post('/admin/reports/:id/resolve', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin'); const body = await parseBody(c);
  await db.update(reports).set({ status: body.status ?? 'resolved', reviewedBy: admin.id }).where(eq(reports.id, c.req.param('id')));
  await audit(db, admin.id, 'report.resolve', 'report', c.req.param('id'), { status: body.status ?? 'resolved' });
  return ok(c, { resolved: true });
});
r.get('/admin/confessions', requireAdmin, async (c) => {
  // Admin-only: authorId IS visible here for investigation (never in public API).
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(confessions).orderBy(desc(confessions.createdAt)).limit(limit);
  return ok(c, { items: rows });
});
r.post('/admin/confessions/:id/hide', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.update(confessions).set({ status: 'hidden' }).where(eq(confessions.id, c.req.param('id')));
  await audit(db, admin.id, 'confession.hide', 'confession', c.req.param('id'));
  return ok(c, { hidden: true });
});
r.post('/admin/posts/:id/hide', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin');
  await db.update(posts).set({ visibility: 'private' }).where(eq(posts.id, c.req.param('id')));
  await audit(db, admin.id, 'post.hide', 'post', c.req.param('id'));
  return ok(c, { hidden: true });
});
r.get('/admin/audit-logs', requireAdmin, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  return ok(c, { items: rows });
});
r.get('/admin/settings', requireAdmin, async (c) => {
  const db = getDb(c.env); const rows = await db.select().from(platformSettings);
  return ok(c, { items: Object.fromEntries(rows.map((s: any) => [s.key, s.value])) });
});
r.put('/admin/settings/:key', requireAdmin, async (c) => {
  const db = getDb(c.env); const admin: any = (c as any).get('admin'); const body = await parseBody(c);
  const key = c.req.param('key');
  await db.insert(platformSettings).values({ key, value: String(body.value ?? '') }).onConflictDoUpdate({ target: platformSettings.key, set: { value: String(body.value ?? ''), updatedAt: Date.now() } });
  await audit(db, admin.id, 'settings.update', 'platform_settings', key, { value: String(body.value ?? '') });
  return ok(c, { key, value: String(body.value ?? '') });
});
export default r;
