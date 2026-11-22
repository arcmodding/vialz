'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  badgeSchema,
  createCodeSchema,
  profileSchema,
  redeemSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/schemas';
import { canonicalCode, generateCode, hashCode } from '@/lib/codes';
import { describePremium, isPremiumActive, LINK_LIMIT } from '@/lib/premium';

export type FormState = { error?: string; notice?: string };
export type CodeState = { error?: string; code?: string };

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { username, email, password } = parsed.data;

  const supabase = await createClient();
  const { data: available, error: checkError } = await supabase.rpc('username_available', { candidate: username });
  if (checkError) return { error: 'Could not check that username. Try again.' };
  if (!available) return { error: 'That username is taken' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { notice: 'Check your email to confirm your account.' };

  redirect('/dashboard');
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Email or password is incorrect' };

  const { data: profile } = await supabase.from('profiles').select('banned').eq('id', data.user.id).maybeSingle();
  if (profile?.banned) {
    await supabase.auth.signOut();
    return { error: 'This account has been suspended' };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session expired. Log in again.' };

  let links: unknown;
  try {
    links = JSON.parse(String(formData.get('links') ?? '[]'));
  } catch {
    return { error: 'Links could not be read. Refresh and try again.' };
  }

  const parsed = profileSchema.safeParse({ ...Object.fromEntries(formData), links });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { links: items, ...fields } = parsed.data;

  // Check plan limits before writing anything, so a rejected save changes nothing.
  const { data: me } = await supabase.from('profiles').select('premium_until').eq('id', user.id).single();
  const premium = isPremiumActive(me?.premium_until);
  const linkLimit = premium ? LINK_LIMIT.premium : LINK_LIMIT.free;
  if (items.length > linkLimit) return { error: `Your plan allows up to ${linkLimit} links` };
  if (fields.effect === 'glow' && !premium) return { error: 'Animated glow is a Premium feature' };

  // RLS and column grants ensure this only touches the signed-in user's row.
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('username')
    .single();
  if (error) return { error: error.message };

  const { error: linkError } = await supabase.rpc('replace_links', { items });
  if (linkError) return { error: linkError.message };

  revalidatePath('/dashboard');
  revalidatePath(`/${profile.username}`);
  return { notice: 'Saved' };
}

// ─── Premium codes ─────────────────────────────────────────────────────────

export async function redeemCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = redeemSchema.safeParse({ code: String(formData.get('code') ?? '') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const canonical = canonicalCode(parsed.data.code);
  if (canonical.length !== 12) return { error: 'That code is not valid' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('redeem_premium_code', { p_hash: hashCode(canonical) });
  if (error) return { error: error.message };

  revalidatePath('/dashboard', 'layout');
  return { notice: `Premium unlocked. ${describePremium(String(data))}.` };
}

export async function createPremiumCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const parsed = createCodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { label, duration, max_uses, expires_at } = parsed.data;

  const { display, hash } = generateCode();
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_premium_code', {
    p_hash: hash,
    p_label: label,
    p_duration_days: duration === 'lifetime' ? null : Number(duration),
    p_max_uses: max_uses,
    p_expires_at: expires_at,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/codes');
  return { code: display };
}

export async function revokeCode(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;

  const supabase = await createClient();
  await supabase.rpc('revoke_premium_code', { p_id: id.data });
  revalidatePath('/admin/codes');
}

// ─── Badges and moderation (admins only; enforced in the database) ────────

export async function grantBadge(formData: FormData) {
  const parsed = badgeSchema.safeParse({ id: formData.get('id'), slug: formData.get('slug') });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc('grant_badge', { p_target: parsed.data.id, p_slug: parsed.data.slug });
  revalidatePath('/admin');
}

export async function revokeBadge(formData: FormData) {
  const parsed = badgeSchema.safeParse({ id: formData.get('id'), slug: formData.get('slug') });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.rpc('revoke_badge', { p_target: parsed.data.id, p_slug: parsed.data.slug });
  revalidatePath('/admin');
}

export async function setBanned(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const banned = formData.get('banned') === 'true';

  const supabase = await createClient();
  await supabase.rpc('admin_set_banned', { target: id.data, value: banned });
  revalidatePath('/admin');
}
