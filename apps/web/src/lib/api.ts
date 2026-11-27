// Typed API client. Prefers the live Worker API (/api/*, proxied in dev).
// When the Worker is not running, every call falls back to the clearly
// labelled local demo store (demoData.ts) so the UI stays fully functional.
// `demoMode` is true while the fallback is in use; the UI shows a badge.
import { CURRENT_USER_ID, currentUser, getStore, saveStore } from './demoData'
import type { AppNotification, Comment, Confession, Conversation, Message, Post, User } from './types'

export let demoMode = false
const listeners = new Set<() => void>()
export function onDemoModeChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
function setDemo(v: boolean) { if (demoMode !== v) { demoMode = v; listeners.forEach((f) => f()) } }

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const json = await res.json()
  if (json && typeof json === 'object' && 'ok' in json) {
    if (!json.ok) throw new Error(json.error || 'API error')
    return json.data as T
  }
  return json as T
}

async function withFallback<T>(path: string, demo: () => T | Promise<T>, init?: RequestInit): Promise<T> {
  try {
    const data = await apiFetch<T>(path, init)
    setDemo(false)
    return data
  } catch {
    setDemo(true)
    return demo()
  }
}

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const s = () => getStore()
const findUser = (id: string) => s().users.find((u) => u.id === id)!

