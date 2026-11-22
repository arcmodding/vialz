import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { signOut } from './actions';
import './globals.css';

const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const body = Geist({ subsets: ['latin'], variable: '--font-body' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'vialz.lol', template: '%s · vialz.lol' },
  description: 'One page for everything you are.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    isAdmin = Boolean(data?.is_admin);
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-sans">
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07080b]/70 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Main">
            <Link href="/" className="font-display text-2xl tracking-tight">
              vialz<span className="text-white/40">.lol</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              {user ? (
                <>
                  {isAdmin && <Link href="/admin" className="btn-ghost !py-2">Admin</Link>}
                  <Link href="/dashboard" className="btn-ghost !py-2">Dashboard</Link>
                  <form action={signOut}>
                    <button className="btn-ghost !py-2">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-3 py-2 text-white/70 transition hover:text-white">Log in</Link>
                  <Link href="/signup" className="btn-primary !py-2">Get started</Link>
                </>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
