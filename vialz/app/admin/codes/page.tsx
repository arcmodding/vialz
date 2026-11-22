import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { revokeCode } from '@/app/actions';
import type { CodeRow } from '@/lib/types';
import CodeGenerator from '@/components/CodeGenerator';

export const metadata = { title: 'Premium codes' };

function statusOf(c: CodeRow, now: number): string {
  if (c.revoked) return 'Revoked';
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return 'Expired';
  if (c.uses >= c.max_uses) return 'Used up';
  return 'Active';
}

export default async function CodesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.rpc('list_premium_codes');
  const codes = (data ?? []) as CodeRow[];
  const now = Date.now();

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-12 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl">Premium codes</h1>
        <nav className="flex gap-2" aria-label="Admin">
          <Link href="/admin" className="btn-ghost !py-2">Users</Link>
          <Link href="/admin/codes" className="btn-primary !py-2">Premium codes</Link>
        </nav>
      </div>

      <CodeGenerator />

      <div className="glass overflow-x-auto">
        {codes.length === 0 ? (
          <p className="p-6 text-sm text-white/45">No codes yet. Generate one above and send it to the user.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/[0.08] text-white/45">
              <tr>
                <th className="px-5 py-3 font-normal">Label</th>
                <th className="py-3 font-normal">Duration</th>
                <th className="py-3 font-normal">Uses</th>
                <th className="py-3 font-normal">Expires</th>
                <th className="py-3 font-normal">Status</th>
                <th className="px-5 py-3 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c, now);
                return (
                  <tr key={c.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-5 py-3">{c.label}</td>
                    <td className="py-3 text-white/60">{c.duration_days ? `${c.duration_days} days` : 'Lifetime'}</td>
                    <td className="py-3 font-mono text-white/70">{c.uses} / {c.max_uses}</td>
                    <td className="py-3 text-white/50">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-US') : 'Never'}</td>
                    <td className="py-3 text-white/70">{status}</td>
                    <td className="px-5 py-3 text-right">
                      {status === 'Active' && (
                        <form action={revokeCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="btn-ghost !px-3 !py-1.5 text-xs">Revoke</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
