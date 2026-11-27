import type { Context } from 'hono';
export function ok<T>(c: Context, data: T, status = 200): Response { return c.json({ ok: true, data }, status as any); }
export function fail(c: Context, status: number, code: string, message: string, details?: unknown): Response {
  return c.json({ ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } } as any, status as any);
}
export class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
