import { createHmac, timingSafeEqual } from 'node:crypto';
// Stateless signed session cookie (HMAC-SHA256, no DB session table).
// Cookie: session=<userId>.<exp>.<sig>  (sig = HMAC(secret, userId.exp))
// Admin sessions use the same format with prefix "admin:" in the payload id.
export const SESSION_COOKIE = 'cc_session';
export function signSession(secret: string, id: string, maxAgeSec = 7 * 24 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const payload = `${id}.${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}
export function verifySession(secret: string, cookie: string | undefined): { id: string } | null {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;
  const [id, expStr, sig] = parts; const exp = Number(expStr);
  if (!id || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = createHmac('sha256', secret).update(`${id}.${exp}`).digest('hex');
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id };
}
export function sessionCookieHeader(secret: string, id: string): string {
  return `${SESSION_COOKIE}=${signSession(secret, id)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
