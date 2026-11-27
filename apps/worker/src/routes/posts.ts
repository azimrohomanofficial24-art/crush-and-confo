import { Hono } from 'hono';
import { eq, and, desc, sql, or, inArray } from 'drizzle-orm';
import { users, profiles, posts, postLikes, comments, follows, savedPosts } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth, optionalAuth } from '../auth/middleware.js';
import { postCreateSchema, commentCreateSchema } from '../lib/validation.js';
import { parseBody, publicUserRow, parseJson, notify, isBlockedEitherWay, countRows } from '../lib/helpers.js';
import { pageLimit, encodeCursor, decodeCursor } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
async function postDto(db: any, p: typeof posts.$inferSelect, me?: string | null) {
  const [u] = await db.select().from(users).where(eq(users.id, p.authorId)).limit(1);
  const [prof] = u ? await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1) : [null];
  const likeCount = await countRows(db, postLikes, eq(postLikes.postId, p.id));
  const commentCount = await countRows(db, comments, eq(comments.postId, p.id));
  let likedByMe = false;
  if (me) { const [l] = await db.select().from(postLikes).where(and(eq(postLikes.postId, p.id), eq(postLikes.userId, me))).limit(1); likedByMe = Boolean(l); }
  let savedByMe = false;
  if (me) { const [s] = await db.select().from(savedPosts).where(and(eq(savedPosts.postId, p.id), eq(savedPosts.userId, me))).limit(1); savedByMe = Boolean(s); }
  return { ...p, hashtags: parseJson<string[]>(p.hashtags, []), author: u ? publicUserRow(u, prof) : null, likeCount, commentCount, likedByMe, savedByMe };
}
function cursorFilter(rows: any[], cursor: any, limit: number) {
  let list = rows;
  if (cursor) list = list.filter((m) => m.createdAt < cursor.createdAt || (m.createdAt === cursor.createdAt && m.id < cursor.id));
  const hasMore = list.length > limit; return { items: list.slice(0, limit), hasMore };
}
// GET /api/community/feed?cursor&limit — posts from followed users + public, newest first
r.get('/community/feed', optionalAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const limit = pageLimit(c.req.query('limit'));
  const cursor = decodeCursor(c.req.query('cursor'));
  const rows = await db.select().from(posts).where(eq(posts.visibility, 'public')).orderBy(desc(posts.createdAt)).limit(limit + 1);
  const { items, hasMore } = cursorFilter(rows, cursor, limit);
  const out = []; for (const p of items) out.push(await postDto(db, p, a?.userId ?? null));
  return ok(c, { items: out, nextCursor: hasMore && out.length ? encodeCursor(out[out.length - 1].createdAt, out[out.length - 1].id) : null });
});
// GET /api/community/hashtags — trending hashtags from posts + confessions
r.get('/community/hashtags', async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(posts).limit(200);
  const counts = new Map<string, number>();
  for (const row of rows) for (const h of parseJson<string[]>(row.hashtags, [])) counts.set(h, (counts.get(h) ?? 0) + 1);
  const items = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, count]) => ({ tag, count }));
  return ok(c, { items });
});
// GET /api/community/search?q=
r.get('/community/search', optionalAuth, async (c) => {
  const db = getDb(c.env); const q = (c.req.query('q') ?? '').trim(); const limit = pageLimit(c.req.query('limit'));
  if (!q) return ok(c, { items: [] });
  const rows = await db.select().from(posts).where(and(eq(posts.visibility, 'public'), sql`lower(${posts.body}) like lower(${'%' + q + '%'})`)).orderBy(desc(posts.createdAt)).limit(limit);
  const a: any = (c as any).get('auth'); const out = []; for (const p of rows) out.push(await postDto(db, p, a?.userId ?? null));
  return ok(c, { items: out });
});
// POST /api/community/follow/:userId  + DELETE to unfollow
r.post('/community/follow/:userId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const targetId = c.req.param('userId');
  if (targetId === a.userId) return fail(c, 400, 'invalid', 'You cannot follow yourself');
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target) return fail(c, 404, 'not_found', 'User not found');
  const [ex] = await db.select().from(follows).where(and(eq(follows.followerId, a.userId), eq(follows.followingId, targetId))).limit(1);
  if (ex) return fail(c, 409, 'duplicate', 'Already following');
  await db.insert(follows).values({ followerId: a.userId, followingId: targetId });
  await notify(db, targetId, 'follow', 'New follower', `${a.user.displayName} started following you.`, a.userId);
  return ok(c, { following: true }, 201);
});
r.delete('/community/follow/:userId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(follows).where(and(eq(follows.followerId, a.userId), eq(follows.followingId, c.req.param('userId'))));
  return ok(c, { following: false });
});
// GET /api/community/followers/:userId and /following/:userId
r.get('/community/followers/:userId', async (c) => {
  const db = getDb(c.env); const rows = await db.select().from(follows).where(eq(follows.followingId, c.req.param('userId')));
  const items = []; for (const f of rows) { const [u] = await db.select().from(users).where(eq(users.id, f.followerId)).limit(1); if (u) { const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1); items.push(publicUserRow(u, p)); } }
  return ok(c, { items });
});
r.get('/community/following/:userId', async (c) => {
  const db = getDb(c.env); const rows = await db.select().from(follows).where(eq(follows.followerId, c.req.param('userId')));
  const items = []; for (const f of rows) { const [u] = await db.select().from(users).where(eq(users.id, f.followingId)).limit(1); if (u) { const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1); items.push(publicUserRow(u, p)); } }
  return ok(c, { items });
});
// POST /api/posts
r.post('/posts', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = postCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid post', parsed.error.flatten());
  const [p] = await db.insert(posts).values({ authorId: a.userId, body: parsed.data.body, imageUrl: parsed.data.imageUrl ?? null, feeling: parsed.data.feeling ?? null, location: parsed.data.location ?? null, hashtags: JSON.stringify(parsed.data.hashtags ?? []), visibility: parsed.data.visibility ?? 'public' }).returning();
  return ok(c, await postDto(db, p, a.userId), 201);
});
// GET /api/posts/:id
r.get('/posts/:id', optionalAuth, async (c) => {
  const db = getDb(c.env); const [p] = await db.select().from(posts).where(eq(posts.id, c.req.param('id'))).limit(1);
  if (!p) return fail(c, 404, 'not_found', 'Post not found');
  const a: any = (c as any).get('auth'); return ok(c, await postDto(db, p, a?.userId ?? null));
});
// GET /api/posts?authorId=&cursor&limit
r.get('/posts', optionalAuth, async (c) => {
  const db = getDb(c.env); const limit = pageLimit(c.req.query('limit')); const cursor = decodeCursor(c.req.query('cursor'));
  const authorId = c.req.query('authorId');
  const rows = await db.select().from(posts).where(authorId ? eq(posts.authorId, authorId) : eq(posts.visibility, 'public')).orderBy(desc(posts.createdAt)).limit(limit + 1);
  const { items, hasMore } = cursorFilter(rows, cursor, limit);
  const a: any = (c as any).get('auth'); const out = []; for (const p of items) out.push(await postDto(db, p, a?.userId ?? null));
  return ok(c, { items: out, nextCursor: hasMore && out.length ? encodeCursor(out[out.length - 1].createdAt, out[out.length - 1].id) : null });
});
// DELETE /api/posts/:id (author only)
r.delete('/posts/:id', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [p] = await db.select().from(posts).where(eq(posts.id, c.req.param('id'))).limit(1);
  if (!p) return fail(c, 404, 'not_found', 'Post not found');
  if (p.authorId !== a.userId) return fail(c, 403, 'forbidden', 'Not your post');
  await db.delete(posts).where(eq(posts.id, p.id));
  return ok(c, { deleted: true });
});
// POST /api/posts/:id/like, DELETE unlike
r.post('/posts/:id/like', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!p) return fail(c, 404, 'not_found', 'Post not found');
  const [ex] = await db.select().from(postLikes).where(and(eq(postLikes.postId, id), eq(postLikes.userId, a.userId))).limit(1);
  if (ex) return fail(c, 409, 'duplicate', 'Already liked');
  await db.insert(postLikes).values({ postId: id, userId: a.userId });
  if (p.authorId !== a.userId) await notify(db, p.authorId, 'like', 'Your post was liked', `${a.user.displayName} liked your post.`, a.userId, { postId: id });
  return ok(c, { liked: true }, 201);
});
r.delete('/posts/:id/like', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(postLikes).where(and(eq(postLikes.postId, c.req.param('id')), eq(postLikes.userId, a.userId)));
  return ok(c, { liked: false });
});
// POST /api/posts/:id/save, DELETE unsave; GET /api/posts/saved (mine)
r.post('/posts/:id/save', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!p) return fail(c, 404, 'not_found', 'Post not found');
  await db.insert(savedPosts).values({ userId: a.userId, postId: id }).onConflictDoNothing();
  return ok(c, { saved: true }, 201);
});
r.delete('/posts/:id/save', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  await db.delete(savedPosts).where(and(eq(savedPosts.userId, a.userId), eq(savedPosts.postId, c.req.param('id'))));
  return ok(c, { saved: false });
});
r.get('/posts/saved/mine', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const rows = await db.select().from(savedPosts).where(and(eq(savedPosts.userId, a.userId), sql`${savedPosts.postId} IS NOT NULL`)).orderBy(desc(savedPosts.createdAt));
  const out = []; for (const s of rows) { const [p] = await db.select().from(posts).where(eq(posts.id, s.postId!)).limit(1); if (p) out.push(await postDto(db, p, a.userId)); }
  return ok(c, { items: out });
});
// Comments on posts: GET/POST /api/comments/posts/:postId
r.get('/comments/posts/:postId', async (c) => {
  const db = getDb(c.env); const rows = await db.select().from(comments).where(eq(comments.postId, c.req.param('postId'))).orderBy(comments.createdAt);
  const out = []; for (const cm of rows) { const [u] = await db.select().from(users).where(eq(users.id, cm.authorId)).limit(1); const [p] = u ? await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1) : [null]; out.push({ ...cm, author: u ? publicUserRow(u, p) : null }); }
  return ok(c, { items: out });
});
r.post('/comments/posts/:postId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid comment', parsed.error.flatten());
  const [p] = await db.select().from(posts).where(eq(posts.id, c.req.param('postId'))).limit(1);
  if (!p) return fail(c, 404, 'not_found', 'Post not found');
  const [cm] = await db.insert(comments).values({ postId: p.id, authorId: a.userId, body: parsed.data.body }).returning();
  if (p.authorId !== a.userId) await notify(db, p.authorId, 'comment', 'New comment', `${a.user.displayName} commented on your post.`, a.userId, { postId: p.id });
  return ok(c, { comment: cm }, 201);
});
export default r;
