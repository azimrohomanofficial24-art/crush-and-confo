import { z } from 'zod';

export const usernameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscore');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const emailSchema = z.string().email();

/** Server-side 18+ check: DOB must be at least 18 years ago. */
export function is18Plus(dateOfBirth: string, now = new Date()): boolean {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 18);
  return dob <= cutoff;
}
const dobSchema = z.string().refine((v) => is18Plus(v), { message: 'You must be at least 18 years old' });

export const registerSchema = z.object({
  username: usernameSchema, email: emailSchema, password: passwordSchema,
  displayName: z.string().min(1).max(80), dateOfBirth: dobSchema,
  gender: z.enum(['male', 'female', 'nonbinary', 'other', 'prefer_not_to_say']),
  location: z.string().max(120).optional(),
});
export const loginSchema = z.object({ emailOrUsername: z.string().min(1), password: z.string().min(1) });
export const verifyEmailSchema = z.object({ token: z.string().min(1) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(1), password: passwordSchema });

export const profileUpdateSchema = z.object({
  bio: z.string().max(500).nullable().optional(), avatarUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(), city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(), occupation: z.string().max(120).nullable().optional(),
  education: z.string().max(160).nullable().optional(), heightCm: z.number().int().min(100).max(250).nullable().optional(),
  intentions: z.string().max(120).nullable().optional(), relationshipStatus: z.string().max(60).nullable().optional(),
  showAge: z.boolean().optional(), isPrivate: z.boolean().optional(),
}).strict();
export const preferencesSchema = z.object({
  minAge: z.number().int().min(18).max(99), maxAge: z.number().int().min(18).max(99),
  preferredGenders: z.array(z.string()).default([]), maxDistanceKm: z.number().int().min(1).max(10000).nullable().optional(),
  intentions: z.string().max(120).nullable().optional(), showMe: z.boolean().optional(),
}).refine((v) => v.minAge <= v.maxAge, { message: 'minAge must be <= maxAge' });

export const postCreateSchema = z.object({
  body: z.string().min(1).max(2000), imageUrl: z.string().url().nullable().optional(),
  feeling: z.string().max(60).nullable().optional(), location: z.string().max(120).nullable().optional(),
  hashtags: z.array(z.string().max(40)).max(10).optional(), visibility: z.enum(['public', 'followers', 'private']).optional(),
});
export const commentCreateSchema = z.object({ body: z.string().min(1).max(1000) });
export const confessionCreateSchema = z.object({
  body: z.string().min(1).max(2000), category: z.string().max(60).nullable().optional(),
  mood: z.string().max(60).nullable().optional(), hashtags: z.array(z.string().max(40)).max(10).optional(),
  isAnonymous: z.boolean().optional(),
});
export const messageCreateSchema = z.object({ body: z.string().min(1).max(5000), type: z.enum(['text', 'image']).optional() });
export const likeSchema = z.object({ type: z.enum(['like', 'super']).optional() });
export const reportSchema = z.object({
  targetType: z.enum(['user', 'post', 'confession', 'comment', 'message']),
  targetId: z.string().min(1), reason: z.string().min(1).max(120), details: z.string().max(1000).optional(),
});
export const blockSchema = z.object({ blockedId: z.string().min(1) });
export const adminLoginSchema = z.object({ email: emailSchema, password: z.string().min(1) });
export const paginationSchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).optional() });
export const discoverQuerySchema = z.object({
  minAge: z.coerce.number().int().min(18).optional(), maxAge: z.coerce.number().int().max(99).optional(),
  gender: z.string().optional(), location: z.string().optional(),
  interests: z.string().optional(), intentions: z.string().optional(),
  cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
