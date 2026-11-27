import { Hono } from 'hono';
import { eq, and, or, sql, desc, inArray } from 'drizzle-orm';
import { users, profiles, userInterests, interests, follows, posts } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { publicUserRow, parseJson, isBlockedEitherWay, countRows } from '../lib/helpers.js';
import { pageLimit, encodeCursor, decodeCursor } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();

// GET /api/users/search?q=&limit=
r.get('/search', optionalAuth, async (c) => {
  const db = getDb(c.env); const q = (c.req.query('q') ?? '').trim(); const limit = pageLimit(c.req.query('limit'));
  if (!q) return ok(c, { items: [] });
  const rows = await db.select().from(users).where(and(eq(users.status, 'active'), or(sql`lower(${users.username}) like lower(${'%' + q + '%'})`, sql`lower(${users.displayName}) like lower(${'%' + q + '%'})`))).limit(limit);
  const out = [];
  for (const u of rows) { const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1); out.push(publicUserRow(u, p)); }
  return ok(c, { items: out });
});
// GET /api/users/:id  (public profile summary)
r.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env); const id = c.req.param('id');
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u || u.status !== 'active' || u.deletedAt) return fail(c, 404, 'not_found', 'User not found');
  const authCtx: any = (c as any).get('auth');
  if (authCtx && await isBlockedEitherWay(db, authCtx.userId, id)) return fail(c, 404, 'not_found', 'User not found');
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id)).limit(1);
  const uiRows = await db.select().from(userInterests).where(eq(userInterests.userId, id));
  const ints = uiRows.length ? await db.select().from(interests).where(inArray(interests.id, uiRows.map((x: any) => x.interestId))) : [];
  const followers = await countRows(db, follows, eq(follows.followingId, id));
  const following = await countRows(db, follows, eq(follows.followerId, id));
  const postCount = await countRows(db, posts, eq(posts.authorId, id));
  return ok(c, { user: publicUserRow(u, p), profile: p ?? null, interests: ints, counts: { followers, following, posts: postCount } });
});
// GET /api/users/:username/by-username — kept as query route for the web app
r.get('/by-username/:username', optionalAuth, async (c) => {
  const db = getDb(c.env); const [u] = await db.select().from(users).where(eq(users.username, c.req.param('username'))).limit(1);
  if (!u) return fail(c, 404, 'not_found', 'User not found');
  return c.redirect(`/api/users/${u.id}`);
});
export default r;
