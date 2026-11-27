# API Reference — Crush and Confo

Base URL (local): `http://localhost:5173` (Vite proxies `/api` to the worker on
`http://localhost:8787`). Production: the Workers address from `wrangler.jsonc`.

All responses use the envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "not_found", "message": "Route not found" } }
```

Auth is a secure HttpOnly session cookie. `GET /api/health` and `GET /api`
are public. Most routes require auth (`requireAuth`); admin routes require an
admin session (`requireAdmin`, role-checked server-side on every admin route).

> **Match score — not scientifically validated.** Match % is a transparent
> heuristic: shared interests 10 pts each (max 40), same city 25 / same country
> 12, age proximity ≤2y: 20, ≤5y: 15, ≤10y: 8, else 0, same intention 15;
> total max 100. `GET /api/matching/discover` returns the score **with its
> breakdown** so it is explainable. `GET /api` also carries the note
> "Match score is a transparent heuristic and is not scientifically validated."

This document lists the routes as implemented in `apps/worker/src/routes/`
and mounted in `apps/worker/src/app.ts` (2026-11-27). Where a route is planned
by the CONTRACT but not yet implemented, it is marked **not implemented**.

## Health / meta

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{ status: 'ok', service: 'crush-and-confo', time }` |
| GET | `/api` | — | Service info + match-score note |

## Auth — `/api/auth`

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | — | `registerSchema`; 18+ enforced from DOB; creates user + profile |
| POST | `/api/auth/login` | — | Email/username + password |
| POST | `/api/auth/logout` | — | Clears session cookie |
| POST | `/api/auth/verify-email` | — | Single-use expiring token |
| POST | `/api/auth/forgot-password` | — | Sends reset (dev mode: logged, see docs/EMAIL.md) |
| POST | `/api/auth/reset-password` | — | Token + new password |
| GET | `/api/auth/me` | user | Current user |
| DELETE | `/api/auth/me` | user | Delete own account |

## Users — `/api/users`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/users/search?q=` | optional | Search users |
| GET | `/api/users/:id` | optional | Public user by id |
| GET | `/api/users/by-username/:username` | optional | Public user by username |

## Profiles — `/api/profiles`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/profiles/me` | user | Own profile |
| PUT | `/api/profiles/me` | user | Update profile (`profileUpdateSchema`) |
| GET | `/api/profiles/:userId` | — | Public profile |
| PUT | `/api/profiles/me/preferences` | user | Matching preferences (`preferencesSchema`) |
| PUT | `/api/profiles/me/interests` | user | Replace own interests |

## Matching / likes / matches — `/api/matching`, `/api/likes`, `/api/matches`

All under one router (`apps/worker/src/routes/matching.ts`).

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/matching/discover` | user | Candidates (active, not self, not already liked/passed, not blocked, not matched) with score + breakdown |
| GET | `/api/matching/preferences` | user | Own matching preferences |
| POST | `/api/likes/:userId` | user | Like (or super-like via `{ type: 'super' }`); 400 on self-like; duplicate likes rejected |
| POST | `/api/likes/:userId/pass` | user | Pass; 400 on self-pass |
| GET | `/api/matches` | user | Own matches |
| POST | `/api/matches/:matchId/unmatch` | user | Unmatch |

Chat opens only after a mutual match. Blocked/suspended users are excluded
from discovery.

## Conversations & messages — `/api/conversations`, `/api/messages`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/conversations` | user | Own conversations |
| POST | `/api/conversations` | user | Create (match-gated) |
| GET | `/api/conversations/:id` | user | One conversation |
| GET | `/api/conversations/:id/poll` | user | Poll for new messages |
| POST | `/api/conversations/:id/read` | user | Mark read |
| GET | `/api/messages/:conversationId` | user | List messages (cursor pagination) |
| POST | `/api/messages/:conversationId` | user | Send (`messageCreateSchema`, max 5000 chars) |

