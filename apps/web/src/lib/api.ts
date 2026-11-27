// Typed API client — LIVE Worker API ONLY (/api/*).
// There is no demo data, no demo fallback and no local fake store in this
// app. Every call hits the real Worker; when the API is unreachable or
// returns an error, the caller shows an error / honest empty state.
// Paginated Worker list endpoints return { items, nextCursor }; list
// helpers unwrap data.items so .map/.filter never crash on an object
// (that crash blanked the whole app after load, 2026-11-27).
import type { AppNotification, Comment, Confession, Conversation, Match, Message, Post, ProfileData, User } from './types'

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function apiFetchRaw(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }
  let json: any = null
  try { json = await res.json() } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const msg = json?.error?.message || json?.error || `Request failed (${res.status})`
    throw new ApiError(res.status, typeof msg === 'string' ? msg : `Request failed (${res.status})`, json?.error?.code)
  }
  if (json && typeof json === 'object' && 'ok' in json) {
    if (!json.ok) throw new ApiError(res.status, json.error?.message || json.error || 'API error', json.error?.code)
    return json.data
  }
  return json
}

/** Single-object / scalar endpoints. */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return (await apiFetchRaw(path, init)) as T
}

/** Paginated list endpoints: unwraps { items, nextCursor } -> items. */
async function apiFetchList<T>(path: string, init?: RequestInit): Promise<T[]> {
  const data = await apiFetchRaw(path, init)
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  if (Array.isArray(data)) return data as T[]
  throw new ApiError(500, 'Unexpected response from the server')
}

// ---------------------------------------------------------------------------
// Adapters: real Worker DTOs -> frontend types (exported for unit tests).
// The Worker only ever returns public fields; anonymous confessions never
// carry an authorId, and public user rows carry no email / DOB / password.
// ---------------------------------------------------------------------------

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

