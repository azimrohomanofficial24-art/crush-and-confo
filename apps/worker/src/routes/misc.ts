import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { users, notifications, reports, blocks, userPreferences, platformSettings, announcements } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { reportSchema, blockSchema } from '../lib/validation.js';
import { parseBody, parseJson, countRows } from '../lib/helpers.js';
import { pageLimit } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
// Public announcements — active broadcasts only; admin identity is never exposed.
r.get('/announcements', async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(announcements).where(eq(announcements.active, 1)).orderBy(desc(announcements.createdAt)).limit(limit);
  return ok(c, { items: rows.map((a: any) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, createdAt: a.createdAt })) });
});
// Notifications
r.get('/notifications', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const limit = pageLimit(c.req.query('limit'));
  const rows = await db.select().from(notifications).where(eq(notifications.userId, a.userId)).orderBy(desc(notifications.createdAt)).limit(limit);
  const unreadCount = await countRows(db, notifications, and(eq(notifications.userId, a.userId), eq(notifications.isRead, 0)));
  return ok(c, { items: rows.map((n: any) => ({ ...n, isRead: Boolean(n.isRead), data: parseJson(n.data, null) })), unreadCount });
});
r.post('/notifications/:id/read', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, c.req.param('id')), eq(notifications.userId, a.userId)));
  return ok(c, { read: true });
});
r.post('/notifications/read-all', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.userId, a.userId));
  return ok(c, { read: true });
});
r.get('/notifications/preferences', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, a.userId)).limit(1);
  return ok(c, { preferences: pref ? { notificationsEnabled: true, preferredGenders: parseJson(pref.preferredGenders, []) } : null });
});
// Reports
r.post('/reports', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid report', parsed.error.flatten());
  const [rep] = await db.insert(reports).values({ reporterId: a.userId, targetType: parsed.data.targetType, targetId: parsed.data.targetId, reason: parsed.data.reason, details: parsed.data.details ?? null }).returning();
  return ok(c, { report: rep }, 201);
});
r.get('/reports/mine', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const rows = await db.select().from(reports).where(eq(reports.reporterId, a.userId)).orderBy(desc(reports.createdAt));
  return ok(c, { items: rows });
});
// Blocks
r.get('/blocks', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const rows = await db.select().from(blocks).where(eq(blocks.blockerId, a.userId)).orderBy(desc(blocks.createdAt));
  return ok(c, { items: rows });
});
r.post('/blocks', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid block', parsed.error.flatten());
  if (parsed.data.blockedId === a.userId) return fail(c, 400, 'invalid', 'You cannot block yourself');
  const [target] = await db.select().from(users).where(eq(users.id, parsed.data.blockedId)).limit(1);
  if (!target) return fail(c, 404, 'not_found', 'User not found');
  await db.insert(blocks).values({ blockerId: a.userId, blockedId: parsed.data.blockedId }).onConflictDoNothing();
  return ok(c, { blocked: true }, 201);
});
r.delete('/blocks/:userId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(blocks).where(and(eq(blocks.blockerId, a.userId), eq(blocks.blockedId, c.req.param('userId'))));
  return ok(c, { blocked: false });
});
export default r;
