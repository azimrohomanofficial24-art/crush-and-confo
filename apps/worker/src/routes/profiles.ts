import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { users, profiles, userPreferences, interests, userInterests } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { profileUpdateSchema, preferencesSchema } from '../lib/validation.js';
import { parseBody, parseJson, publicUserRow } from '../lib/helpers.js';

const r = new Hono<{ Bindings: Env }>();
function completion(p: any): number {
  const fields = [p.bio, p.avatarUrl, p.city, p.occupation, p.education, p.intentions];
  return Math.round(30 + (fields.filter(Boolean).length / fields.length) * 70);
}
r.get('/me', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, a.userId)).limit(1);
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.userId, a.userId)).limit(1);
  const uiRows = await db.select().from(userInterests).where(eq(userInterests.userId, a.userId));
  const ints = uiRows.length ? await db.select().from(interests).where(inArray(interests.id, uiRows.map((x: any) => x.interestId))) : [];
  return ok(c, { profile: p ?? null, preferences: pref ? { ...pref, preferredGenders: parseJson<string[]>(pref.preferredGenders, []) } : null, interests: ints });
});
r.put('/me', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid profile data', parsed.error.flatten());
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, a.userId)).limit(1);
  const merged = { ...(existing ?? {}), ...parsed.data };
  const values = { ...parsed.data, showAge: parsed.data.showAge === undefined ? undefined : parsed.data.showAge ? 1 : 0, isPrivate: parsed.data.isPrivate === undefined ? undefined : parsed.data.isPrivate ? 1 : 0, profileCompletion: completion(merged), updatedAt: Date.now() };
  if (existing) await db.update(profiles).set(values).where(eq(profiles.id, existing.id));
  else await db.insert(profiles).values({ userId: a.userId, ...values });
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, a.userId)).limit(1);
  return ok(c, { profile: p });
});
// GET /api/profiles/:userId
r.get('/:userId', async (c) => {
  const db = getDb(c.env); const [u] = await db.select().from(users).where(eq(users.id, c.req.param('userId'))).limit(1);
  if (!u) return fail(c, 404, 'not_found', 'User not found');
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).limit(1);
  return ok(c, { user: publicUserRow(u, p), profile: p ?? null });
});
// PUT /api/profiles/me/preferences
r.put('/me/preferences', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) return fail(c, 400, 'validation_error', 'Invalid preferences', parsed.error.flatten());
  const v = parsed.data;
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, a.userId)).limit(1);
  const values = { minAge: v.minAge, maxAge: v.maxAge, preferredGenders: JSON.stringify(v.preferredGenders), maxDistanceKm: v.maxDistanceKm ?? null, intentions: v.intentions ?? null, showMe: v.showMe === false ? 0 : 1, updatedAt: Date.now() };
  if (existing) await db.update(userPreferences).set(values).where(eq(userPreferences.id, existing.id));
  else await db.insert(userPreferences).values({ userId: a.userId, ...values });
  return ok(c, { preferences: { userId: a.userId, ...v } });
});
// PUT /api/profiles/me/interests { interestIds: string[] }
r.put('/me/interests', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth'); const body = await parseBody(c);
  const ids: string[] = Array.isArray(body.interestIds) ? body.interestIds : [];
  const found = ids.length ? await db.select().from(interests).where(eq(interests.id, ids[0])) : [];
  // validate all ids exist (simple loop, small lists)
  for (const id of ids) { const [row] = await db.select().from(interests).where(eq(interests.id, id)).limit(1); if (!row) return fail(c, 400, 'validation_error', `Unknown interest ${id}`); }
  await db.delete(userInterests).where(eq(userInterests.userId, a.userId));
  for (const id of ids) await db.insert(userInterests).values({ userId: a.userId, interestId: id });
  return ok(c, { interestIds: ids });
});
export default r;