Real-time typing/presence goes through the `ChatRoom` Durable Object:
WebSocket upgrade at `/api/chat/<roomId>` (see `apps/worker/src/index.ts` and
`apps/worker/src/do/ChatRoom.ts`). If the DO is not bound, `/api/chat/*`
returns 503 with code `unavailable`.

## Posts / comments / community — `/api/posts`, `/api/comments`, `/api/community`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/community/feed` | optional | Community feed |
| GET | `/api/community/hashtags` | — | Trending hashtags |
| GET | `/api/community/search?q=` | optional | Search people/posts/confessions |
| POST | `/api/community/follow/:userId` | user | Follow |
| DELETE | `/api/community/follow/:userId` | user | Unfollow |
| GET | `/api/community/followers/:userId` | — | Followers |
| GET | `/api/community/following/:userId` | — | Following |
| POST | `/api/posts` | user | Create (`postCreateSchema`, body 1–2000 chars) |
| GET | `/api/posts` | optional | List posts (`?authorId=` filters by author) |
| GET | `/api/posts/:id` | optional | One post |
| DELETE | `/api/posts/:id` | user | Delete own post |
| POST | `/api/posts/:id/like` | user | Like post |
| DELETE | `/api/posts/:id/like` | user | Unlike post |
| POST | `/api/posts/:id/save` | user | Save post |
| DELETE | `/api/posts/:id/save` | user | Unsave post |
| GET | `/api/posts/saved/mine` | user | Saved posts |
| GET | `/api/comments/posts/:postId` | — | Comments on a post |
| POST | `/api/comments/posts/:postId` | user | Comment (`commentCreateSchema`, max 1000) |

## Confessions — `/api/confessions`

Anonymous confessions **never expose `authorId` in public responses**; the
author id is kept server-side for admin investigation only.

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/confessions` | optional | List (`?sort=latest\|trending`, `?category=` filter, cursor pagination) |
| GET | `/api/confessions/trending` | optional | Redirects to list with `sort=trending` |
| GET | `/api/confessions/latest` | optional | Redirects to list with `sort=latest` |
| GET | `/api/confessions/mine` | user | Own confessions |
| GET | `/api/confessions/saved/mine` | user | Saved confessions |
| GET | `/api/confessions/:id` | optional | One confession |
| POST | `/api/confessions` | user | Create (`confessionCreateSchema`, body 1–2000 chars) |
| DELETE | `/api/confessions/:id` | user | Delete own confession |
| POST | `/api/confessions/:id/like` | user | Like |
| DELETE | `/api/confessions/:id/like` | user | Unlike |
| POST | `/api/confessions/:id/save` | user | Save |
| DELETE | `/api/confessions/:id/save` | user | Unsave |
| GET | `/api/comments/confessions/:confessionId` | — | Comments |
| POST | `/api/comments/confessions/:confessionId` | user | Comment |

## Notifications / reports / blocks — `/api/notifications`, `/api/reports`, `/api/blocks`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/notifications` | user | List |
| POST | `/api/notifications/:id/read` | user | Mark one read |
| POST | `/api/notifications/read-all` | user | Mark all read |
| GET | `/api/notifications/preferences` | user | Notification preferences |
| POST | `/api/reports` | user | Report (`reportSchema`: targetType user/post/confession/comment/message, reason, details ≤1000) |
| GET | `/api/reports/mine` | user | Own reports |
| GET | `/api/blocks` | user | Blocked users |
| POST | `/api/blocks` | user | Block (`blockSchema`) |
| DELETE | `/api/blocks/:userId` | user | Unblock |

