// Cursor pagination: cursor is base64url of "<createdAt>:<id>" (descending).
export function encodeCursor(createdAt: number, id: string) {
  return Buffer.from(`${createdAt}:${id}`).toString('base64url');
}
export function decodeCursor(cursor?: string | null): { createdAt: number; id: string } | null {
  if (!cursor) return null;
  try { const [ts, id] = Buffer.from(cursor, 'base64url').toString('utf8').split(':'); const n = Number(ts); if (!n || !id) return null; return { createdAt: n, id }; } catch { return null; }
}
export function pageLimit(q: unknown): number {
  const n = Number(q); return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 1), 50) : 20;
}
