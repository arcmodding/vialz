'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { profileSchema, signInSchema, signUpSchema } from '@/lib/schemas';

export type FormState = { error?: string; notice?: string };

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

  // RLS and column grants ensure this only touches the signed-in user's row.
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('username')
    .single();
  if (error) return { error: 'Could not save. Try again.' };

  const { error: linkError } = await supabase.rpc('replace_links', { items });
  if (linkError) return { error: 'Profile saved, but your links did not update.' };

  revalidatePath('/dashboard');
  revalidatePath(`/${profile.username}`);
  return { notice: 'Saved' };
}

export async function setBanned(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const banned = formData.get('banned') === 'true';

  const supabase = await createClient();
  await supabase.rpc('admin_set_banned', { target: id.data, value: banned });
  revalidatePath('/admin');
}
