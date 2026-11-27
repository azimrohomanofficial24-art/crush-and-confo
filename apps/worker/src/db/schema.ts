import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// All 25 tables from CONTRACT.md. Timestamps are integer ms since epoch.
// IDs are UUID text (crypto.randomUUID()), generated in code.
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name = 'created_at') => integer(name).notNull().$defaultFn(() => Date.now());

export const users = sqliteTable('users', {
  id: id(), username: text('username').notNull(), email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(), displayName: text('display_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(), gender: text('gender').notNull(),
  location: text('location'), status: text('status').notNull().default('active'),
  emailVerified: integer('email_verified').notNull().default(0),
  createdAt: ts(), updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
  deletedAt: integer('deleted_at'),
}, (t) => ({users_username_unique: uniqueIndex('users_username_unique').on(t.username), users_email_unique: uniqueIndex('users_email_unique').on(t.email), users_status_idx: index('users_status_idx').on(t.status)}));

export const profiles = sqliteTable('profiles', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'), avatarUrl: text('avatar_url'), coverUrl: text('cover_url'),
  city: text('city'), country: text('country'), occupation: text('occupation'), education: text('education'),
  heightCm: integer('height_cm'), intentions: text('intentions'), relationshipStatus: text('relationship_status'),
  showAge: integer('show_age').notNull().default(1), isPrivate: integer('is_private').notNull().default(0),
  profileCompletion: integer('profile_completion').notNull().default(0),
  createdAt: ts(), updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
}, (t) => ({profiles_user_unique: uniqueIndex('profiles_user_unique').on(t.userId)}));

export const userPreferences = sqliteTable('user_preferences', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  minAge: integer('min_age').notNull().default(18), maxAge: integer('max_age').notNull().default(99),
  preferredGenders: text('preferred_genders').notNull().default('[]'),
  maxDistanceKm: integer('max_distance_km'), intentions: text('intentions'),
  showMe: integer('show_me').notNull().default(1),
  createdAt: ts(), updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
}, (t) => ({user_preferences_user_unique: uniqueIndex('user_preferences_user_unique').on(t.userId)}));

export const interests = sqliteTable('interests', {
  id: id(), name: text('name').notNull(), slug: text('slug').notNull(), category: text('category'),
  createdAt: ts(),
}, (t) => ({interests_name_unique: uniqueIndex('interests_name_unique').on(t.name), interests_slug_unique: uniqueIndex('interests_slug_unique').on(t.slug)}));

export const userInterests = sqliteTable('user_interests', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  interestId: text('interest_id').notNull().references(() => interests.id, { onDelete: 'cascade' }),
  createdAt: ts(),
}, (t) => ({user_interests_pair_unique: uniqueIndex('user_interests_pair_unique').on(t.userId, t.interestId), user_interests_user_idx: index('user_interests_user_idx').on(t.userId)}));

export const likes = sqliteTable('likes', {
  id: id(), likerId: text('liker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  likedId: text('liked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('like'), createdAt: ts(),
}, (t) => ({likes_pair_unique: uniqueIndex('likes_pair_unique').on(t.likerId, t.likedId), likes_liked_idx: index('likes_liked_idx').on(t.likedId)}));

export const matches = sqliteTable('matches', {
  id: id(), userAId: text('user_a_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userBId: text('user_b_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts(), unmatchedAt: integer('unmatched_at'),
}, (t) => ({matches_pair_unique: uniqueIndex('matches_pair_unique').on(t.userAId, t.userBId), matches_user_a_idx: index('matches_user_a_idx').on(t.userAId), matches_user_b_idx: index('matches_user_b_idx').on(t.userBId)}));

export const conversations = sqliteTable('conversations', {
  id: id(), matchId: text('match_id').references(() => matches.id, { onDelete: 'set null' }),
  type: text('type').notNull().default('direct'), createdAt: ts(),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
}, (t) => ({conversations_match_unique: uniqueIndex('conversations_match_unique').on(t.matchId)}));

export const conversationMembers = sqliteTable('conversation_members', {
  id: id(), conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastReadAt: integer('last_read_at'), joinedAt: ts('joined_at'),
}, (t) => ({conversation_members_pair_unique: uniqueIndex('conversation_members_pair_unique').on(t.conversationId, t.userId), conversation_members_user_idx: index('conversation_members_user_idx').on(t.userId)}));

export const messages = sqliteTable('messages', {
  id: id(), conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(), type: text('type').notNull().default('text'),
  createdAt: ts(), readAt: integer('read_at'), editedAt: integer('edited_at'),
}, (t) => ({messages_conversation_idx: index('messages_conversation_idx').on(t.conversationId, t.createdAt)}));

export const posts = sqliteTable('posts', {
  id: id(), authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(), imageUrl: text('image_url'), feeling: text('feeling'), location: text('location'),
  hashtags: text('hashtags').notNull().default('[]'), visibility: text('visibility').notNull().default('public'),
  createdAt: ts(), updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
}, (t) => ({posts_author_idx: index('posts_author_idx').on(t.authorId), posts_created_idx: index('posts_created_idx').on(t.createdAt)}));

export const postLikes = sqliteTable('post_likes', {
  id: id(), postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), createdAt: ts(),
}, (t) => ({post_likes_pair_unique: uniqueIndex('post_likes_pair_unique').on(t.postId, t.userId)}));

export const comments = sqliteTable('comments', {
  id: id(), postId: text('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  confessionId: text('confession_id').references(() => confessions.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(), createdAt: ts(),
}, (t) => ({comments_post_idx: index('comments_post_idx').on(t.postId), comments_confession_idx: index('comments_confession_idx').on(t.confessionId)}));

export const follows = sqliteTable('follows', {
  id: id(), followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts(),
}, (t) => ({follows_pair_unique: uniqueIndex('follows_pair_unique').on(t.followerId, t.followingId), follows_following_idx: index('follows_following_idx').on(t.followingId)}));

export const confessions = sqliteTable('confessions', {
  id: id(),
  // authorId is kept server-side ONLY for admin investigation; public API never returns it.
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isAnonymous: integer('is_anonymous').notNull().default(1),
  body: text('body').notNull(), category: text('category'), mood: text('mood'),
  hashtags: text('hashtags').notNull().default('[]'), status: text('status').notNull().default('published'),
  createdAt: ts(),
}, (t) => ({confessions_created_idx: index('confessions_created_idx').on(t.createdAt), confessions_status_idx: index('confessions_status_idx').on(t.status)}));

export const confessionLikes = sqliteTable('confession_likes', {
  id: id(), confessionId: text('confession_id').notNull().references(() => confessions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), createdAt: ts(),
}, (t) => ({confession_likes_pair_unique: uniqueIndex('confession_likes_pair_unique').on(t.confessionId, t.userId)}));

export const notifications = sqliteTable('notifications', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), title: text('title').notNull(), body: text('body'),
  data: text('data'), relatedUserId: text('related_user_id').references(() => users.id, { onDelete: 'set null' }),
  isRead: integer('is_read').notNull().default(0), createdAt: ts(),
}, (t) => ({notifications_user_idx: index('notifications_user_idx').on(t.userId, t.createdAt), notifications_unread_idx: index('notifications_unread_idx').on(t.userId, t.isRead)}));

