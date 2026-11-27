// Create the FIRST admin. Run from apps/worker:  npm run seed:admin
// Prints a ONE-TIME password to the terminal only — never writes it to a file.
// Usage: npm run seed:admin -- admin@example.com "Admin Name"  (or env ADMIN_EMAIL / ADMIN_NAME)
import { getDb } from '../apps/worker/src/db/index.js';
import { seedAdmin } from '../apps/worker/src/db/seed-data.js';
const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? 'admin@crushandconfo.local';
const name = process.argv[3] ?? process.env.ADMIN_NAME ?? 'Admin';
const db = getDb({ DATABASE_PATH: process.env.DATABASE_PATH });
const { admin, password, existed } = await seedAdmin(db, email, name);
if (existed) { console.log(`Admin already exists: ${admin.email} (id ${admin.id}). No new password was generated.`); }
else {
  console.log('First admin created:');
  console.log(`  Email: ${admin.email}`);
  console.log(`  Name: ${admin.name}  Role: ${admin.role}`);
  console.log(`  ONE-TIME PASSWORD (save it now, it will not be shown again): ${password}`);
  console.log('  Login at POST /api/admin/login');
}
