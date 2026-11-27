import { describe, expect, it } from 'vitest';
import {
  commentCreateSchema,
  confessionCreateSchema,
  is18Plus,
  likeSchema,
  postCreateSchema,
  registerSchema,
} from '../packages/validation/src/index';

// These tests import the REAL Zod schemas in packages/validation/src/index.ts
// (Agent B). Two deliberate differences from the CONTRACT's first draft, recorded
// here so they are visible: (1) the real password rule is length >= 8 only —
// there is no letter+number requirement; (2) the real confession limit is 2000
// chars (same as posts), not 1000.

const validRegistration = {
  username: 'samiya_19',
  email: 'samiya@example.com',
  password: 'Love1234',
  displayName: 'Samiya',
  dateOfBirth: '2005-01-01',
  gender: 'female' as const,
};

describe('registerSchema', () => {
  it('accepts a valid 18+ registration', () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(registerSchema.safeParse({ ...validRegistration, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects under-18s (server-side 18+ check from DOB)', () => {
    const r = registerSchema.safeParse({ ...validRegistration, dateOfBirth: '2012-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message).join(' ')).toMatch(/18/);
  });

  it('accepts someone who turned 18 today', () => {
    const today = new Date();
    const dob = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(registerSchema.safeParse({ ...validRegistration, dateOfBirth: dob }).success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(registerSchema.safeParse({ ...validRegistration, password: 'short' }).success).toBe(false);
  });

  it('accepts a >= 8 char password with no number (real schema has no letter+number rule)', () => {
    expect(registerSchema.safeParse({ ...validRegistration, password: 'passwordonly' }).success).toBe(true);
  });

  it('rejects bad usernames', () => {
    for (const username of ['ab', 'has space', 'ok_name-1']) {
      expect(registerSchema.safeParse({ ...validRegistration, username }).success).toBe(false);
    }
  });

  it('rejects a missing displayName and an invalid gender', () => {
    expect(registerSchema.safeParse({ ...validRegistration, displayName: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegistration, gender: 'unknown' }).success).toBe(false);
  });
});

describe('is18Plus', () => {
  it('is true on the 18th birthday, false the day before', () => {
    const now = new Date('2026-11-27');
    expect(is18Plus('2008-11-27', now)).toBe(true);
    expect(is18Plus('2008-11-28', now)).toBe(false);
    expect(is18Plus('not-a-date', now)).toBe(false);
  });
});

describe('confessionCreateSchema', () => {
  it('accepts a normal confession', () => {
    expect(confessionCreateSchema.safeParse({ body: 'I have liked you since orientation.' }).success).toBe(true);
  });
  it('rejects empty and over-long confessions (real limit: 2000 chars)', () => {
    expect(confessionCreateSchema.safeParse({ body: '' }).success).toBe(false);
    expect(confessionCreateSchema.safeParse({ body: 'x'.repeat(2000) }).success).toBe(true);
    expect(confessionCreateSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('postCreateSchema', () => {
  it('accepts a normal post and rejects empty / over-long posts (limit: 2000 chars)', () => {
    expect(postCreateSchema.safeParse({ body: 'Hello world' }).success).toBe(true);
    expect(postCreateSchema.safeParse({ body: '' }).success).toBe(false);
    expect(postCreateSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('commentCreateSchema', () => {
  it('caps comments at 1000 chars', () => {
    expect(commentCreateSchema.safeParse({ body: 'x'.repeat(1000) }).success).toBe(true);
    expect(commentCreateSchema.safeParse({ body: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('likeSchema', () => {
  it('accepts like/super types and rejects anything else', () => {
    expect(likeSchema.safeParse({ type: 'like' }).success).toBe(true);
    expect(likeSchema.safeParse({ type: 'super' }).success).toBe(true);
    expect(likeSchema.safeParse({ type: 'hate' }).success).toBe(false);
  });
  // NOTE: self-like prevention is NOT a schema rule — it is enforced in the
  // worker route (apps/worker/src/routes/matching.ts: "You cannot like yourself",
  // HTTP 400). That is the right layer for it, since it needs the logged-in user.
});