export const reports = sqliteTable('reports', {
  id: id(), reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(), targetId: text('target_id').notNull(),
  reason: text('reason').notNull(), details: text('details'),
  status: text('status').notNull().default('open'), reviewedBy: text('reviewed_by'),
  createdAt: ts(),
}, (t) => ({reports_status_idx: index('reports_status_idx').on(t.status), reports_target_idx: index('reports_target_idx').on(t.targetType, t.targetId)}));

export const blocks = sqliteTable('blocks', {
  id: id(), blockerId: text('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: text('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts(),
}, (t) => ({blocks_pair_unique: uniqueIndex('blocks_pair_unique').on(t.blockerId, t.blockedId)}));

export const savedPosts = sqliteTable('saved_posts', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  confessionId: text('confession_id').references(() => confessions.id, { onDelete: 'cascade' }),
  createdAt: ts(),
}, (t) => ({saved_posts_post_unique: uniqueIndex('saved_posts_post_unique').on(t.userId, t.postId), saved_posts_confession_unique: uniqueIndex('saved_posts_confession_unique').on(t.userId, t.confessionId)}));

export const emailVerifications = sqliteTable('email_verifications', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'), createdAt: ts(),
}, (t) => ({email_verifications_token_unique: uniqueIndex('email_verifications_token_unique').on(t.tokenHash)}));

export const passwordResets = sqliteTable('password_resets', {
  id: id(), userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(), expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'), createdAt: ts(),
}, (t) => ({password_resets_token_unique: uniqueIndex('password_resets_token_unique').on(t.tokenHash)}));

export const adminUsers = sqliteTable('admin_users', {
  id: id(), email: text('email').notNull(), passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(), role: text('role').notNull().default('admin'),
  createdAt: ts(), lastLoginAt: integer('last_login_at'),
}, (t) => ({admin_users_email_unique: uniqueIndex('admin_users_email_unique').on(t.email)}));

export const auditLogs = sqliteTable('audit_logs', {
  id: id(), adminId: text('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  action: text('action').notNull(), targetType: text('target_type'), targetId: text('target_id'),
  details: text('details'), createdAt: ts(),
}, (t) => ({audit_logs_admin_idx: index('audit_logs_admin_idx').on(t.adminId), audit_logs_created_idx: index('audit_logs_created_idx').on(t.createdAt)}));

export const platformSettings = sqliteTable('platform_settings', {
  key: text('key').primaryKey(), value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
});

export const announcements = sqliteTable('announcements', {
  id: id(), title: text('title').notNull(), body: text('body').notNull(),
  audience: text('audience').notNull().default('all'), // 'all' | 'verified' | 'premium'
  active: integer('active').notNull().default(1),
  createdBy: text('created_by').references(() => adminUsers.id, { onDelete: 'set null' }),
  createdAt: ts(), updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
}, (t) => ({announcements_created_idx: index('announcements_created_idx').on(t.createdAt), announcements_active_idx: index('announcements_active_idx').on(t.active)}));
