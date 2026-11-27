import { getCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { getDb, type Env } from '../db/index.js';
import { users, adminUsers } from '../db/schema.js';
import { verifySession, SESSION_COOKIE } from './session.js';
import { fail } from '../lib/errors.js';

export type AuthedContext = { userId: string; user: typeof users.$inferSelect; adminId?: string };
export function getSecret(c: any): string {
  return (c.env?.SESSION_SECRET as string) ?? process.env.SESSION_SECRET ?? 'dev-only-secret-change-me';
}
export async function requireAuth(c: any, next: any) {
  const db = getDb(c.env as Env);
  const sess = verifySession(getSecret(c), getCookie(c, SESSION_COOKIE));
  if (!sess || sess.id.startsWith('admin:')) return fail(c, 401, 'unauthorized', 'Login required');
  const [user] = await db.select().from(users).where(eq(users.id, sess.id)).limit(1);
  if (!user || user.status !== 'active' || user.deletedAt) return fail(c, 401, 'unauthorized', 'Login required');
  c.set('auth', { userId: user.id, user });
  await next();
}
export async function optionalAuth(c: any, next: any) {
  try {
    const db = getDb(c.env as Env);
    const sess = verifySession(getSecret(c), getCookie(c, SESSION_COOKIE));
    if (sess && !sess.id.startsWith('admin:')) {
      const [user] = await db.select().from(users).where(eq(users.id, sess.id)).limit(1);
      if (user && user.status === 'active' && !user.deletedAt) c.set('auth', { userId: user.id, user });
    }
  } catch { /* anonymous */ }
  await next();
}
export async function requireAdmin(c: any, next: any) {
  const db = getDb(c.env as Env);
  const sess = verifySession(getSecret(c), getCookie(c, SESSION_COOKIE));
  if (!sess || !sess.id.startsWith('admin:')) return fail(c, 401, 'unauthorized', 'Admin login required');
  const adminId = sess.id.slice('admin:'.length);
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1);
  if (!admin) return fail(c, 401, 'unauthorized', 'Admin login required');
  c.set('admin', admin);
  await next();
}
export async function audit(db: any, adminId: string | null, action: string, targetType?: string | null, targetId?: string | null, details?: Record<string, unknown>) {
  const { auditLogs } = await import('../db/schema.js');
  await db.insert(auditLogs).values({ adminId, action, targetType: targetType ?? null, targetId: targetId ?? null, details: details ? JSON.stringify(details) : null });
}
