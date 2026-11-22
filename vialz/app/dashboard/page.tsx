import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileEditor from '@/components/ProfileEditor';
import { signOut } from '@/app/actions';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url, banner_url, music_url, accent, background, font, effect, banned, links(label, url, position)')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) redirect('/login');
  if (profile.banned) await signOut();

  const links = [...profile.links]
    .sort((a, b) => a.position - b.position)
    .map(({ label, url }) => ({ label, url }));

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Your page</h1>
          <p className="mt-2 text-white/50">vialz.lol/{profile.username}</p>
        </div>
        <Link href={`/${profile.username}`} className="btn-ghost">View live page</Link>
      </div>
      <div className="mt-10">
        <ProfileEditor profile={profile} links={links} />
      </div>
    </main>
  );
}
