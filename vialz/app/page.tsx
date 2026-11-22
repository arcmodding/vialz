import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type Popular = { username: string; display_name: string | null; bio: string | null; avatar_url: string | null };

export default async function HomePage() {
  const supabase = await createClient();
  const { data: popular } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_url')
    .eq('banned', false)
    .order('views', { ascending: false })
    .limit(6);

  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="grid min-h-[78vh] content-center py-24 animate-rise">
        <h1 className="max-w-4xl font-display text-6xl leading-[0.95] tracking-tight sm:text-8xl">
          One page for everything you are.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/55">
          Build a profile at vialz.lol with your links, music and look. Set it up once and share it everywhere.
        </p>

        <form action="/signup" method="get" className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
          <label className="glass flex flex-1 items-center px-4">
            <span className="text-white/35">vialz.lol/</span>
            <input
              name="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              placeholder="yourname"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-4 pl-1 text-white outline-none placeholder:text-white/25"
            />
          </label>
          <button className="btn-primary">Claim your link</button>
        </form>
      </section>

      {popular && popular.length > 0 && (
        <section className="pb-28">
          <h2 className="mb-6 font-display text-3xl">Popular profiles</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(popular as Popular[]).map((p) => (
              <li key={p.username}>
                <Link href={`/${p.username}`} className="glass block p-5 transition hover:border-white/20 hover:bg-white/[0.05]">
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 font-display text-lg">
                        {p.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.display_name ?? p.username}</p>
                      <p className="truncate text-sm text-white/40">vialz.lol/{p.username}</p>
                    </div>
                  </div>
                  {p.bio && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/55">{p.bio}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
