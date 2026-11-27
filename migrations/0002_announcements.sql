-- Crush and Confo — 0002_announcements.sql
-- Adds the announcements table (admin broadcasts shown on the home dashboard).
-- Apply locally: cd apps/worker && npm run migrate
-- D1: wrangler d1 migrations apply <db>
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'all', active INTEGER NOT NULL DEFAULT 1, created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS announcements_created_idx ON announcements(created_at);
CREATE INDEX IF NOT EXISTS announcements_active_idx ON announcements(active);
