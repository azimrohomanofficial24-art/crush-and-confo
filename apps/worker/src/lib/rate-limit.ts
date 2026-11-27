// Simple in-memory rate limiter for dev / local Node.
// In Workers, replace with KV-backed limiting (see README note in final report).
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || now > b.resetAt) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (b.count >= max) return false; b.count += 1; return true;
}
export function rateLimitMiddleware(max: number, windowMs: number) {
  return async (c: any, next: any) => {
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local';
    if (!rateLimit(`${c.req.path}:${ip}`, max, windowMs)) {
      return c.json({ ok: false, error: { code: 'rate_limited', message: 'Too many requests, try again later' } }, 429);
    }
    await next();
  };
}
