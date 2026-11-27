// Applies migrations/*.sql in order to the local SQLite file (dev) or D1.
// Usage: npm run migrate   (from apps/worker)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const dbPath = process.env.DATABASE_PATH ?? join(root, 'data', 'crush-and-confo.db');
import { mkdirSync } from 'node:fs';
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
const dir = join(root, 'migrations');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
  console.log(`Applying ${f} ...`);
  db.exec(readFileSync(join(dir, f), 'utf8'));
}
console.log(`Migrations applied to ${dbPath}`);
