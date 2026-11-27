// Shared API types — mirrors CONTRACT.md API contract. Agent A: READ ONLY
// (do not change API types without noting it). Agent B owns this file.
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
export interface ApiError { code: string; message: string; details?: unknown }
export interface Paginated<T> { items: T[]; nextCursor: string | null; total?: number }
export type CursorPage<T> = Paginated<T>;

export interface User {
  id: string; username: string; email: string; displayName: string;
  dateOfBirth: string; gender: string; location: string | null;
  status: 'active' | 'suspended' | 'deleted'; emailVerified: boolean;
  createdAt: number; updatedAt: number;
}
export interface Profile {
  id: string; userId: string; bio: string | null; avatarUrl: string | null;
  coverUrl: string | null; city: string | null; country: string | null;
  occupation: string | null; education: string | null; heightCm: number | null;
  intentions: string | null; relationshipStatus: string | null;
  showAge: boolean; isPrivate: boolean; profileCompletion: number;
}
export interface UserPreferences {
  userId: string; minAge: number; maxAge: number; preferredGenders: string[];
  maxDistanceKm: number | null; intentions: string | null; showMe: boolean;
}
export interface Interest { id: string; name: string; slug: string; category: string | null }
export interface DiscoverProfile {
  user: Pick<User, 'id' | 'username' | 'displayName' | 'gender' | 'location'>;
  profile: Profile | null; interests: Interest[]; age: number | null;
  matchScore: number; scoreBreakdown: ScoreBreakdown;
  /** Transparent label required by the contract: not scientifically validated. */
  scoreNote: 'Match score is a transparent heuristic (shared interests + location + age proximity + intentions) and is not scientifically validated.';
}
export interface ScoreBreakdown { interests: number; location: number; ageProximity: number; intentions: number; total: number }
export interface Like { id: string; likerId: string; likedId: string; type: 'like' | 'super'; createdAt: number }
export interface Match {
  id: string; userAId: string; userBId: string; otherUser?: PublicUser;
  createdAt: number; unmatchedAt: number | null;
}
export interface PublicUser { id: string; username: string; displayName: string; avatarUrl: string | null; age: number | null; location: string | null }
export interface Conversation { id: string; matchId: string | null; type: string; members: PublicUser[]; lastMessage?: Message | null; createdAt: number; updatedAt: number }
export interface Message { id: string; conversationId: string; senderId: string; body: string; type: string; createdAt: number; readAt: number | null }
export interface Post {
  id: string; authorId: string; author?: PublicUser; body: string; imageUrl: string | null;
  feeling: string | null; location: string | null; hashtags: string[]; visibility: string;
  likeCount: number; commentCount: number; likedByMe?: boolean; createdAt: number; updatedAt: number;
}
export interface Comment { id: string; postId: string | null; confessionId: string | null; authorId: string; author?: PublicUser; body: string; createdAt: number }
export interface Confession {
  id: string; body: string; category: string | null; mood: string | null; hashtags: string[];
  /** Public responses NEVER expose authorId. Server keeps it only for admin investigation. */
  isAnonymous: boolean; authorLabel: string; likeCount: number; commentCount: number;
  likedByMe?: boolean; savedByMe?: boolean; createdAt: number;
}
export interface Notification {
  id: string; userId: string; type: string; title: string; body: string | null;
  data: Record<string, unknown> | null; relatedUserId: string | null; isRead: boolean; createdAt: number;
}
export interface Report { id: string; reporterId: string; targetType: string; targetId: string; reason: string; details: string | null; status: string; createdAt: number }
export interface Block { id: string; blockerId: string; blockedId: string; createdAt: number }
export interface AdminUser { id: string; email: string; name: string; role: 'admin' | 'moderator' | 'super_admin'; createdAt: number; lastLoginAt: number | null }
export interface AuditLog { id: string; adminId: string | null; action: string; targetType: string | null; targetId: string | null; details: Record<string, unknown> | null; createdAt: number }
export interface AuthSession { user: User; profile: Profile | null }
