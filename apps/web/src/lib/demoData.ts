// Clearly-labelled LOCAL DEMO DATA fallback.
// Used only when the real API (Worker, /api/*) is unreachable.
// Every mutation here is persisted to localStorage so buttons do real,
// observable work in demo mode. Replace with the live API once Agent B's
// Worker is running — the api client in api.ts already prefers /api/*.
import type { AppNotification, Comment, Confession, Conversation, Message, Post, User } from './types'

const KEY = 'cc-demo-store-v1'
export const CURRENT_USER_ID = 'u-john'

const mkUser = (p: Partial<User> & { id: string; username: string; fullName: string }): User => ({
  age: 20, city: 'Dhaka', country: 'Bangladesh', gender: 'Female', interestedIn: 'Male',
  bio: '', avatarColor: '#F52D91', avatarInitials: p.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2),
  interests: [], online: false, verified: false, posts: 0, followers: 0, following: 0, ...p,
})

export const seedUsers: User[] = [
  mkUser({ id: 'u-john', username: 'john_bay', fullName: 'John Bay', age: 22, city: 'Dhaka', country: 'Bangladesh', gender: 'Male', interestedIn: 'Female', bio: 'Dream Big. Coffee first, confessions later.', avatarColor: '#873BFA', interests: ['Music', 'Travel', 'Photography'], online: true, verified: true, posts: 245, followers: 12500, following: 8900 }),
  mkUser({ id: 'u-samiya', username: 'samiya', fullName: 'Samiya', age: 19, city: 'Dhaka', country: 'Bangladesh', bio: 'Loves sunsets, books and honest conversations.', avatarColor: '#F52D91', interests: ['Reading', 'Music', 'Sunsets'], online: true, verified: true, posts: 86, followers: 3400, following: 210, matchPercent: 92, distanceKm: 3 }),
  mkUser({ id: 'u-ayesha', username: 'ayesha_r', fullName: 'Ayesha Rahman', age: 21, city: 'Chittagong', country: 'Bangladesh', bio: 'Foodie. Future architect.', avatarColor: '#20B981', interests: ['Food', 'Design', 'Travel'], online: true, verified: true, posts: 132, followers: 2100, following: 480, matchPercent: 88, distanceKm: 210 }),
  mkUser({ id: 'u-tanvir', username: 'tanvir_h', fullName: 'Tanvir Hasan', age: 23, city: 'Dhaka', country: 'Bangladesh', gender: 'Male', interestedIn: 'Female', bio: 'Guitar, gym, good vibes.', avatarColor: '#F5A623', interests: ['Guitar', 'Fitness', 'Movies'], online: true, verified: false, posts: 64, followers: 980, following: 320, matchPercent: 84, distanceKm: 6 }),
  mkUser({ id: 'u-nusrat', username: 'nusrat_j', fullName: 'Nusrat Jahan', age: 20, city: 'Sylhet', country: 'Bangladesh', bio: 'Poetry in the rain.', avatarColor: '#873BFA', interests: ['Poetry', 'Rain', 'Tea'], online: false, verified: true, posts: 45, followers: 1500, following: 190, matchPercent: 81, distanceKm: 190 }),
  mkUser({ id: 'u-rafi', username: 'rafi_k', fullName: 'Rafi Karim', age: 24, city: 'Dhaka', country: 'Bangladesh', gender: 'Male', interestedIn: 'Female', bio: 'Startup dreamer.', avatarColor: '#17142C', interests: ['Startups', 'Tech', 'Cricket'], online: true, verified: false, posts: 210, followers: 4200, following: 900, matchPercent: 78, distanceKm: 8 }),
  mkUser({ id: 'u-mim', username: 'mim_a', fullName: 'Mim Akter', age: 18, city: 'Khulna', country: 'Bangladesh', bio: 'Art student. Cat person.', avatarColor: '#E84B65', interests: ['Art', 'Cats', 'Music'], online: false, verified: false, posts: 28, followers: 640, following: 150, matchPercent: 76, distanceKm: 320 }),
]

export interface DemoStore {
  users: User[]
  posts: Post[]
  confessions: Confession[]
  conversations: Conversation[]
  messages: Message[]
  notifications: AppNotification[]
  comments: Record<string, Comment[]>
  likedUserIds: string[]
  passedUserIds: string[]
  superLikedUserIds: string[]
  matchedUserIds: string[]
  followedUserIds: string[]
  blockedUserIds: string[]
  reportedIds: string[]
  myConfessionIds: string[]
}

const now = Date.now()
const hrs = (h: number) => new Date(now - h * 3600_000).toISOString()

