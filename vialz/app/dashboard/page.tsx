import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions';
import { describePremium, isPremiumActive, PREMIUM_BADGE } from '@/lib/premium';
import type { BadgeInfo, ProfileRow } from '@/lib/types';
import Badges from '@/components/Badges';
import ProfileEditor from '@/components/ProfileEditor';
import RedeemCode from '@/components/RedeemCode';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url, banner_url, music_url, accent, background, font, effect, banned, premium_until, links(id, label, url, position), profile_badges(badges(slug, label, description, icon, tone, sort))')
    .eq('id', user.id)
    .maybeSingle();
  const profile = (data ?? null) as ProfileRow | null;
  if (!profile) redirect('/login');
  if (profile.banned) await signOut();

  const premium = isPremiumActive(profile.premium_until);
  const effect = profile.effect === 'glow' && !premium ? 'grain' : profile.effect;
  const links = [...profile.links]
    .sort((a, b) => a.position - b.position)
    .map(({ id, label, url }) => ({ id, label, url }));
  const badges: BadgeInfo[] = [
    ...profile.profile_badges.map((pb) => pb.badges).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    ...(premium ? [PREMIUM_BADGE] : []),
  ];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Your page</h1>
          <p className="mt-2 text-white/50">vialz.lol/{profile.username}</p>
          {badges.length > 0 && <div className="mt-4"><Badges badges={badges} /></div>}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/analytics" className="btn-ghost">Analytics</Link>
          <Link href={`/${profile.username}`} className="btn-ghost">View live page</Link>
        </div>
      </div>

      <section className="glass mt-8 p-6 sm:p-8">
        <p className="font-medium">{premium ? `Premium · ${describePremium(profile.premium_until as string)}` : 'Free plan'}</p>
        <p className="mt-1 text-sm text-white/50">
          {premium
            ? 'Analytics, 30 links and animated glow are unlocked.'
            : 'Redeem a code to unlock analytics, 30 links and animated glow.'}
        </p>
        <div className="mt-6">
          <RedeemCode />
        </div>
      </section>

      <div className="mt-10">
        <ProfileEditor profile={{ ...profile, effect }} links={links} premium={premium} />
      </div>
    </main>
  );
}