## Uploads — `/api/uploads` (profile photos, stored in R2)

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/uploads/avatar` | user | Multipart form-data, field `file`. JPG/PNG/WebP/GIF ≤ 5 MB. Stored in the R2 bucket bound as `UPLOADS`; the profile's `avatarUrl` is set to `/api/uploads/<key>`. Local dev (no R2 binding) stores the file under `data/uploads/`. Returns `{ url }`. |
| GET | `/api/uploads/:key` | — | Serves a stored photo (avatars are public profile data). `Cache-Control: public, max-age=86400`. |

## Admin — `/api/admin` (separate login, `admin_users` table)

Admin login is **separate** from user login: `POST /api/admin/login` checks the
`admin_users` table and issues a session cookie for `admin:<id>`. Every route
below (except login/logout) runs `requireAdmin`. All admin mutations are
written to `audit_logs`. Admin pages in the web app call these routes and
redirect to `/admin/login` on 401/403.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/admin/login` | `{ email, password }` → `{ admin }` (no password hash) |
| POST | `/api/admin/logout` | → `{ loggedOut: true }` |
| GET | `/api/admin/me` | Current admin |
| GET | `/api/admin/stats` | `{ users, confessions, posts, openReports, activeUsers, verifiedUsers, suspendedUsers, bannedUsers, totalMatches, totalMessages }` |
| GET | `/api/admin/health` | `{ email: { provider, configured, mode, from, note }, storage: { d1, r2Bucket, kvNamespace, uploads, note } }` |
| GET | `/api/admin/users?limit=&search=&status=` | `{ items: safeUser[] }`, server-side search (name/username/email) + status filter, newest first, max 50 |
| POST | `/api/admin/users/:id/suspend` | Sets status `suspended`, audit-logged |
| POST | `/api/admin/users/:id/ban` | Sets status `banned`, audit-logged |
| POST | `/api/admin/users/:id/reactivate` | Sets status `active`, audit-logged |
| GET | `/api/admin/reports?status=` | `{ items: Report[] }`, newest first, max 50 |
| POST | `/api/admin/reports/:id/resolve` | Body `{ status: 'resolved' \| 'dismissed' }`, audit-logged |
| GET | `/api/admin/confessions?limit=` | `{ items: Confession[] }` — **admin-only: includes `authorId`** for investigation |
| POST | `/api/admin/confessions/:id/hide` | Sets status `hidden`, audit-logged |
| GET | `/api/admin/posts?limit=` | `{ items: Post[] }`, newest first, max 50 |
| POST | `/api/admin/posts/:id/hide` | Sets visibility `private`, audit-logged |
| GET | `/api/admin/announcements?limit=` | `{ items: Announcement[] }`, newest first, max 50 |
| POST | `/api/admin/announcements` | Body `{ title, body, audience: 'all' \| 'verified' \| 'premium' }`, audit-logged |
| PATCH | `/api/admin/announcements/:id` | Body `{ title?, body?, audience?, active? }`, audit-logged |
| DELETE | `/api/admin/announcements/:id` | Deletes the announcement, audit-logged |
| GET | `/api/announcements` | **Public** — active announcements only, no admin identity exposed |
| GET | `/api/admin/audit-logs?limit=` | `{ items: AuditLog[] }`, newest first, max 50 |
| GET | `/api/admin/settings` | `{ items: Record<string, string> }` (flat key/value map) |
| PUT | `/api/admin/settings/:key` | Body `{ value }`, upserts one key, audit-logged |

**Admin gaps closed 2026-11-27:** announcements endpoints, ban endpoint, admin post list, stats breakdowns, server-side user search/status filter, and email/storage health status are all implemented and live-tested. No admin gaps remain open in this list.

## Pagination

List endpoints use cursor pagination where implemented: `cursor` is base64url
of `"<createdAt>:<id>"` (descending); `limit` is clamped to 1–50, default 20
(`apps/worker/src/lib/pagination.ts`). Admin list endpoints accept `?limit=`
(max 50, default 20).

## Errors

HTTP status + `{ ok: false, error: { code, message } }`. Common codes:
`validation_error` (400), `invalid_credentials` (401), `invalid` (400, e.g.
self-like), `not_found` (404), `internal_error` (500), `unavailable` (503,
chat DO not bound).
