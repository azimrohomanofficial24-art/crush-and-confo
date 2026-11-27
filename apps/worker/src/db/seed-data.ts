// Shared seed logic used by scripts/seed.ts and scripts/seed-admin.ts.
// Creates demo users John Bay @john_bay, Samiya 19 Dhaka, interests, posts,
// confessions, a mutual match + conversation + messages, notifications.
// Passwords are hashed (Argon2id in Node, PBKDF2 fallback); never plaintext.
import { eq } from 'drizzle-orm';
import { users, profiles, userPreferences, interests, userInterests, likes, matches, conversations, conversationMembers, messages, posts, confessions, notifications, adminUsers } from './schema.js';
import { hashPassword } from '../auth/password.js';

export const DEMO_PASSWORD = 'Demo1234!';
export async function seedDb(db: any) {
  const now = Date.now();
  const interestNames = ['Music', 'Travel', 'Photography', 'Cooking', 'Movies', 'Reading', 'Fitness', 'Gaming', 'Art', 'Dancing'];
  const interestMap = new Map<string, string>();
  for (const name of interestNames) {
    const slug = name.toLowerCase();
    const [ex] = await db.select().from(interests).where(eq(interests.slug, slug)).limit(1);
    if (ex) interestMap.set(slug, ex.id);
    else { const [row] = await db.insert(interests).values({ name, slug, category: 'general' }).returning(); interestMap.set(slug, row.id); }
  }
  async function ensureUser(u: { username: string; email: string; displayName: string; dateOfBirth: string; gender: string; location: string; bio: string; city: string; country: string; intentions: string; interestSlugs: string[] }) {
    const [ex] = await db.select().from(users).where(eq(users.username, u.username)).limit(1);
    if (ex) return ex;
    const [user] = await db.insert(users).values({ username: u.username, email: u.email, passwordHash: await hashPassword(DEMO_PASSWORD), displayName: u.displayName, dateOfBirth: u.dateOfBirth, gender: u.gender, location: u.location, emailVerified: 1, createdAt: now, updatedAt: now }).returning();
    await db.insert(profiles).values({ userId: user.id, bio: u.bio, city: u.city, country: u.country, intentions: u.intentions, profileCompletion: 85 });
    await db.insert(userPreferences).values({ userId: user.id, minAge: 18, maxAge: 30, preferredGenders: JSON.stringify(['female', 'male']), intentions: u.intentions });
    for (const slug of u.interestSlugs) { const id = interestMap.get(slug); if (id) await db.insert(userInterests).values({ userId: user.id, interestId: id }); }
    return user;
  }
  const john = await ensureUser({ username: 'john_bay', email: 'john@example.com', displayName: 'John Bay', dateOfBirth: '2001-05-14', gender: 'male', location: 'Dhaka', bio: 'Dream Big...', city: 'Dhaka', country: 'Bangladesh', intentions: 'dating', interestSlugs: ['music', 'travel', 'photography'] });
  const samiya = await ensureUser({ username: 'samiya', email: 'samiya@example.com', displayName: 'Samiya', dateOfBirth: '2007-03-02', gender: 'female', location: 'Dhaka', bio: 'Love stories, sunsets and good conversations.', city: 'Dhaka', country: 'Bangladesh', intentions: 'dating', interestSlugs: ['music', 'movies', 'reading'] });
  const arif = await ensureUser({ username: 'arif_h', email: 'arif@example.com', displayName: 'Arif Hossain', dateOfBirth: '2000-11-20', gender: 'male', location: 'Chittagong', bio: 'Photographer and chai lover.', city: 'Chittagong', country: 'Bangladesh', intentions: 'friendship', interestSlugs: ['photography', 'travel'] });
  // Mutual like -> match -> conversation -> messages
  const [a, b] = john.id < samiya.id ? [john.id, samiya.id] : [samiya.id, john.id];
  await db.insert(likes).values({ likerId: john.id, likedId: samiya.id, type: 'like' }).onConflictDoNothing();
  await db.insert(likes).values({ likerId: samiya.id, likedId: john.id, type: 'like' }).onConflictDoNothing();
  let [match] = await db.select().from(matches).where(eq(matches.userAId, a)).limit(1);
  if (!match || match.userBId !== b) { const rows = await db.insert(matches).values({ userAId: a, userBId: b }).returning().catch(() => []); match = rows[0] ?? match; }
  if (match) {
    const [convEx] = await db.select().from(conversations).where(eq(conversations.matchId, match.id)).limit(1);
    let conv = convEx;
    if (!conv) { const [c] = await db.insert(conversations).values({ matchId: match.id }).returning(); conv = c; await db.insert(conversationMembers).values({ conversationId: conv.id, userId: john.id }); await db.insert(conversationMembers).values({ conversationId: conv.id, userId: samiya.id }); }
    const existingMsgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).limit(1);
    if (!existingMsgs.length) {
      await db.insert(messages).values({ conversationId: conv.id, senderId: samiya.id, body: 'Hi John! Loved your post about Dhaka sunsets.' });
      await db.insert(messages).values({ conversationId: conv.id, senderId: john.id, body: 'Hi Samiya! Thank you — would love to hear your favourite spots.' });
    }
  }
  const postCount = await db.select().from(posts).where(eq(posts.authorId, john.id)).limit(1);
  if (!postCount.length) {
    await db.insert(posts).values({ authorId: john.id, body: 'Sunset over Dhaka never gets old. Dream Big...', hashtags: JSON.stringify(['Life', 'Dhaka']), visibility: 'public' });
    await db.insert(posts).values({ authorId: samiya.id, body: 'Currently reading a book that feels like a warm hug.', hashtags: JSON.stringify(['Reading', 'Life']), visibility: 'public' });
  }
  const confCount = await db.select().from(confessions).where(eq(confessions.authorId, john.id)).limit(1);
  if (!confCount.length) {
    await db.insert(confessions).values({ authorId: john.id, isAnonymous: 1, body: 'Sometimes I just want someone who truly understands me...', category: 'Love', mood: 'hopeful', hashtags: JSON.stringify(['Love', 'Crush']) });
    await db.insert(confessions).values({ authorId: samiya.id, isAnonymous: 1, body: 'Life is better when you have someone to talk to, even in silence.', category: 'Friendship', mood: 'calm', hashtags: JSON.stringify(['Friendship', 'Life']) });
    await db.insert(confessions).values({ authorId: arif.id, isAnonymous: 0, body: 'I finally told my crush how I feel. Wish me luck!', category: 'Crush', mood: 'excited', hashtags: JSON.stringify(['Crush', 'Motivation']) });
  }
  const notifCount = await db.select().from(notifications).where(eq(notifications.userId, john.id)).limit(1);
  if (!notifCount.length) {
    await db.insert(notifications).values({ userId: john.id, type: 'match', title: 'New match!', body: 'You matched with Samiya.', relatedUserId: samiya.id });
    await db.insert(notifications).values({ userId: john.id, type: 'message', title: 'New message', body: 'Samiya: Hi John! Loved your post...', relatedUserId: samiya.id });
    await db.insert(notifications).values({ userId: samiya.id, type: 'like', title: 'Someone liked you', body: 'John Bay liked you.', relatedUserId: john.id });
  }
  return { john, samiya, arif, matchId: match?.id };
}
export async function seedAdmin(db: any, email: string, name: string) {
  const [ex] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (ex) return { admin: ex, password: null as string | null, existed: true };
  // One-time password: generated, printed to terminal only by the caller, never written to a file.
  const password = `Admin-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}!`;
  const [admin] = await db.insert(adminUsers).values({ email, passwordHash: await hashPassword(password), name, role: 'super_admin' }).returning();
  return { admin, password, existed: false };
}
