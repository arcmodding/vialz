import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { BACKGROUND_CLASS, FONT_VAR, GRAIN_IMAGE } from '@/lib/config';
import MusicPlayer from '@/components/MusicPlayer';

type Params = { params: Promise<{ username: string }> };

async function loadProfile(username: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url, banner_url, music_url, accent, background, font, effect, views, banned, links(label, url, position)')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  return { supabase, profile: data && !data.banned ? data : null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const { profile } = await loadProfile(username);
  if (!profile) return { title: 'Not found' };
  return {
    title: profile.display_name ?? profile.username,
    description: profile.bio ?? `@${profile.username} on vialz.lol`,
  };
}

export default async function PublicProfile({ params }: Params) {
  const { username } = await params;
  const { supabase, profile: p } = await loadProfile(username);
  if (!p) notFound();

  await supabase.rpc('increment_views', { uname: p.username });

  const links = [...p.links].sort((a, b) => a.position - b.position);
  const style = { '--accent': p.accent, fontFamily: FONT_VAR[p.font as keyof typeof FONT_VAR] } as CSSProperties;

  return (
    <div className={`relative min-h-screen overflow-hidden ${BACKGROUND_CLASS[p.background as keyof typeof BACKGROUND_CLASS]}`} style={style}>
      {p.effect === 'glow' && (
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-[-18rem] h-[44rem] w-[44rem] -translate-x-1/2 animate-drift rounded-full opacity-[0.14] blur-3xl"
          style={{ background: 'var(--accent)' }}
        />
      )}
      {p.effect === 'grain' && (
        <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-screen" style={{ backgroundImage: GRAIN_IMAGE }} />
      )}

      <main className="relative mx-auto max-w-xl px-4 pb-20 pt-6 sm:pt-12 animate-rise">
        <div className="relative h-44 overflow-hidden rounded-b-3xl bg-white/[0.04] sm:h-56 sm:rounded-3xl">
          {p.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.banner_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full opacity-30" style={{ background: 'linear-gradient(120deg, var(--accent), transparent 70%)' }} />
          )}
        </div>

        <div className="-mt-12 flex items-end justify-between px-5">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-[#07080b]" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-white/10 text-4xl ring-4 ring-[#07080b]">
              {p.username[0].toUpperCase()}
            </div>
          )}
          <span className="pb-2 font-mono text-xs text-white/40">{(p.views + 1).toLocaleString('en-US')} views</span>
        </div>

        <div className="mt-5 px-1">
          <h1 className="text-5xl leading-tight tracking-tight">{p.display_name ?? p.username}</h1>
          <p className="mt-1 text-sm text-white/45">@{p.username}</p>
          {p.bio && <p className="mt-4 whitespace-pre-line leading-relaxed text-white/75">{p.bio}</p>}
        </div>

        {links.length > 0 && (
          <ul className="mt-8 space-y-3">
            {links.map((link) => (
              <li key={`${link.position}-${link.url}`}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="glass group flex items-center justify-between gap-4 px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <span className="truncate font-medium">{link.label}</span>
                  <span className="shrink-0 truncate font-mono text-xs text-white/35">
                    {link.url.replace(/^https:\/\//, '').split('/')[0]}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {p.music_url && (
          <div className="mt-8">
            <MusicPlayer src={p.music_url} />
          </div>
        )}
      </main>
    </div>
  );
}