export const api = {
  // --- auth (session is a secure HttpOnly cookie set by the server;
  // in demo mode only, a dev session marker is kept in sessionStorage) ---
  async me(): Promise<User | null> {
    return withFallback('/api/auth/me', async () => {
      await delay()
      return sessionStorage.getItem('cc-demo-session') ? currentUser : null
    })
  },
  async login(email: string, password: string): Promise<User> {
    return withFallback('/api/auth/login', async () => {
      await delay(300)
      const u = s().users.find((x) => x.username === email.split('@')[0]) || currentUser
      if (password.length < 6) throw new Error('Invalid email or password')
      sessionStorage.setItem('cc-demo-session', u.id)
      return u
    }, { method: 'POST', body: JSON.stringify({ email, password }) })
  },
  async register(payload: Record<string, unknown>): Promise<User> {
    return withFallback('/api/auth/register', async () => {
      await delay(400)
      const u: User = { ...currentUser, id: uid(), username: String(payload.username), fullName: String(payload.fullName), age: 18, city: String(payload.city || 'Dhaka'), country: String(payload.country || 'Bangladesh'), bio: '', interests: [], posts: 0, followers: 0, following: 0, online: true, verified: false }
      s().users.unshift(u)
      sessionStorage.setItem('cc-demo-session', u.id)
      saveStore()
      return u
    }, { method: 'POST', body: JSON.stringify(payload) })
  },
  async logout(): Promise<void> {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch { /* demo fallback below */ }
    sessionStorage.removeItem('cc-demo-session')
  },
  async forgotPassword(email: string): Promise<void> {
    return withFallback('/api/auth/forgot-password', async () => { await delay(300); void email }, { method: 'POST', body: JSON.stringify({ email }) })
  },
  async resetPassword(token: string, password: string): Promise<void> {
    return withFallback('/api/auth/reset-password', async () => { await delay(300); void token; void password }, { method: 'POST', body: JSON.stringify({ token, password }) })
  },
  async verifyEmail(token: string): Promise<void> {
    return withFallback('/api/auth/verify-email', async () => { await delay(300); void token }, { method: 'POST', body: JSON.stringify({ token }) })
  },

  // --- discovery / matching ---
  async discover(): Promise<User[]> {
    return withFallback('/api/matching/discover', async () => {
      await delay()
      return s().users.filter((u) => u.id !== CURRENT_USER_ID && !s().passedUserIds.includes(u.id) && !s().blockedUserIds.includes(u.id))
    })
  },
  async like(userId: string): Promise<{ matched: boolean }> {
    return withFallback('/api/likes/like', async () => {
      await delay(200)
      const st = s()
      if (!st.likedUserIds.includes(userId)) st.likedUserIds.push(userId)
      const matched = st.matchedUserIds.includes(userId) || userId === 'u-samiya'
      if (matched && !st.matchedUserIds.includes(userId)) st.matchedUserIds.push(userId)
      saveStore()
      return { matched }
    }, { method: 'POST', body: JSON.stringify({ userId }) })
  },
  async pass(userId: string): Promise<void> {
    return withFallback('/api/likes/pass', async () => { const st = s(); if (!st.passedUserIds.includes(userId)) st.passedUserIds.push(userId); saveStore() }, { method: 'POST', body: JSON.stringify({ userId }) })
  },
  async superLike(userId: string): Promise<void> {
    return withFallback('/api/likes/super-like', async () => { const st = s(); if (!st.superLikedUserIds.includes(userId)) st.superLikedUserIds.push(userId); if (!st.likedUserIds.includes(userId)) st.likedUserIds.push(userId); saveStore() }, { method: 'POST', body: JSON.stringify({ userId }) })
  },
  async matches(): Promise<User[]> {
    return withFallback('/api/matches', async () => { await delay(); return s().matchedUserIds.map(findUser) })
  },
  async unmatch(userId: string): Promise<void> {
    return withFallback(`/api/matches/${userId}`, async () => { const st = s(); st.matchedUserIds = st.matchedUserIds.filter((i) => i !== userId); saveStore() }, { method: 'DELETE' })
  },

  // --- posts / community ---
  async feed(): Promise<Post[]> {
    return withFallback('/api/posts', async () => { await delay(); return [...s().posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
  },
  async createPost(content: string, opts: { feeling?: string; location?: string } = {}): Promise<Post> {
    return withFallback('/api/posts', async () => {
      const p: Post = { id: uid(), author: currentUser, content, createdAt: new Date().toISOString(), likes: 0, comments: 0, likedByMe: false, savedByMe: false, ...opts }
      s().posts.unshift(p); saveStore(); return p
    }, { method: 'POST', body: JSON.stringify({ content, ...opts }) })
  },
  async togglePostLike(postId: string): Promise<void> {
    return withFallback(`/api/posts/${postId}/like`, async () => { const p = s().posts.find((x) => x.id === postId); if (p) { p.likedByMe = !p.likedByMe; p.likes += p.likedByMe ? 1 : -1; saveStore() } }, { method: 'POST' })
  },
  async togglePostSave(postId: string): Promise<void> {
    return withFallback(`/api/posts/${postId}/save`, async () => { const p = s().posts.find((x) => x.id === postId); if (p) { p.savedByMe = !p.savedByMe; saveStore() } }, { method: 'POST' })
  },
  async getComments(postId: string): Promise<Comment[]> {
    return withFallback(`/api/posts/${postId}/comments`, async () => { await delay(); return s().comments[postId] || [] })
  },
  async addComment(postId: string, text: string): Promise<Comment> {
    return withFallback(`/api/posts/${postId}/comments`, async () => {
      const c: Comment = { id: uid(), author: currentUser, text, createdAt: new Date().toISOString() }
      const st = s(); (st.comments[postId] = st.comments[postId] || []).push(c)
      const p = st.posts.find((x) => x.id === postId); if (p) p.comments += 1
      const cf = st.confessions.find((x) => x.id === postId); if (cf) cf.comments += 1
      saveStore(); return c
    }, { method: 'POST', body: JSON.stringify({ text }) })
  },
  async follow(userId: string): Promise<boolean> {
    return withFallback(`/api/users/${userId}/follow`, async () => {
      const st = s(); const i = st.followedUserIds.indexOf(userId)
      if (i >= 0) st.followedUserIds.splice(i, 1); else st.followedUserIds.push(userId)
      saveStore(); return i < 0
    }, { method: 'POST' })
  },
  async isFollowing(userId: string): Promise<boolean> {
    return withFallback(`/api/users/${userId}/following`, async () => s().followedUserIds.includes(userId))
  },

  // --- confessions ---
  async confessions(topic?: string): Promise<Confession[]> {
    return withFallback('/api/confessions', async () => { await delay(); return topic ? s().confessions.filter((c) => c.topic === topic) : [...s().confessions] })
  },
  async createConfession(text: string, anonymous: boolean, topic: string): Promise<Confession> {
    return withFallback('/api/confessions', async () => {
      const c: Confession = { id: uid(), text, anonymous, authorName: anonymous ? undefined : 'John Bay', createdAt: new Date().toISOString(), likes: 0, comments: 0, likedByMe: false, savedByMe: false, topic }
      const st = s(); st.confessions.unshift(c); st.myConfessionIds.push(c.id); saveStore(); return c
    }, { method: 'POST', body: JSON.stringify({ text, anonymous, topic }) })
  },
  async toggleConfessionLike(id: string): Promise<void> {
    return withFallback(`/api/confessions/${id}/like`, async () => { const c = s().confessions.find((x) => x.id === id); if (c) { c.likedByMe = !c.likedByMe; c.likes += c.likedByMe ? 1 : -1; saveStore() } }, { method: 'POST' })
  },
  async toggleConfessionSave(id: string): Promise<void> {
    return withFallback(`/api/confessions/${id}/save`, async () => { const c = s().confessions.find((x) => x.id === id); if (c) { c.savedByMe = !c.savedByMe; saveStore() } }, { method: 'POST' })
  },

  // --- messages ---
  async conversations(): Promise<Conversation[]> {
    return withFallback('/api/conversations', async () => { await delay(); return [...s().conversations] })
  },
  async messages(conversationId: string): Promise<Message[]> {
    return withFallback(`/api/conversations/${conversationId}/messages`, async () => { await delay(); return s().messages.filter((m) => m.conversationId === conversationId) })
  },
  async sendMessage(conversationId: string, text: string): Promise<Message> {
    return withFallback(`/api/conversations/${conversationId}/messages`, async () => {
      const m: Message = { id: uid(), conversationId, senderId: CURRENT_USER_ID, text, createdAt: new Date().toISOString(), read: false }
      const st = s(); st.messages.push(m)
      const conv = st.conversations.find((c) => c.id === conversationId); if (conv) { conv.lastMessage = text; conv.lastMessageAt = m.createdAt }
      saveStore(); return m
    }, { method: 'POST', body: JSON.stringify({ text }) })
  },
  async markConversationRead(conversationId: string): Promise<void> {
    return withFallback(`/api/conversations/${conversationId}/read`, async () => { const st = s(); const c = st.conversations.find((x) => x.id === conversationId); if (c) c.unread = 0; st.messages.filter((m) => m.conversationId === conversationId).forEach((m) => { m.read = true }); saveStore() }, { method: 'POST' })
  },

  // --- notifications ---
  async notifications(): Promise<AppNotification[]> {
    return withFallback('/api/notifications', async () => { await delay(); return [...s().notifications] })
  },
  async markNotificationRead(id: string): Promise<void> {
    return withFallback(`/api/notifications/${id}/read`, async () => { const n = s().notifications.find((x) => x.id === id); if (n) n.read = true; saveStore() }, { method: 'POST' })
  },
  async markAllNotificationsRead(): Promise<void> {
    return withFallback('/api/notifications/read-all', async () => { s().notifications.forEach((n) => { n.read = true }); saveStore() }, { method: 'POST' })
  },

  // --- profile / social graph / safety ---
  async profile(username: string): Promise<User | null> {
    return withFallback(`/api/profiles/${username}`, async () => { await delay(); return s().users.find((u) => u.username === username) || null })
  },
  async search(q: string): Promise<{ users: User[]; posts: Post[]; confessions: Confession[] }> {
    return withFallback(`/api/community/search?q=${encodeURIComponent(q)}`, async () => {
      await delay()
      const needle = q.toLowerCase()
      return {
        users: s().users.filter((u) => (u.fullName + u.username + u.city).toLowerCase().includes(needle)),
        posts: s().posts.filter((p) => p.content.toLowerCase().includes(needle)),
        confessions: s().confessions.filter((c) => c.text.toLowerCase().includes(needle)),
      }
    })
  },
  async report(targetId: string, reason: string): Promise<void> {
    return withFallback('/api/reports', async () => { const st = s(); if (!st.reportedIds.includes(targetId)) st.reportedIds.push(targetId); saveStore(); void reason }, { method: 'POST', body: JSON.stringify({ targetId, reason }) })
  },
  async block(userId: string): Promise<void> {
    return withFallback(`/api/blocks/${userId}`, async () => { const st = s(); if (!st.blockedUserIds.includes(userId)) st.blockedUserIds.push(userId); saveStore() }, { method: 'POST' })
  },
  async unblock(userId: string): Promise<void> {
    return withFallback(`/api/blocks/${userId}`, async () => { const st = s(); st.blockedUserIds = st.blockedUserIds.filter((i) => i !== userId); saveStore() }, { method: 'DELETE' })
  },
  async blockedUsers(): Promise<User[]> {
    return withFallback('/api/blocks', async () => s().blockedUserIds.map(findUser))
  },
  async followers(): Promise<User[]> {
    return withFallback('/api/users/me/followers', async () => { await delay(); return [findUser('u-ayesha'), findUser('u-tanvir'), findUser('u-nusrat')] })
  },
  async following(): Promise<User[]> {
    return withFallback('/api/users/me/following', async () => { await delay(); return s().followedUserIds.map(findUser) })
  },
  async savedPosts(): Promise<Post[]> {
    return withFallback('/api/posts/saved', async () => { await delay(); return s().posts.filter((p) => p.savedByMe) })
  },
  async savedConfessions(): Promise<Confession[]> {
    return withFallback('/api/confessions/saved', async () => s().confessions.filter((c) => c.savedByMe))
  },
  async myConfessions(): Promise<Confession[]> {
    return withFallback('/api/confessions/mine', async () => s().confessions.filter((c) => s().myConfessionIds.includes(c.id)))
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
