// Shared frontend types. These mirror the REAL Worker API shapes
// (see docs/API.md) — adapters in lib/api.ts map the server DTOs onto them.
// Match % is a compatibility estimate, NOT scientifically validated.
// There is NO demo data anywhere in the app: every list comes from /api/*
// and empty results render as honest empty states.
export interface User {
  id: string
  username: string
  fullName: string
  age: number | null
  city: string
  country: string
  gender: string
  interestedIn: string
  bio: string
  /** Real photo URL served by the Worker from R2 (/api/uploads/…), or null. */
  avatarUrl: string | null
  avatarColor: string
  avatarInitials: string
  interests: string[]
  online: boolean
  verified: boolean
  posts: number
  followers: number
  following: number
  matchPercent?: number
  distanceKm?: number
}
export interface Post {
  id: string
  author: User
  content: string
  createdAt: string
  likes: number
  comments: number
  likedByMe: boolean
  savedByMe: boolean
  feeling?: string
  location?: string
  hashtag?: string
  imageUrl?: string | null
}
export interface Confession {
  id: string
  text: string
  anonymous: boolean
  authorName?: string
  createdAt: string
  likes: number
  comments: number
  likedByMe: boolean
  savedByMe: boolean
  topic: string
}
export interface Match {
  id: string
  otherUser: User
  createdAt: string
}
export interface Conversation {
  id: string
  matchId: string | null
  members: User[]
  otherUser: User
  lastMessage: string
  lastMessageAt: string
  unread: number
  matchedAt: string
}
export interface Message {
  id: string
  conversationId: string
  senderId: string
  text: string
  createdAt: string
  read: boolean
}
export interface AppNotification {
  id: string
  type: 'like' | 'match' | 'message' | 'comment' | 'follow' | 'system'
  title: string
  body: string
  createdAt: string
  read: boolean
  actor?: User
  /** Raw notification payload (e.g. { matchId } on match notifications). */
  data?: Record<string, unknown> | null
}
export interface Comment { id: string; author: User; text: string; createdAt: string }
export interface ApiResponse<T> { ok: boolean; data?: T; error?: string }
export interface ProfileData {
  user: User
  interests: string[]
  counts: { followers: number; following: number; posts: number }
}
export const TOPIC_CATEGORIES = ['Love', 'Crush', 'Friendship', 'Motivation', 'Life'] as const
