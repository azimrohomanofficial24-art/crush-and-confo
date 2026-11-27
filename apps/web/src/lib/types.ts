// Shared frontend types. Mirrors the API contract in CONTRACT.md.
// Match % is a compatibility estimate, NOT scientifically validated.
export interface User {
  id: string
  username: string
  fullName: string
  age: number
  city: string
  country: string
  gender: string
  interestedIn: string
  bio: string
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
export interface Conversation {
  id: string
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
}
export interface Comment { id: string; author: User; text: string; createdAt: string }
export interface ApiResponse<T> { ok: boolean; data?: T; error?: string }
