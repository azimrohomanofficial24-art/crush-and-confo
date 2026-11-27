// Local Node dev server: Hono over @hono/node-server + local SQLite file.
// Run: cd apps/worker && npm run dev   (or npm run dev:worker)
// Env: DATABASE_PATH (default ./data/crush-and-confo.db), PORT (default 8787),
// Env: DATABASE_PATH (default <project-root>/data/crush-and-confo.db), PORT (default 8787),
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_DB_PATH } from './db/index.js';

const env: Record<string, string | undefined> = { ...process.env };
const dbPath = env.DATABASE_PATH ?? DEFAULT_DB_PATH;
mkdirSync(dirname(dbPath) === '.' ? '.' : dirname(dbPath), { recursive: true });
// Apply local migrations on startup if the DB file is fresh / tables missing.
try {
  const raw = new DatabaseSync(dbPath);
  raw.exec('PRAGMA foreign_keys = ON;');
  const hasUsers = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!hasUsers) {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const sql = readFileSync(join(root, 'migrations', '0001_initial.sql'), 'utf8');
    raw.exec(sql);
    console.log('[worker] Applied migrations/0001_initial.sql');
  }
  raw.close();
} catch (e) { console.error('[worker] migration check failed', e); }

const app = createApp(env as any);
const port = Number(process.env.PORT ?? 8787);
console.log(`[worker] Crush and Confo API listening on http://localhost:${port} (SQLite: ${dbPath})`);
serve({ fetch: app.fetch, port });
