import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPremiumActive } from '@/lib/premium';
import type { DailyRow, LinkStatsRow } from '@/lib/types';
import RedeemCode from '@/components/RedeemCode';

export const metadata = { title: 'Analytics' };

const WINDOW_DAYS = 30;

function lastDays(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (count - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-6">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-3 font-display text-5xl">{value.toLocaleString('en-US')}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('username, views, premium_until').eq('id', user.id).maybeSingle();
  if (!me) redirect('/login');

  if (!isPremiumActive(me.premium_until)) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 animate-rise">
        <Link href="/dashboard" className="text-sm text-white/50 transition hover:text-white">Back to editor</Link>
        <h1 className="mt-4 font-display text-5xl">Analytics</h1>
        <p className="mt-3 max-w-xl text-white/55">
          See daily profile views and link clicks for the last 30 days. Analytics is included with Premium.
        </p>
        <section className="glass mt-8 p-6 sm:p-8">
          <RedeemCode />
        </section>
      </main>
    );
  }

  const days = lastDays(WINDOW_DAYS);
  const since = days[0];
  const [dailyRes, linksRes] = await Promise.all([
    supabase.from('profile_daily').select('day, views').eq('profile_id', user.id).gte('day', since),
    supabase.from('links').select('id, label, url, link_daily(day, clicks)').eq('profile_id', user.id),
  ]);
  const daily = (dailyRes.data ?? []) as DailyRow[];
  const linkRows = (linksRes.data ?? []) as LinkStatsRow[];

  const viewsByDay = days.map((day) => daily.find((r) => r.day === day)?.views ?? 0);
  const totalViews = viewsByDay.reduce((sum, v) => sum + v, 0);
  const links = linkRows
    .map((l) => ({
      id: l.id,
      label: l.label,
      host: l.url.replace(/^https:\/\//, '').split('/')[0],
      clicks: l.link_daily.filter((d) => d.day >= since).reduce((sum, d) => sum + d.clicks, 0),
    }))
    .sort((a, b) => b.clicks - a.clicks);
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const peakViews = Math.max(1, ...viewsByDay);
  const topClicks = Math.max(1, ...links.map((l) => l.clicks));

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 animate-rise">
      <Link href="/dashboard" className="text-sm text-white/50 transition hover:text-white">Back to editor</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl">Analytics</h1>
        <p className="text-sm text-white/50">Last {WINDOW_DAYS} days · vialz.lol/{me.username}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Profile views" value={totalViews} />
        <Stat label="Link clicks" value={totalClicks} />
        <Stat label="All-time views" value={Number(me.views)} />
      </div>

      <section className="glass mt-6 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Profile views</h2>
        <div className="mt-8 flex h-44 items-end gap-1.5" role="img" aria-label="Daily profile views for the last 30 days">
          {viewsByDay.map((v, i) => (
            <div
              key={days[i]}
              title={`${days[i]}: ${v}`}
              className="flex-1 rounded-t-md bg-[#9be7ff]/60 transition-colors hover:bg-[#9be7ff]"
              style={{ height: `${Math.max((v / peakViews) * 100, v > 0 ? 4 : 1)}%` }}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs text-white/35">
          <span>{days[0]}</span>
          <span>{days[days.length - 1]}</span>
        </div>
      </section>

      <section className="glass mt-6 p-6 sm:p-8">
        <h2 className="font-display text-3xl">Link clicks</h2>
        {links.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">Add links on your dashboard to see clicks here.</p>
        ) : (
          <ul className="mt-6 space-y-5">
            {links.map((l) => (
              <li key={l.id}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate font-medium">
                    {l.label} <span className="font-mono text-xs text-white/35">{l.host}</span>
                  </span>
                  <span className="shrink-0 font-mono text-white/70">{l.clicks.toLocaleString('en-US')}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#9be7ff]" style={{ width: `${(l.clicks / topClicks) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {links.length > 0 && totalClicks === 0 && (
          <p className="mt-6 text-sm text-white/45">No clicks in the last 30 days yet.</p>
        )}
      </section>
    </main>
  );
}