export function avatarColorFor(key: string): string {
  const palette = ['#F52D91', '#873BFA', '#7C3AED', '#DB2777', '#4F46E5', '#0EA5E9', '#059669', '#D97706']
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export function initialsFor(displayName: string): string {
  const parts = (displayName || '?').trim().split(/\s+/)
  return (parts[0]?.[0] || '?').toUpperCase() + (parts.length > 1 ? (parts[parts.length - 1][0] || '').toUpperCase() : '')
}

function splitLocation(location: string | null | undefined): { city: string; country: string } {
  if (!location) return { city: '', country: '' }
  const [city = '', ...rest] = location.split(',')
  return { city: city.trim(), country: rest.join(',').trim() }
}

export interface PublicUserRow {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  age?: number | null
  dateOfBirth?: string | null
  location?: string | null
  gender?: string | null
  emailVerified?: boolean
}

export function toUser(
  row: PublicUserRow,
  extra: { profile?: { bio?: string | null; city?: string | null; country?: string | null } | null; interests?: { name: string }[] | string[]; counts?: { followers?: number; following?: number; posts?: number } } = {},
): User {
  const loc = splitLocation(row.location ?? extra.profile?.city ?? null)
  const city = extra.profile?.city || loc.city
  const country = extra.profile?.country || loc.country
  return {
    id: row.id,
    username: row.username,
    fullName: row.displayName,
    age: row.age ?? ageFromDob(row.dateOfBirth),
    city,
    country,
    gender: row.gender ?? '',
    interestedIn: '',
    bio: extra.profile?.bio ?? '',
    avatarUrl: row.avatarUrl ?? null,
    avatarColor: avatarColorFor(row.username || row.id),
    avatarInitials: initialsFor(row.displayName),
    interests: (extra.interests || []).map((i) => (typeof i === 'string' ? i : i.name)),
    online: false,
    verified: Boolean(row.emailVerified),
    posts: extra.counts?.posts ?? 0,
    followers: extra.counts?.followers ?? 0,
    following: extra.counts?.following ?? 0,
  }
}

const DELETED_USER: User = {
  id: 'deleted', username: 'deleted', fullName: 'Deleted user', age: null, city: '', country: '',
  gender: '', interestedIn: '', bio: '', avatarUrl: null, avatarColor: '#77728C', avatarInitials: '?',
  interests: [], online: false, verified: false, posts: 0, followers: 0, following: 0,
}

export function toPost(dto: any): Post {
  return {
    id: dto.id,
    author: dto.author ? toUser(dto.author) : DELETED_USER,
    content: dto.body,
    createdAt: new Date(dto.createdAt).toISOString(),
    likes: dto.likeCount ?? 0,
    comments: dto.commentCount ?? 0,
    likedByMe: Boolean(dto.likedByMe),
    savedByMe: Boolean(dto.savedByMe),
    feeling: dto.feeling ?? undefined,
    location: dto.location ?? undefined,
    hashtag: (dto.hashtags?.[0] ? `#${dto.hashtags[0]}` : undefined),
    imageUrl: dto.imageUrl ?? null,
  }
}

export function toConfession(dto: any): Confession {
  return {
    id: dto.id,
    text: dto.body,
    anonymous: Boolean(dto.isAnonymous),
    authorName: dto.authorLabel && dto.authorLabel !== 'Anonymous' ? dto.authorLabel : undefined,
    createdAt: new Date(dto.createdAt).toISOString(),
    likes: dto.likeCount ?? 0,
    comments: dto.commentCount ?? 0,
    likedByMe: Boolean(dto.likedByMe),
    savedByMe: Boolean(dto.savedByMe),
    topic: dto.category || 'General',
  }
}

export function toComment(row: any): Comment {
  return { id: row.id, author: row.author ? toUser(row.author) : DELETED_USER, text: row.body, createdAt: new Date(row.createdAt).toISOString() }
}

export function toConversation(dto: any, myId: string): Conversation {
  const members: User[] = (dto.members || []).map((m: any) => toUser(m))
  const otherUser = members.find((m) => m.id !== myId) || members[0] || DELETED_USER
  const last = dto.lastMessage ?? null
  return {
    id: dto.id,
    matchId: dto.matchId ?? null,
    members,
    otherUser,
    lastMessage: last?.body ?? '',
    lastMessageAt: last ? new Date(last.createdAt).toISOString() : new Date(dto.updatedAt ?? dto.createdAt).toISOString(),
    unread: 0,
    matchedAt: new Date(dto.createdAt).toISOString(),
  }
}

export function toMessage(row: any): Message {
  return { id: row.id, conversationId: row.conversationId, senderId: row.senderId, text: row.body, createdAt: new Date(row.createdAt).toISOString(), read: Boolean(row.readAt) }
}

export function toNotification(row: any): AppNotification {
  return {
    id: row.id,
    type: (['like', 'match', 'message', 'comment', 'follow', 'system'].includes(row.type) ? row.type : 'system') as AppNotification['type'],
    title: row.title,
    body: row.body ?? '',
    createdAt: new Date(row.createdAt).toISOString(),
    read: Boolean(row.isRead),
    data: row.data ?? null,
  }
}

export function toMatch(row: any): Match {
  return { id: row.id, otherUser: row.otherUser ? toUser(row.otherUser) : DELETED_USER, createdAt: new Date(row.createdAt).toISOString() }
}

const GENDER_MAP: Record<string, string> = { Female: 'female', Male: 'male', 'Non-binary': 'nonbinary', 'Prefer not to say': 'prefer_not_to_say' }
const VISIBILITY_MAP: Record<string, 'public' | 'followers' | 'private'> = { Public: 'public', Friends: 'followers', 'Only me': 'private' }

function extractHashtags(text: string): string[] {
  return [...new Set([...text.matchAll(/#([A-Za-z0-9_]{1,40})/g)].map((m) => m[1]))].slice(0, 10)
}

export const api = {
  // --- auth (session is a secure HttpOnly cookie set by the server) ---
  async me(): Promise<User | null> {
    try {
      const { user, profile } = await apiFetch<{ user: any; profile: any }>('/api/auth/me')
      return toUser(user, { profile })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  },
  async login(email: string, password: string): Promise<User> {
    const { user } = await apiFetch<{ user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ emailOrUsername: email, password }) })
    return toUser(user)
  },
  async register(form: { fullName: string; username: string; email: string; password: string; dob: string; gender: string; country: string; city: string }): Promise<User> {
    const payload = {
      username: form.username,
      email: form.email,
      password: form.password,
      displayName: form.fullName,
      dateOfBirth: form.dob,
      gender: GENDER_MAP[form.gender] ?? 'prefer_not_to_say',
      location: [form.city, form.country].filter(Boolean).join(', ') || undefined,
    }
    const { user } = await apiFetch<{ user: any }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) })
    return toUser(user)
  },
  async logout(): Promise<void> {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch { /* already logged out */ }
  },
  async forgotPassword(email: string): Promise<void> {
    await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
  },
  async resetPassword(token: string, password: string): Promise<void> {
    if (!token) throw new ApiError(400, 'No reset token found in the link.')
    await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
  },
  async verifyEmail(token: string): Promise<void> {
    if (!token) throw new ApiError(400, 'No verification token found in the link.')
    await apiFetch('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
  },
  async deleteAccount(): Promise<void> {
    await apiFetch('/api/auth/me', { method: 'DELETE' })
  },

  // --- discovery / matching ---
  async discover(): Promise<User[]> {
    const items = await apiFetchList<any>('/api/matching/discover')
    return items.map((it) => {
      const u = toUser(it.user, { profile: it.profile, interests: it.interests })
      u.matchPercent = it.matchScore ?? undefined
      return u
    })
  },
  async like(userId: string): Promise<{ matched: boolean; matchId?: string }> {
    const res = await apiFetch<{ matched: boolean; match?: { id: string } }>('/api/likes/' + encodeURIComponent(userId), { method: 'POST', body: JSON.stringify({ type: 'like' }) })
    return { matched: Boolean(res.matched), matchId: res.match?.id }
  },
  async pass(userId: string): Promise<void> {
    await apiFetch('/api/likes/' + encodeURIComponent(userId) + '/pass', { method: 'POST' })
  },
  async superLike(userId: string): Promise<{ matched: boolean; matchId?: string }> {
    const res = await apiFetch<{ matched: boolean; match?: { id: string } }>('/api/likes/' + encodeURIComponent(userId), { method: 'POST', body: JSON.stringify({ type: 'super' }) })
    return { matched: Boolean(res.matched), matchId: res.match?.id }
  },
  async matches(): Promise<Match[]> {
    const items = await apiFetchList<any>('/api/matches')
    return items.map(toMatch)
  },
  async unmatch(matchId: string): Promise<void> {
    await apiFetch('/api/matches/' + encodeURIComponent(matchId) + '/unmatch', { method: 'POST' })
  },
  async startConversation(matchId: string): Promise<Conversation> {
    const dto = await apiFetch<any>('/api/conversations', { method: 'POST', body: JSON.stringify({ matchId }) })
    const me = await this.me()
    return toConversation(dto, me?.id ?? '')
  },
  async matchingPreferences(): Promise<{ minAge: number; maxAge: number; preferredGenders: string[]; maxDistanceKm: number | null; intentions: string | null } | null> {
    const { preferences } = await apiFetch<{ preferences: any }>('/api/matching/preferences')
    return preferences
  },
  async saveMatchingPreferences(prefs: { minAge: number; maxAge: number; preferredGenders: string[]; maxDistanceKm: number | null; intentions: string | null }): Promise<void> {
    await apiFetch('/api/profiles/me/preferences', { method: 'PUT', body: JSON.stringify(prefs) })
  },

  // --- posts / community ---
  async feed(): Promise<Post[]> {
    const items = await apiFetchList<any>('/api/posts')
    return items.map(toPost)
  },
  async postsByAuthor(authorId: string): Promise<Post[]> {
    const items = await apiFetchList<any>('/api/posts?authorId=' + encodeURIComponent(authorId))
    return items.map(toPost)
  },
  async createPost(content: string, opts: { feeling?: string; location?: string; visibility?: string } = {}): Promise<Post> {
    const dto = await apiFetch<any>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ body: content, feeling: opts.feeling, location: opts.location, hashtags: extractHashtags(content), visibility: VISIBILITY_MAP[opts.visibility ?? 'Public'] ?? 'public' }),
    })
    return toPost(dto)
  },
  async togglePostLike(postId: string, likedByMe: boolean): Promise<void> {
    await apiFetch(`/api/posts/${encodeURIComponent(postId)}/like`, { method: likedByMe ? 'DELETE' : 'POST' })
  },
  async togglePostSave(postId: string, savedByMe: boolean): Promise<void> {
    await apiFetch(`/api/posts/${encodeURIComponent(postId)}/save`, { method: savedByMe ? 'DELETE' : 'POST' })
  },
  async getComments(kind: 'post' | 'confession', id: string): Promise<Comment[]> {
    const items = await apiFetchList<any>(kind === 'post' ? `/api/comments/posts/${encodeURIComponent(id)}` : `/api/comments/confessions/${encodeURIComponent(id)}`)
    return items.map(toComment)
  },
  async addComment(kind: 'post' | 'confession', id: string, text: string): Promise<Comment> {
    const { comment } = await apiFetch<{ comment: any }>(kind === 'post' ? `/api/comments/posts/${encodeURIComponent(id)}` : `/api/comments/confessions/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ body: text }) })
    const me = await this.me()
    return { id: comment.id, author: me ?? DELETED_USER, text: comment.body, createdAt: new Date(comment.createdAt).toISOString() }
  },
  async follow(userId: string): Promise<boolean> {
    try {
      await apiFetch('/api/community/follow/' + encodeURIComponent(userId), { method: 'POST' })
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await apiFetch('/api/community/follow/' + encodeURIComponent(userId), { method: 'DELETE' })
        return false
      }
      throw e
    }
  },
  async isFollowing(userId: string): Promise<boolean> {
    const me = await this.me()
    if (!me) return false
    const items = await apiFetchList<any>('/api/community/followers/' + encodeURIComponent(userId))
    return items.some((u: any) => u.id === me.id)
  },
  async trendingHashtags(): Promise<{ tag: string; count: number }[]> {
    return apiFetchList<{ tag: string; count: number }>('/api/community/hashtags')
  },
  async announcements(): Promise<{ id: string; title: string; body: string; createdAt: number }[]> {
    return apiFetchList('/api/announcements')
  },

  // --- confessions ---
  async confessions(topic?: string): Promise<Confession[]> {
    const q = topic ? `?category=${encodeURIComponent(topic)}` : ''
    const items = await apiFetchList<any>('/api/confessions' + q)
    return items.map(toConfession)
  },
  async createConfession(text: string, anonymous: boolean, topic: string): Promise<Confession> {
    const dto = await apiFetch<any>('/api/confessions', { method: 'POST', body: JSON.stringify({ body: text, isAnonymous: anonymous, category: topic, hashtags: extractHashtags(text) }) })
    return toConfession(dto)
  },
  async toggleConfessionLike(id: string, likedByMe: boolean): Promise<void> {
    await apiFetch(`/api/confessions/${encodeURIComponent(id)}/like`, { method: likedByMe ? 'DELETE' : 'POST' })
  },
  async toggleConfessionSave(id: string, savedByMe: boolean): Promise<void> {
    await apiFetch(`/api/confessions/${encodeURIComponent(id)}/save`, { method: savedByMe ? 'DELETE' : 'POST' })
  },

  // --- messages ---
  async conversations(): Promise<Conversation[]> {
    const me = await this.me()
    const items = await apiFetchList<any>('/api/conversations')
    return items.map((c: any) => toConversation(c, me?.id ?? ''))
  },
  async messages(conversationId: string): Promise<Message[]> {
    const items = await apiFetchList<any>('/api/messages/' + encodeURIComponent(conversationId))
    return items.map(toMessage)
  },
  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const { message } = await apiFetch<{ message: any }>('/api/messages/' + encodeURIComponent(conversationId), { method: 'POST', body: JSON.stringify({ body: text }) })
    return toMessage(message)
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await apiFetch('/api/conversations/' + encodeURIComponent(conversationId) + '/read', { method: 'POST' })
  },

  // --- notifications ---
  async notifications(): Promise<AppNotification[]> {
    const items = await apiFetchList<any>('/api/notifications')
    return items.map(toNotification)
  },
  async markNotificationRead(id: string): Promise<void> {
    await apiFetch('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST' })
  },
  async markAllNotificationsRead(): Promise<void> {
    await apiFetch('/api/notifications/read-all', { method: 'POST' })
  },

  // --- profile / social graph / safety ---
  async profile(username: string): Promise<ProfileData | null> {
    try {
      const data = await apiFetch<{ user: any; profile: any; interests: any[]; counts: any }>('/api/users/by-username/' + encodeURIComponent(username))
      return { user: toUser(data.user, { profile: data.profile, interests: data.interests, counts: data.counts }), interests: (data.interests || []).map((i: any) => i.name), counts: data.counts }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 401)) return null
      throw e
    }
  },
  async myProfile(): Promise<{ profile: any; preferences: any; interests: any[] }> {
    return apiFetch('/api/profiles/me')
  },
  async updateProfile(patch: { bio?: string | null; city?: string | null; country?: string | null; avatarUrl?: string | null }): Promise<void> {
    await apiFetch('/api/profiles/me', { method: 'PUT', body: JSON.stringify(patch) })
  },
  /** Upload a real profile photo. The Worker stores it in R2 and returns its URL. */
  async uploadAvatar(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new ApiError(400, 'Please choose an image file.')
    if (file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Photo must be smaller than 5 MB.')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/uploads/avatar', { method: 'POST', body: form, credentials: 'include' })
    let json: any = null
    try { json = await res.json() } catch { /* ignore */ }
    if (!res.ok) throw new ApiError(res.status, json?.error?.message || 'Photo upload failed.')
    return (json?.data?.url ?? json?.url) as string
  },
  async search(q: string): Promise<{ users: User[]; posts: Post[]; confessions: Confession[] }> {
    const [userRows, postRows] = await Promise.all([
      apiFetchList<any>('/api/users/search?q=' + encodeURIComponent(q)),
      apiFetchList<any>('/api/community/search?q=' + encodeURIComponent(q)),
    ])
    // Confessions have no server-side text search; filter the real list client-side.
    const confRows = await apiFetchList<any>('/api/confessions?limit=50')
    const needle = q.toLowerCase()
    return {
      users: userRows.map((u: any) => toUser(u)),
      posts: postRows.map(toPost),
      confessions: confRows.filter((c: any) => (c.body || '').toLowerCase().includes(needle)).map(toConfession),
    }
  },
  async report(targetId: string, targetType: 'user' | 'post' | 'confession' | 'comment' | 'message', reason: string): Promise<void> {
    await apiFetch('/api/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason }) })
  },
  async block(userId: string): Promise<void> {
    await apiFetch('/api/blocks', { method: 'POST', body: JSON.stringify({ blockedId: userId }) })
  },
  async unblock(userId: string): Promise<void> {
    await apiFetch('/api/blocks/' + encodeURIComponent(userId), { method: 'DELETE' })
  },
  async blockedUsers(): Promise<User[]> {
    const rows = await apiFetchList<any>('/api/blocks')
    const out: User[] = []
    for (const r of rows) {
      try {
        const data = await apiFetch<{ user: any; profile: any }>('/api/users/' + encodeURIComponent(r.blockedId))
        out.push(toUser(data.user, { profile: data.profile }))
      } catch { /* blocked user may have been deleted */ }
    }
    return out
  },
  async followers(): Promise<User[]> {
    const me = await this.me()
    if (!me) return []
    const items = await apiFetchList<any>('/api/community/followers/' + encodeURIComponent(me.id))
    return items.map((u: any) => toUser(u))
  },
  async following(): Promise<User[]> {
    const me = await this.me()
    if (!me) return []
    const items = await apiFetchList<any>('/api/community/following/' + encodeURIComponent(me.id))
    return items.map((u: any) => toUser(u))
  },
  async savedPosts(): Promise<Post[]> {
    const items = await apiFetchList<any>('/api/posts/saved/mine')
    return items.map(toPost)
  },
  async savedConfessions(): Promise<Confession[]> {
    const items = await apiFetchList<any>('/api/confessions/saved/mine')
    return items.map(toConfession)
  },
  async myConfessions(): Promise<Confession[]> {
    const items = await apiFetchList<any>('/api/confessions/mine')
    return items.map(toConfession)
  },
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`
  return String(n)
}
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