function seed(): DemoStore {
  const [john, samiya, ayesha, tanvir, nusrat] = seedUsers
  return {
    users: seedUsers,
    posts: [
      { id: 'p1', author: ayesha, content: 'Golden hour in Chittagong hits different. Who else chases sunsets?', createdAt: hrs(2), likes: 128, comments: 24, likedByMe: false, savedByMe: false, feeling: 'Grateful', location: 'Chittagong', hashtag: '#Sunset' },
      { id: 'p2', author: tanvir, content: 'New song I have been working on all week. Music is the only honest language I know.', createdAt: hrs(5), likes: 96, comments: 18, likedByMe: true, savedByMe: false, feeling: 'Creative', hashtag: '#Music' },
      { id: 'p3', author: nusrat, content: 'Rainy evening, a cup of tea, and a book I cannot put down. Simple joys.', createdAt: hrs(9), likes: 74, comments: 11, likedByMe: false, savedByMe: true, feeling: 'Peaceful', location: 'Sylhet', hashtag: '#Life' },
      { id: 'p4', author: john, content: 'Confess. Connect. Match. This community keeps growing — thank you for being here.', createdAt: hrs(26), likes: 210, comments: 42, likedByMe: false, savedByMe: false, hashtag: '#Community' },
    ],
    confessions: [
      { id: 'c1', text: 'Sometimes I just want someone who truly understands me...', anonymous: true, createdAt: hrs(2), likes: 4200, comments: 348, likedByMe: false, savedByMe: false, topic: 'Love' },
      { id: 'c2', text: 'Life is better when you have someone to talk to, even in silence.', anonymous: true, createdAt: hrs(4), likes: 3800, comments: 215, likedByMe: true, savedByMe: false, topic: 'Friendship' },
      { id: 'c3', text: 'I have liked my best friend for two years and I still cannot say it out loud.', anonymous: true, createdAt: hrs(7), likes: 2900, comments: 189, likedByMe: false, savedByMe: true, topic: 'Crush' },
      { id: 'c4', text: 'To the stranger who smiled at me on the bus today — you made my whole week.', anonymous: true, createdAt: hrs(12), likes: 1500, comments: 96, likedByMe: false, savedByMe: false, topic: 'Life' },
      { id: 'c5', text: 'I finally told my crush how I feel. She said she felt the same. Never give up.', anonymous: false, authorName: 'A hopeful romantic', createdAt: hrs(30), likes: 5600, comments: 402, likedByMe: false, savedByMe: false, topic: 'Motivation' },
    ],
    conversations: [
      { id: 'conv-samiya', otherUser: samiya, lastMessage: 'That sounds lovely! Coffee this weekend?', lastMessageAt: hrs(1), unread: 2, matchedAt: hrs(48) },
      { id: 'conv-ayesha', otherUser: ayesha, lastMessage: 'Haha, exactly! You get it.', lastMessageAt: hrs(3), unread: 1, matchedAt: hrs(72) },
      { id: 'conv-tanvir', otherUser: tanvir, lastMessage: 'Sent you the song link, tell me what you think.', lastMessageAt: hrs(8), unread: 0, matchedAt: hrs(96) },
    ],
    messages: [
      { id: 'm1', conversationId: 'conv-samiya', senderId: 'u-samiya', text: 'Hi John! I saw we matched. I love your taste in music.', createdAt: hrs(2), read: true },
      { id: 'm2', conversationId: 'conv-samiya', senderId: 'u-john', text: 'Hi Samiya! Thank you — your profile made me smile too.', createdAt: hrs(2), read: true },
      { id: 'm3', conversationId: 'conv-samiya', senderId: 'u-samiya', text: 'That sounds lovely! Coffee this weekend?', createdAt: hrs(1), read: false },
      { id: 'm4', conversationId: 'conv-ayesha', senderId: 'u-ayesha', text: 'Haha, exactly! You get it.', createdAt: hrs(3), read: false },
      { id: 'm5', conversationId: 'conv-tanvir', senderId: 'u-tanvir', text: 'Sent you the song link, tell me what you think.', createdAt: hrs(8), read: true },
    ],
    notifications: [
      { id: 'n1', type: 'match', title: 'New match!', body: 'You and Samiya liked each other. Say hello!', createdAt: hrs(1), read: false, actor: samiya },
      { id: 'n2', type: 'like', title: 'Ayesha liked your post', body: 'Ayesha Rahman liked your sunset post.', createdAt: hrs(3), read: false, actor: ayesha },
      { id: 'n3', type: 'message', title: 'New message from Samiya', body: 'Coffee this weekend?', createdAt: hrs(1), read: false, actor: samiya },
      { id: 'n4', type: 'follow', title: 'Tanvir started following you', body: 'Tanvir Hasan is now following you.', createdAt: hrs(6), read: false, actor: tanvir },
      { id: 'n5', type: 'comment', title: 'Nusrat commented', body: '"So relatable!" on your post.', createdAt: hrs(9), read: false, actor: nusrat },
      { id: 'n6', type: 'system', title: 'Welcome to Crush and Confo', body: 'Complete your profile to get better matches.', createdAt: hrs(50), read: true },
    ],
    comments: {
      p1: [{ id: 'cm1', author: tanvir, text: 'Absolutely — golden hour is unbeatable.', createdAt: hrs(1) }],
      c1: [{ id: 'cm2', author: nusrat, text: 'You are not alone in feeling this.', createdAt: hrs(1) }],
    },
    likedUserIds: [], passedUserIds: [], superLikedUserIds: [],
    matchedUserIds: ['u-samiya', 'u-ayesha', 'u-tanvir'],
    followedUserIds: ['u-samiya', 'u-ayesha'],
    blockedUserIds: [], reportedIds: [], myConfessionIds: ['c5'],
  }
}

let store: DemoStore
try {
  const raw = localStorage.getItem(KEY)
  store = raw ? (JSON.parse(raw) as DemoStore) : seed()
} catch {
  store = seed()
}
export function getStore(): DemoStore { return store }
export function saveStore() { try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* storage unavailable */ } }
export function resetDemo() { store = seed(); saveStore() }
export const currentUser: User = seedUsers[0]
export const onlineNow = seedUsers.filter((u) => u.online)
export const trendingTopics = ['Love', 'Crush', 'Friendship', 'Motivation', 'Life']
