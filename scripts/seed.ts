// Seed demo data. Run from apps/worker:  npm run seed
// Uses the local SQLite file (DATABASE_PATH or ./data/crush-and-confo.db).
// Demo password for all seeded users: Demo1234!
import { getDb } from '../apps/worker/src/db/index.js';
import { seedDb, DEMO_PASSWORD } from '../apps/worker/src/db/seed-data.js';
const db = getDb({ DATABASE_PATH: process.env.DATABASE_PATH });
const result = await seedDb(db);
console.log('Seed complete.');
console.log(`- John Bay @john_bay (id ${result.john.id})`);
console.log(`- Samiya @samiya (id ${result.samiya.id}), match ${result.matchId}`);
console.log(`- Arif @arif_h (id ${result.arif.id})`);
console.log(`Demo password for all seeded users: ${DEMO_PASSWORD}`);
