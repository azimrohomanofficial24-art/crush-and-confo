import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb, type Env } from './db/index.js';
import { ok, fail } from './lib/errors.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import profiles from './routes/profiles.js';
import matching from './routes/matching.js';
import messages from './routes/messages.js';
import posts from './routes/posts.js';
import confessions from './routes/confessions.js';
import uploads from './routes/uploads.js';
import misc from './routes/misc.js';
import admin from './routes/admin.js';

export function createApp(env: Env = {}) {
  const app = new Hono<{ Bindings: Env }>();
  app.use('*', cors({ origin: (origin) => origin ?? '*', credentials: true }));
  app.get('/api/health', (c) => ok(c, { status: 'ok', service: 'crush-and-confo', time: Date.now() }));
  app.get('/api', (c) => ok(c, { service: 'Crush and Confo API', version: '0.1.0', matchScoreNote: 'Match score is a transparent heuristic and is not scientifically validated.' }));
  app.route('/api/auth', auth);
  app.route('/api/users', users);
  app.route('/api/profiles', profiles);
  // matching.ts owns /api/matching/*, /api/likes/* and /api/matches/*
  app.route('/api/matching', matching);
  app.route('/api/likes', matching);
  app.route('/api/matches', matching);
  app.route('/api', messages); // /api/conversations/*, /api/messages/*
  app.route('/api', posts); // /api/posts/*, /api/comments/*, /api/community/*
  app.route('/api', confessions); // /api/confessions/*, /api/comments/confessions/*
  app.route('/api/uploads', uploads); // /api/uploads/avatar, /api/uploads/:key
  app.route('/api', misc); // /api/notifications/*, /api/reports/*, /api/blocks/*
  app.route('/api', admin); // /api/admin/*
  app.notFound((c) => fail(c, 404, 'not_found', 'Route not found'));
  app.onError((err, c) => { console.error(err); return fail(c, 500, 'internal_error', 'Internal server error'); });
  return app;
}
export type App = ReturnType<typeof createApp>;
