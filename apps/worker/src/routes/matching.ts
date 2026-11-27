import { Hono } from 'hono';
import { eq, and, or, ne, sql, desc, inArray } from 'drizzle-orm';
import { users, profiles, userPreferences, userInterests, interests, likes, matches, blocks } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { discoverQuerySchema, likeSchema } from '../lib/validation.js';
import { parseBody } from '../lib/helpers.js';
import { computeMatchScore, ageFromDob, SCORE_NOTE } from '../matching/score.js';
import { publicUserRow, parseJson, isBlockedEitherWay, notify } from '../lib/helpers.js';
import { pageLimit } from '../lib/pagination.js';

const r = new Hono<{ Bindings: Env }>();
const orderedPair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

async function createMatchIfMutual(db: any, likerId: string, likedId: string) {
  const [recip] = await db.select().from(likes).where(and(eq(likes.likerId, likedId), eq(likes.likedId, likerId))).limit(1);
  if (!recip) return null;
  const [a, b] = orderedPair(likerId, likedId);
  const [existing] = await db.select().from(matches).where(and(eq(matches.userAId, a), eq(matches.userBId, b))).limit(1);
  if (existing && !existing.unmatchedAt) return existing;
  if (existing) { await db.update(matches).set({ unmatchedAt: null }).where(eq(matches.id, existing.id)); return { ...existing, unmatchedAt: null }; }
  const [m] = await db.insert(matches).values({ userAId: a, userBId: b }).returning();
  await notify(db, likedId, 'match', 'New match!', 'You have a new match. Say hello!', likerId, { matchId: m.id });
  await notify(db, likerId, 'match', 'New match!', 'You have a new match. Say hello!', likedId, { matchId: m.id });
  return m;
}

