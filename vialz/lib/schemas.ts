import { z } from 'zod';
import { BACKGROUND_KEYS, EFFECT_KEYS, FONT_KEYS, RESERVED_USERNAMES } from './config';
import { LINK_LIMIT } from './premium';

const httpsUrl = /^https:\/\/\S+$/;

export const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Use 3–20 letters, numbers or underscores')
    .refine((v) => !RESERVED_USERNAMES.includes(v), 'That username is reserved'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || httpsUrl.test(v), 'Links must start with https://')
  .transform((v) => v || null);

export const profileSchema = z.object({
  display_name: z.string().trim().max(40, 'Display name: 40 characters max').transform((v) => v || null),
  bio: z.string().trim().max(280, 'Bio: 280 characters max').transform((v) => v || null),
  avatar_url: optionalUrl,
  banner_url: optionalUrl,
  music_url: optionalUrl,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid color'),
  background: z.enum(BACKGROUND_KEYS),
  font: z.enum(FONT_KEYS),
  effect: z.enum(EFFECT_KEYS),
  links: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        label: z.string().trim().min(1, 'Every link needs a label').max(30, 'Labels: 30 characters max'),
        url: z
          .string()
          .trim()
          .max(500)
          .refine((v) => httpsUrl.test(v), 'Enter a full link that starts with https://'),
      }),
    )
    .max(LINK_LIMIT.premium, `Up to ${LINK_LIMIT.premium} links`),
});

export const createCodeSchema = z.object({
  label: z.string().trim().min(1, 'Add a label so you can find this code later').max(60, 'Labels: 60 characters max'),
  duration: z.enum(['30', '90', '365', 'lifetime']),
  max_uses: z.coerce.number().int('Uses must be a whole number').min(1, 'At least 1 use').max(1000, 'Up to 1000 uses'),
  expires_at: z.string().optional().transform((v) => v || null),
});

export const redeemSchema = z.object({
  code: z.string().trim().min(1, 'Enter a code').max(40, 'That code is not valid'),
});

export const badgeSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z_]{2,30}$/, 'Choose a badge'),
});
