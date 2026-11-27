import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { profiles } from '../db/schema.js';
import { getDb, type Env } from '../db/index.js';
import { ok, fail } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { createRequire } from 'node:module';

// Photo uploads — profile avatars.
// Production (Cloudflare): the file is stored in the R2 bucket bound as
// UPLOADS and served back through GET /api/uploads/:key below, so no public
// bucket is needed. Local dev (no R2 binding): the file is stored under
// <project-root>/data/uploads/ and served from disk by the same route.
// The node:fs access is built at runtime (createRequire + computed
// specifier) so the Workers bundler never tries to statically resolve it —
// this branch only runs when env.UPLOADS is absent, i.e. never on Cloudflare.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function localFs(): any {
  const req = createRequire(import.meta.url);
  return req('node:' + 'fs');
}
function localPath(): any {
  const req = createRequire(import.meta.url);
  const path = req('node:' + 'path');
  const url = req('node:' + 'url');
  const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', '..', '..');
  return { path, dir: path.join(root, 'data', 'uploads') };
}

const r = new Hono<{ Bindings: Env }>();

// POST /api/uploads/avatar — auth required. multipart/form-data, field "file".
r.post('/avatar', requireAuth, async (c) => {
  const db = getDb(c.env); const a: any = (c as any).get('auth');
  let form: FormData;
  try { form = await c.req.formData(); } catch { return fail(c, 400, 'invalid', 'Expected a multipart form upload'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail(c, 400, 'invalid', 'No photo file was uploaded');
  if (!ALLOWED.has(file.type)) return fail(c, 400, 'invalid', 'Only JPG, PNG, WebP or GIF photos are allowed');
  if (file.size > MAX_BYTES) return fail(c, 400, 'invalid', 'Photo must be smaller than 5 MB');
  const key = `avatar-${a.userId}-${crypto.randomUUID()}.${EXT[file.type]}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const r2: any = (c.env as any).UPLOADS;
  if (r2) {
    await r2.put(key, bytes, { httpMetadata: { contentType: file.type } });
  } else {
    const fs = localFs(); const { path, dir } = localPath();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, key), Buffer.from(bytes));
  }
  const url = `/api/uploads/${key}`;
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, a.userId)).limit(1);
  if (existing) await db.update(profiles).set({ avatarUrl: url, updatedAt: Date.now() }).where(eq(profiles.id, existing.id));
  else await db.insert(profiles).values({ userId: a.userId, avatarUrl: url, profileCompletion: 30 });
  return ok(c, { url }, 201);
});

// GET /api/uploads/:key — public: avatars are public profile data.
r.get('/:key', async (c) => {
  const key = c.req.param('key');
  if (!/^[A-Za-z0-9._-]+$/.test(key)) return fail(c, 400, 'invalid', 'Invalid file name');
  const r2: any = (c.env as any).UPLOADS;
  if (r2) {
    const obj = await r2.get(key);
    if (!obj) return fail(c, 404, 'not_found', 'Photo not found');
    return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
  }
  const fs = localFs(); const { path, dir } = localPath();
  const file = path.join(dir, key);
  if (!fs.existsSync(file)) return fail(c, 404, 'not_found', 'Photo not found');
  const data = fs.readFileSync(file);
  const ext = key.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return new Response(data, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
});

export default r;
