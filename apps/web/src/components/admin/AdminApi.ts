// Admin API client — Crush and Confo
// Calls /api/admin/* with the { ok, data } / { ok:false, error } envelope.
// Shapes below match the REAL worker implementation in apps/worker/src/routes/admin.ts
// (Agent B, landed 2026-11-27). Where the backend does not yet expose something the
// admin UI needs, the page that needs it says so explicitly instead of inventing data.
// On 401/403 it throws AdminAuthError; pages must catch it and redirect to /admin/login.
// Self-contained: no imports from outside the admin folders.
// Self-contained: no imports from outside the admin folders.
// (The worker's ageFromDob in apps/worker/src/matching/score.ts is the same
// algorithm; this copy exists so the web bundle never imports worker code,
// which Vite would refuse to serve from outside the web root.)
export function ageFromDob(dob: string, now: Date = new Date()): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? (status === 401 ? 'Your admin session has expired. Please sign in again.' : 'You do not have admin access.'));
    this.name = 'AdminAuthError';
    this.status = status;
  }
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new AdminApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new AdminAuthError(res.status);
  }
  let body: { ok?: boolean; data?: T; error?: string | { message?: string } } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new AdminApiError(res.status, `Unexpected response from the server (HTTP ${res.status}).`);
  }
  if (!res.ok || body.ok === false) {
    const msg = typeof body.error === 'string' ? body.error : body.error?.message ?? `Request failed (HTTP ${res.status}).`;
    throw new AdminApiError(res.status, msg);
  }
  return body.data as T;
}

export const adminApi = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T,>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  patch: <T,>(path: string, data?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),

  login: (email: string, password: string) =>
    request<{ admin: { id: string; email: string; name: string; role: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ loggedOut: boolean }>('/api/admin/logout', { method: 'POST', body: '{}' }),
  me: () => request<{ admin: { id: string; email: string; name: string; role: string } }>('/api/admin/me'),
};

// ---------------------------------------------------------------------------
// Types — mirror apps/worker/src/routes/admin.ts + apps/worker/src/db/schema.ts.
// Timestamps from the API are integer ms since epoch.
// ---------------------------------------------------------------------------

/** GET /api/admin/stats — counts plus user/match/message breakdowns. */
export interface AdminStats {
  users: number;
  confessions: number;
  posts: number;
  openReports: number;
  activeUsers: number;
  verifiedUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  totalMatches: number;
  totalMessages: number;
}

/** GET /api/admin/health — email + storage configuration status. */
export interface AdminHealth {
  email: { provider: string; configured: boolean; mode: 'live' | 'dev'; from: string | null; note: string };
  storage: { d1: boolean; r2Bucket: string; kvNamespace: string; uploads: { posts: number; confessions: number }; note: string };
}

/** GET /api/admin/announcements returns { items: AdminAnnouncement[] }. */
export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: string; // 'all' | 'verified' | 'premium'
  active: number; // 1 = shown on the site
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

/** GET /api/admin/posts returns { items: AdminPost[] }. */
export interface AdminPost {
  id: string;
  authorId: string;
  body: string;
  imageUrl: string | null;
  feeling: string | null;
  location: string | null;
  hashtags: string; // JSON-encoded array
  visibility: string; // 'public' | 'private' (private = hidden by admin)
  createdAt: number;
  updatedAt: number;
}

/** GET /api/admin/users returns { items: AdminUser[] } (safeUser: no password hash). */
export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  location: string | null;
  status: string; // 'active' | 'suspended' | 'banned' (set by /suspend, /ban, /reactivate)
  emailVerified: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** GET /api/admin/confessions returns { items: AdminConfession[] }. */
export interface AdminConfession {
  id: string;
  authorId: string; // admin-only: visible here for investigation, NEVER in the public API
  isAnonymous: number; // 1 = anonymous
  body: string;
  category: string | null;
  mood: string | null;
  hashtags: string; // JSON-encoded array
  status: string; // 'published' | 'hidden'
  createdAt: number;
}

/** GET /api/admin/reports returns { items: AdminReport[] }. */
export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: string; // 'user' | 'post' | 'confession' | 'comment' | 'message'
  targetId: string;
  reason: string;
  details: string | null;
  status: string; // 'open' | 'resolved' | 'dismissed' (set via POST /resolve {status})
  reviewedBy: string | null;
  createdAt: number;
}

/** GET /api/admin/audit-logs returns { items: AuditLogEntry[] }. */
export interface AuditLogEntry {
  id: string;
  adminId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  createdAt: number;
}

/**
 * GET /api/admin/settings returns { items: Record<string, string> } — a flat
 * key/value map (platform_settings table), NOT a fixed object.
 * Known keys used by the settings page: registration_open, require_email_verification,
 * min_age, maintenance_mode, maintenance_message, max_upload_mb.
 * Saved one key at a time via PUT /api/admin/settings/:key { value }.
 */
export type PlatformSettingsMap = Record<string, string>;

/** Announcements: NO backend endpoint exists yet (see AdminAnnouncements.tsx). */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'verified' | 'premium';
  active: boolean;
  createdAt: string;
  createdBy: string;
}

/** Format an integer-ms timestamp for display. */
export function formatWhen(ms: number | string): string {
  const n = typeof ms === 'string' ? Number(ms) : ms;
  if (!Number.isFinite(n)) return String(ms);
  return new Date(n).toLocaleString();
}

/** Format an integer-ms timestamp as a date only. */
export function formatDate(ms: number | string): string {
  const n = typeof ms === 'string' ? Number(ms) : ms;
  if (!Number.isFinite(n)) return String(ms);
  return new Date(n).toLocaleDateString();
}

/** Shorten an id for display (never a substitute for the real id in API calls). */
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}
