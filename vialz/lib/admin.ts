import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Returns a Supabase client and the caller's role. Guests go to login. Non-admins get a 404. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('is_admin, role').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  return { supabase, role: me.role as string };
}
