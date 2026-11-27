import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import { users, profiles, confessions, confessionLikes, comments, savedPosts, reports } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { confessionCreateSchema, commentCreateSchema } from '../lib/validation.js';
import { parseBody, publicUserRow, parseJson, countRows } from '../lib/helpers.js';
import { pageLimit, encodeCursor, decodeCursor } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
// Public DTO: NEVER includes authorId. Anonymous => "Anonymous", else display name.
async function confessionDto(db: any, cf: typeof confessions.$inferSelect, me?: string | null) {
  const likeCount = await countRows(db, confessionLikes, eq(confessionLikes.confessionId, cf.id));
  const commentCount = await countRows(db, comments, eq(comments.confessionId, cf.id));
  let likedByMe = false, savedByMe = false;
  if (me) {
    const [l] = await db.select().from(confessionLikes).where(and(eq(confessionLikes.confessionId, cf.id), eq(confessionLikes.userId, me))).limit(1); likedByMe = Boolean(l);
    const [s] = await db.select().from(savedPosts).where(and(eq(savedPosts.confessionId, cf.id), eq(savedPosts.userId, me))).limit(1); savedByMe = Boolean(s);
  }
  let authorLabel = 'Anonymous';
  if (!cf.isAnonymous) { const [u] = await db.select().from(users).where(eq(users.id, cf.authorId)).limit(1); if (u) authorLabel = u.displayName; }
  const { authorId: _author, ...rest } = cf as any;
  return { ...rest, hashtags: parseJson<string[]>(cf.hashtags, []), authorLabel, likeCount, commentCount, likedByMe, savedByMe };
}
function paginate(rows: any[], cursor: any, limit: number) {
  let list = rows; if (cursor) list = list.filter((m) => m.createdAt < cursor.createdAt || (m.createdAt === cursor.createdAt && m.id < cursor.id));
  const hasMore = list.length > limit; return { items: list.slice(0, limit), hasMore };
}
r.get('/confessions', optionalAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const limit = pageLimit(c.req.query('limit')); const cursor = decodeCursor(c.req.query('cursor'));
  const sort = c.req.query('sort') ?? 'latest';
  const rows = await db.select().from(confessions).where(eq(confessions.status, 'published')).orderBy(desc(confessions.createdAt)).limit(200);
  let list = rows;
  if (sort === 'trending') {
    // Trending: most liked in the last 7 days (like count, then recency).
    const counts = new Map<string, number>();
    for (const cf of rows) { counts.set(cf.id, await countRows(db, confessionLikes, eq(confessionLikes.confessionId, cf.id))); }
    list = [...rows].sort((x, y) => (counts.get(y.id) ?? 0) - (counts.get(x.id) ?? 0) || y.createdAt - x.createdAt);
  }
  const { items, hasMore } = paginate(list, cursor, limit);
  const out = []; for (const cf of items) out.push(await confessionDto(db, cf, a?.userId ?? null));
  return ok(c, { items: out, nextCursor: hasMore && out.length ? encodeCursor(out[out.length - 1].createdAt, out[out.length - 1].id) : null });
});
r.get('/confessions/trending', optionalAuth, async (c) => { return c.redirect(`/api/confessions?sort=trending&limit=${c.req.query('limit') ?? 20}`); });
r.get('/confessions/latest', optionalAuth, async (c) => { return c.redirect(`/api/confessions?sort=latest&limit=${c.req.query('limit') ?? 20}`); });
r.get('/confessions/mine', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const rows = await db.select().from(confessions).where(eq(confessions.authorId, a.userId)).orderBy(desc(confessions.createdAt));
  const out = []; for (const cf of rows) out.push(await confessionDto(db, cf, a.userId));
  return ok(c, { items: out });
});
r.get('/confessions/:id', optionalAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [cf] = await db.select().from(confessions).where(eq(confessions.id, c.req.param('id'))).limit(1);
  if (!cf || cf.status !== 'published') return fail(c, 404, 'not_found', 'Confession not found');
  return ok(c, await confessionDto(db, cf, a?.userId ?? null));
});
r.post('/confessions', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = confessionCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid confession', parsed.error.flatten());
  const [cf] = await db.insert(confessions).values({ authorId: a.userId, isAnonymous: parsed.data.isAnonymous === false ? 0 : 1, body: parsed.data.body, category: parsed.data.category ?? null, mood: parsed.data.mood ?? null, hashtags: JSON.stringify(parsed.data.hashtags ?? []) }).returning();
  return ok(c, await confessionDto(db, cf, a.userId), 201);
});
r.delete('/confessions/:id', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [cf] = await db.select().from(confessions).where(eq(confessions.id, c.req.param('id'))).limit(1);
  if (!cf) return fail(c, 404, 'not_found', 'Confession not found');
  if (cf.authorId !== a.userId) return fail(c, 403, 'forbidden', 'Not your confession');
  await db.delete(confessions).where(eq(confessions.id, cf.id));
  return ok(c, { deleted: true });
});
r.post('/confessions/:id/like', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  const [cf] = await db.select().from(confessions).where(eq(confessions.id, id)).limit(1);
  if (!cf) return fail(c, 404, 'not_found', 'Confession not found');
  await db.insert(confessionLikes).values({ confessionId: id, userId: a.userId }).onConflictDoNothing();
  return ok(c, { liked: true }, 201);
});
r.delete('/confessions/:id/like', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(confessionLikes).where(and(eq(confessionLikes.confessionId, c.req.param('id')), eq(confessionLikes.userId, a.userId)));
  return ok(c, { liked: false });
});
r.post('/confessions/:id/save', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  const [cf] = await db.select().from(confessions).where(eq(confessions.id, id)).limit(1);
  if (!cf) return fail(c, 404, 'not_found', 'Confession not found');
  await db.insert(savedPosts).values({ userId: a.userId, confessionId: id }).onConflictDoNothing();
  return ok(c, { saved: true }, 201);
});
r.delete('/confessions/:id/save', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(savedPosts).where(and(eq(savedPosts.confessionId, c.req.param('id')), eq(savedPosts.userId, a.userId)));
  return ok(c, { saved: false });
});
r.get('/comments/confessions/:confessionId', async (c) => {
  const db = getDb(c.env); const rows = await db.select().from(comments).where(eq(comments.confessionId, c.req.param('confessionId'))).orderBy(comments.createdAt);
  const out = []; for (const cm of rows) { const [u] = await db.select().from(users).where(eq(users.id, cm.authorId)).limit(1); const [p] = u ? await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1) : [null]; out.push({ ...cm, author: u ? publicUserRow(u, p) : null }); }
  return ok(c, { items: out });
});
r.post('/comments/confessions/:confessionId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid comment', parsed.error.flatten());
  const [cf] = await db.select().from(confessions).where(eq(confessions.id, c.req.param('confessionId'))).limit(1);
  if (!cf) return fail(c, 404, 'not_found', 'Confession not found');
  const [cm] = await db.insert(comments).values({ confessionId: cf.id, authorId: a.userId, body: parsed.data.body }).returning();
  return ok(c, { comment: cm }, 201);
});
export default r;
