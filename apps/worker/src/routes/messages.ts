import { Hono } from 'hono';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { users, profiles, matches, conversations, conversationMembers, messages } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { messageCreateSchema } from '../lib/validation.js';
import { parseBody, publicUserRow, notify } from '../lib/helpers.js';
import { pageLimit, encodeCursor, decodeCursor } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
async function requireMember(db: any, convId: string, userId: string) {
  const [m] = await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, convId), eq(conversationMembers.userId, userId))).limit(1);
  return m ?? null;
}
async function conversationDto(db: any, conv: typeof conversations.$inferSelect, me: string) {
  const members = await db.select().from(conversationMembers).where(eq(conversationMembers.conversationId, conv.id));
  const memberUsers = [];
  for (const m of members) { const [u] = await db.select().from(users).where(eq(users.id, m.userId)).limit(1); const [p] = u ? await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1) : [null]; if (u) memberUsers.push(publicUserRow(u, p)); }
  const [last] = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.createdAt)).limit(1);
  return { ...conv, members: memberUsers, lastMessage: last ?? null };
}
// GET /api/conversations
r.get('/conversations', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const mine = await db.select().from(conversationMembers).where(eq(conversationMembers.userId, a.userId));
  const items = [];
  for (const m of mine) { const [conv] = await db.select().from(conversations).where(eq(conversations.id, m.conversationId)).limit(1); if (conv) items.push(await conversationDto(db, conv, a.userId)); }
  items.sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0));
  return ok(c, { items });
});
// POST /api/conversations { matchId } — chat only after mutual match
r.post('/conversations', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const [m] = await db.select().from(matches).where(eq(matches.id, body.matchId)).limit(1);
  if (!m || m.unmatchedAt || (m.userAId !== a.userId && m.userBId !== a.userId)) return fail(c, 403, 'no_match', 'Chat is only available after a mutual match');
  const [existing] = await db.select().from(conversations).where(eq(conversations.matchId, m.id)).limit(1);
  if (existing) return ok(c, await conversationDto(db, existing, a.userId));
  const [conv] = await db.insert(conversations).values({ matchId: m.id }).returning();
  await db.insert(conversationMembers).values({ conversationId: conv.id, userId: m.userAId });
  await db.insert(conversationMembers).values({ conversationId: conv.id, userId: m.userBId });
  return ok(c, await conversationDto(db, conv, a.userId), 201);
});
// GET /api/conversations/:id
r.get('/conversations/:id', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, c.req.param('id'))).limit(1);
  if (!conv || !(await requireMember(db, conv.id, a.userId))) return fail(c, 404, 'not_found', 'Conversation not found');
  return ok(c, await conversationDto(db, conv, a.userId));
});
// GET /api/conversations/:id/poll — local dev fallback for Durable Object realtime (long-poll: returns messages since ?since=ms, up to 25s wait is NOT implemented; returns immediately)
r.get('/conversations/:id/poll', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  if (!(await requireMember(db, id, a.userId))) return fail(c, 404, 'not_found', 'Conversation not found');
  const since = Number(c.req.query('since') ?? 0);
  const rows = await db.select().from(messages).where(and(eq(messages.conversationId, id), sql`${messages.createdAt} > ${since}`)).orderBy(messages.createdAt).limit(50);
  return ok(c, { items: rows, realtime: 'long-poll fallback; Durable Object WebSocket is used in production (see ChatRoom.ts)' });
});
// POST /api/conversations/:id/read — mark read
r.post('/conversations/:id/read', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const id = c.req.param('id');
  const member = await requireMember(db, id, a.userId);
  if (!member) return fail(c, 404, 'not_found', 'Conversation not found');
  await db.update(conversationMembers).set({ lastReadAt: Date.now() }).where(eq(conversationMembers.id, member.id));
  await db.update(messages).set({ readAt: Date.now() }).where(and(eq(messages.conversationId, id), sql`${messages.senderId} != ${a.userId}`, sql`${messages.readAt} IS NULL`));
  return ok(c, { read: true });
});
// GET /api/messages/:conversationId?cursor&limit
r.get('/messages/:conversationId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const convId = c.req.param('conversationId');
  if (!(await requireMember(db, convId, a.userId))) return fail(c, 404, 'not_found', 'Conversation not found');
  const limit = pageLimit(c.req.query('limit'));
  const cursor = decodeCursor(c.req.query('cursor'));
  let rows = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(desc(messages.createdAt)).limit(limit + 1);
  if (cursor) rows = rows.filter((m: any) => m.createdAt < cursor.createdAt || (m.createdAt === cursor.createdAt && m.id < cursor.id));
  const hasMore = rows.length > limit; const items = rows.slice(0, limit).reverse();
  return ok(c, { items, nextCursor: hasMore && items.length ? encodeCursor(items[0].createdAt, items[0].id) : null });
});
// POST /api/messages/:conversationId {body}
r.post('/messages/:conversationId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const convId = c.req.param('conversationId');
  if (!(await requireMember(db, convId, a.userId))) return fail(c, 404, 'not_found', 'Conversation not found');
  const body = await parseBody(c); const parsed = messageCreateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid message', parsed.error.flatten());
  const [msg] = await db.insert(messages).values({ conversationId: convId, senderId: a.userId, body: parsed.data.body, type: parsed.data.type ?? 'text' }).returning();
  await db.update(conversations).set({ updatedAt: Date.now() }).where(eq(conversations.id, convId));
  // Notify the other member(s)
  const members = await db.select().from(conversationMembers).where(eq(conversationMembers.conversationId, convId));
  for (const m of members) if (m.userId !== a.userId) await notify(db, m.userId, 'message', 'New message', `${a.user.displayName}: ${parsed.data.body.slice(0, 120)}`, a.userId, { conversationId: convId });
  // Production: broadcast via Durable Object CHAT_ROOM.fetch(`.../broadcast`). Local dev: poll endpoint above.
  return ok(c, { message: msg }, 201);
});
export default r;