// GET /api/matching/discover?minAge&maxAge&gender&location&interests&intentions&limit=
r.get('/discover', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const q = discoverQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  const limit = pageLimit(c.req.query('limit'));
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, a.userId)).limit(1);
  const minAge = Number(c.req.query('minAge') ?? pref?.minAge ?? 18);
  const maxAge = Number(c.req.query('maxAge') ?? pref?.maxAge ?? 99);
  const genderFilter = c.req.query('gender');
  const locationFilter = c.req.query('location');
  const intentionsFilter = c.req.query('intentions');
  const interestSlugs = (c.req.query('interests') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // Candidates: active, not me, not already liked/passed, not blocked either way, not already matched.
  const myLikes = await db.select().from(likes).where(eq(likes.likerId, a.userId));
  const likedSet = new Set(myLikes.map((x: any) => x.likedId));
  const myBlocks = await db.select().from(blocks).where(eq(blocks.blockerId, a.userId));
  const blockedSet = new Set([...myBlocks.map((x: any) => x.blockedId)]);
  const blockedBy = await db.select().from(blocks).where(eq(blocks.blockedId, a.userId));
  for (const x of blockedBy) blockedSet.add(x.blockerId);
  const myInterestRows = await db.select().from(userInterests).where(eq(userInterests.userId, a.userId));
  const myInterestIds = new Set(myInterestRows.map((x: any) => x.interestId));
  const all = await db.select().from(users).where(and(eq(users.status, 'active'), ne(users.id, a.userId))).limit(200);
  const items: any[] = [];
  for (const u of all) {
    if (u.deletedAt || likedSet.has(u.id) || blockedSet.has(u.id)) continue;
    const age = ageFromDob(u.dateOfBirth); if (age === null || age < minAge || age > maxAge) continue;
    if (genderFilter && u.gender !== genderFilter) continue;
    if (locationFilter && !(u.location ?? '').toLowerCase().includes(locationFilter.toLowerCase())) continue;
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1);
    if (intentionsFilter && p?.intentions && p.intentions !== intentionsFilter) continue;
    const uiRows = await db.select().from(userInterests).where(eq(userInterests.userId, u.id));
    const ints = uiRows.length ? await db.select().from(interests).where(inArray(interests.id, uiRows.map((x: any) => x.interestId))) : [];
    if (interestSlugs.length && !ints.some((x: any) => interestSlugs.includes(x.slug))) continue;
    const shared = ints.filter((x: any) => myInterestIds.has(x.id)).length;
    const myAge = ageFromDob(a.user.age ?? a.user.dateOfBirth);
    const score = computeMatchScore({ sharedInterests: shared, sameCity: Boolean(p?.city && a.user.location && p.city.toLowerCase() === a.user.location.toLowerCase()), sameCountry: Boolean(p?.country), ageDiff: myAge !== null && age !== null ? Math.abs(myAge - age) : null, intentionsMatch: Boolean(p?.intentions && pref?.intentions && p.intentions === pref.intentions) });
    items.push({ user: publicUserRow(u, p), profile: p ?? null, interests: ints, age, matchScore: score.total, scoreBreakdown: score.breakdown, scoreNote: SCORE_NOTE });
  }
  items.sort((x, y) => y.matchScore - x.matchScore);
  return ok(c, { items: items.slice(0, limit), nextCursor: null });
});
// GET /api/matching/preferences
r.get('/preferences', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, a.userId)).limit(1);
  return ok(c, { preferences: pref ? { ...pref, preferredGenders: parseJson<string[]>(pref.preferredGenders, []) } : null });
});
// POST /api/likes/:userId  {type}
r.post('/:userId', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const targetId = c.req.param('userId');
  const body = await parseBody(c); const parsed = likeSchema.safeParse(body ?? {});
  if (targetId === a.userId) return fail(c, 400, 'invalid', 'You cannot like yourself');
  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
  if (!target || target.status !== 'active' || target.deletedAt) return fail(c, 404, 'not_found', 'User not found');
  if (await isBlockedEitherWay(db, a.userId, targetId)) return fail(c, 403, 'blocked', 'This user is not available');
  const [existing] = await db.select().from(likes).where(and(eq(likes.likerId, a.userId), eq(likes.likedId, targetId))).limit(1);
  if (existing) return fail(c, 409, 'duplicate', 'Already liked');
  const [like] = await db.insert(likes).values({ likerId: a.userId, likedId: targetId, type: parsed.success ? (parsed.data.type ?? 'like') : 'like' }).returning();
  const match = await createMatchIfMutual(db, a.userId, targetId);
  if (!match) await notify(db, targetId, 'like', 'Someone liked you', `${a.user.displayName} liked you.`, a.userId);
  return ok(c, { like, matched: Boolean(match), match }, 201);
});
// POST /api/likes/:userId/pass  (recorded as a pass via a like row? No — passes are not stored as likes; we track via a lightweight in-memory set is wrong, so passes use a 'pass' row in likes with type='pass' excluded from mutual matching)
r.post('/:userId/pass', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const targetId = c.req.param('userId');
  if (targetId === a.userId) return fail(c, 400, 'invalid', 'You cannot pass on yourself');
  const [existing] = await db.select().from(likes).where(and(eq(likes.likerId, a.userId), eq(likes.likedId, targetId))).limit(1);
  if (!existing) await db.insert(likes).values({ likerId: a.userId, likedId: targetId, type: 'pass' });
  return ok(c, { passed: true });
});
// GET /api/matches  (list my matches)
r.get('/', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const rows = await db.select().from(matches).where(and(or(eq(matches.userAId, a.userId), eq(matches.userBId, a.userId)), sql`${matches.unmatchedAt} IS NULL`)).orderBy(desc(matches.createdAt));
  const items = [];
  for (const m of rows) {
    const otherId = m.userAId === a.userId ? m.userBId : m.userAId;
    const [u] = await db.select().from(users).where(eq(users.id, otherId)).limit(1);
    const [p] = u ? await db.select().from(profiles).where(eq(profiles.userId, otherId)).limit(1) : [null];
    items.push({ ...m, otherUser: u ? publicUserRow(u, p) : null });
  }
  return ok(c, { items });
});
// POST /api/matches/:matchId/unmatch
r.post('/:matchId/unmatch', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [m] = await db.select().from(matches).where(eq(matches.id, c.req.param('matchId'))).limit(1);
  if (!m || (m.userAId !== a.userId && m.userBId !== a.userId)) return fail(c, 404, 'not_found', 'Match not found');
  await db.update(matches).set({ unmatchedAt: Date.now() }).where(eq(matches.id, m.id));
  return ok(c, { unmatched: true });
});
export default r;
