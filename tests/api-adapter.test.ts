import { describe, expect, it } from 'vitest';
import { toUser, toPost, toConfession, toConversation, toNotification, avatarColorFor, initialsFor, ageFromDob } from '../apps/web/src/lib/api';

// Adapters map the REAL Worker DTOs onto the frontend types. They must never
// invent users, counts or photos: missing data stays empty / null.

describe('toUser', () => {
  it('maps a public user row, splitting "City, Country"', () => {
    const u = toUser({ id: 'u1', username: 'rana', displayName: 'Rana Ahmed', avatarUrl: '/api/uploads/a.jpg', age: 24, location: 'Dhaka, Bangladesh' })
    expect(u.fullName).toBe('Rana Ahmed')
    expect(u.city).toBe('Dhaka')
    expect(u.country).toBe('Bangladesh')
    expect(u.avatarUrl).toBe('/api/uploads/a.jpg')
    expect(u.age).toBe(24)
    expect(u.avatarInitials).toBe('RA')
    expect(u.posts).toBe(0)
    expect(u.online).toBe(false)
  })
  it('has no photo and no invented counts when the server sends none', () => {
    const u = toUser({ id: 'u2', username: 'mim', displayName: 'Mim', age: null, location: null })
    expect(u.avatarUrl).toBeNull()
    expect(u.city).toBe('')
    expect(u.followers).toBe(0)
  })
  it('uses profile bio / interests / counts when provided', () => {
    const u = toUser(
      { id: 'u3', username: 'tan', displayName: 'Tanvir', age: 27, location: 'Chattogram' },
      { profile: { bio: 'Hello' }, interests: [{ name: 'Music' }], counts: { followers: 5, following: 2, posts: 3 } },
    )
    expect(u.bio).toBe('Hello')
    expect(u.interests).toEqual(['Music'])
    expect(u.followers).toBe(5)
    expect(u.posts).toBe(3)
  })
})

describe('toPost / toConfession', () => {
  it('maps post DTO counts and hashtags, never inventing an author', () => {
    const p = toPost({ id: 'p1', body: 'Hello #Love', createdAt: 1795769519287, likeCount: 2, commentCount: 1, likedByMe: true, savedByMe: false, hashtags: ['Love'], author: { id: 'u1', username: 'rana', displayName: 'Rana', age: 24, location: 'Dhaka' } })
    expect(p.content).toBe('Hello #Love')
    expect(p.likes).toBe(2)
    expect(p.hashtag).toBe('#Love')
    expect(p.likedByMe).toBe(true)
    expect(p.author.fullName).toBe('Rana')
  })
  it('falls back to a "Deleted user" author instead of a fake one', () => {
    const p = toPost({ id: 'p2', body: 'x', createdAt: 0, likeCount: 0, commentCount: 0, hashtags: [], author: null })
    expect(p.author.fullName).toBe('Deleted user')
  })
  it('never exposes authorId on confessions', () => {
    const c = toConfession({ id: 'c1', body: 'secret', isAnonymous: 1, createdAt: 0, likeCount: 0, commentCount: 0, authorLabel: 'Anonymous', category: 'Love' })
    expect(c.anonymous).toBe(true)
    expect(c.authorName).toBeUndefined()
    expect(c.topic).toBe('Love')
    expect('authorId' in c).toBe(false)
  })
})

describe('toConversation / toNotification', () => {
  it('picks the other member as otherUser and uses the real last message', () => {
    const conv = toConversation(
      { id: 'cv1', matchId: 'm1', createdAt: 1000, updatedAt: 2000, members: [
        { id: 'me', username: 'me', displayName: 'Me', age: 25, location: 'Dhaka' },
        { id: 'them', username: 'them', displayName: 'Them', age: 23, location: 'Sylhet' },
      ], lastMessage: { body: 'Hi there', createdAt: 2000 } },
      'me',
    )
    expect(conv.otherUser.username).toBe('them')
    expect(conv.lastMessage).toBe('Hi there')
    expect(conv.unread).toBe(0)
  })
  it('maps notification read state without inventing an actor', () => {
    const n = toNotification({ id: 'n1', type: 'like', title: 'Someone liked you', body: '', createdAt: 1000, isRead: 0, data: null })
    expect(n.read).toBe(false)
    expect(n.actor).toBeUndefined()
  })
})

describe('helpers', () => {
  it('avatar colours are deterministic per username', () => {
    expect(avatarColorFor('rana')).toBe(avatarColorFor('rana'))
    expect(avatarColorFor('rana')).not.toBe(avatarColorFor('mim'))
  })
  it('initials come from the display name', () => {
    expect(initialsFor('Rana Ahmed')).toBe('RA')
    expect(initialsFor('Mim')).toBe('M')
  })
  it('ageFromDob computes full years', () => {
    expect(ageFromDob('2000-01-01')).toBeGreaterThanOrEqual(26)
    expect(ageFromDob('not-a-date')).toBeNull()
    expect(ageFromDob(null)).toBeNull()
  })
})
