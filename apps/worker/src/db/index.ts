// Local Node uses drizzle-orm/sqlite-proxy over Node's built-in node:sqlite
// (DatabaseSync). Drizzle ships no node:sqlite driver, and better-sqlite3 needs
// a native build that this sandbox blocks — so the proxy callback below is the
// local driver. D1 (Workers) still uses drizzle-orm/d1.
import { drizzle as drizzleProxy, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';
// Default SQLite file: <project-root>/data/crush-and-confo.db (absolute, so it
// is the same no matter which directory the server/seed is launched from).
// Guarded: Workers modules have no import.meta.url, so computing this at
// load time would throw during Cloudflare's validation — in Workers this
// path is never used anyway (env.DB / D1 is always present there).
export const DEFAULT_DB_PATH: string = (() => {
  try {
    const url = (import.meta as any)?.url as string | undefined;
    if (!url) return 'data/crush-and-confo.db';
    return join(dirname(fileURLToPath(url)), '..', '..', '..', '..', 'data', 'crush-and-confo.db');
  } catch {
    return 'data/crush-and-confo.db';
  }
})();

export type AppDb = SqliteRemoteDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export interface Env {
  DB?: any; // Cloudflare D1 binding (wrangler.jsonc, owned by Agent C)
  UPLOADS?: any; // Cloudflare R2 bucket binding (wrangler.jsonc)
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  APP_URL?: string;
  DATABASE_PATH?: string;
  [key: string]: unknown;
}
let nodeDb: SqliteRemoteDatabase<typeof schema> | null = null;
let DatabaseSyncCtor: any = null;
/**
 * Load Node's built-in node:sqlite lazily, only for local Node runs.
 * The specifier is built at runtime so the Workers bundler (esbuild) never
 * tries to statically resolve node:sqlite, which it cannot bundle — this
 * branch only runs when env.DB (D1) is absent, i.e. never on Cloudflare.
 */
function loadDatabaseSync(): any {
  if (!DatabaseSyncCtor) {
    const req = createRequire(import.meta.url);
    DatabaseSyncCtor = req('node:' + 'sqlite').DatabaseSync;
  }
  return DatabaseSyncCtor;
}
/** Workers: pass env.DB (D1). Local Node: SQLite file (DATABASE_PATH or ./data/crush-and-confo.db). */
export function getDb(env: Env): AppDb {
  if (env.DB) return drizzleD1(env.DB, { schema });
  if (!nodeDb) {
    const DatabaseSync = loadDatabaseSync();
    const path = (env.DATABASE_PATH as string) ?? process.env.DATABASE_PATH ?? DEFAULT_DB_PATH;
    const sqlite = new DatabaseSync(path);
    sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    // sqlite-proxy expects rows as ARRAYS of values (in query column order),
    // not objects — drizzle maps them onto fields by position. DatabaseSync
    // returns objects keyed in column order, so Object.values() is the bridge.
    // For 'get', rows is the single row array (or undefined when no match).
    nodeDb = drizzleProxy(async (sql, params, method): Promise<any> => {
      const stmt = sqlite.prepare(sql);
      if (method === 'run') { stmt.run(...(params as any[])); return { rows: [] }; }
      if (method === 'get') { const row = stmt.get(...(params as any[])) as Record<string, unknown> | undefined; return { rows: row ? Object.values(row) : undefined }; }
      const rows = stmt.all(...(params as any[])) as Record<string, unknown>[];
      return { rows: rows.map((r) => Object.values(r)) };
    }, { schema });
  }
  return nodeDb;
}

export { schema };
