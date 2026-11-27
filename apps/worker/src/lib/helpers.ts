import { eq, or, and } from 'drizzle-orm';
import { users, profiles, blocks, notifications } from '../db/schema.js';
import { ageFromDob } from '../matching/score.js';

export function publicUserRow(u: typeof users.$inferSelect, p?: typeof profiles.$inferSelect | null) {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: p?.avatarUrl ?? null, age: ageFromDob(u.dateOfBirth), location: u.location ?? p?.city ?? null };
}
export function safeUser(u: typeof users.$inferSelect) {
  const { passwordHash: _p, ...rest } = u as any;
  return { ...rest, emailVerified: Boolean(u.emailVerified) };
}
export async function isBlockedEitherWay(db: any, a: string, b: string): Promise<boolean> {
  const rows = await db.select().from(blocks).where(or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)))).limit(1);
  return rows.length > 0;
}
export async function notify(db: any, userId: string, type: string, title: string, body: string | null, relatedUserId?: string | null, data?: Record<string, unknown>) {
  await db.insert(notifications).values({ userId, type, title, body, data: data ? JSON.stringify(data) : null, relatedUserId: relatedUserId ?? null });
}
export function parseJson<T>(v: string | null | undefined, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}
export function parseBody(c: any) { return c.req.json().catch(() => ({})); }

/** Count rows by fetching them (dev-scale; D1 production should use SQL COUNT). */
export async function countRows(db: any, table: any, where?: any): Promise<number> {
  const q = db.select().from(table);
  const rows = where ? await q.where(where) : await q;
  return rows.length;
}
