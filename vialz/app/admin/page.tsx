import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { grantBadge, revokeBadge, setBanned } from '@/app/actions';
import type { BadgeOption, UserRow } from '@/lib/types';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const { supabase, role } = await requireAdmin();

  const [usersRes, countRes, badgesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, views, banned, is_admin, role, created_at, profile_badges(badge_slug)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('badges').select('slug, label').order('sort'),
  ]);

  const users = (usersRes.data ?? []) as UserRow[];
  // Only the owner can grant the owner badge. The database enforces this too.
  const badgeOptions = ((badgesRes.data ?? []) as BadgeOption[]).filter((b) => role === 'owner' || b.slug !== 'owner');

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl">Users</h1>
          <p className="mt-2 text-sm text-white/50">{(countRes.count ?? 0).toLocaleString('en-US')} accounts</p>
        </div>
        <nav className="flex gap-2" aria-label="Admin">
          <Link href="/admin" className="btn-primary !py-2">Users</Link>
          <Link href="/admin/codes" className="btn-ghost !py-2">Premium codes</Link>
        </nav>
      </div>

      <div className="glass mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/[0.08] text-white/45">
            <tr>
              <th className="px-5 py-3 font-normal">User</th>
              <th className="py-3 font-normal">Badges</th>
              <th className="py-3 font-normal">Status</th>
              <th className="px-5 py-3 text-right font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.05] align-top last:border-0">
                <td className="px-5 py-4">
                  <a href={`/${u.username}`} className="hover:underline">@{u.username}</a>
                  {u.role !== 'user' && <span className="ml-2 font-mono text-xs text-[#9be7ff]">{u.role}</span>}
                  <p className="mt-1 font-mono text-xs text-white/35">{Number(u.views).toLocaleString('en-US')} views</p>
                </td>
                <td className="py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {u.profile_badges.map((pb) => (
                      <form key={pb.badge_slug} action={revokeBadge}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="slug" value={pb.badge_slug} />
                        <button
                          title="Remove badge"
                          className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/70 transition hover:border-red-300/50 hover:text-red-200"
                        >
                          {pb.badge_slug} ×
                        </button>
                      </form>
                    ))}
                  </div>
                  <form action={grantBadge} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="slug" required defaultValue="" className="field !py-1.5 text-xs" aria-label="Badge to add">
                      <option value="" disabled>Add badge</option>
                      {badgeOptions.map((b) => (
                        <option key={b.slug} value={b.slug}>{b.label}</option>
                      ))}
                    </select>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs">Add</button>
                  </form>
                </td>
                <td className="py-4">
                  <span className={u.banned ? 'text-red-300' : 'text-white/70'}>{u.banned ? 'Suspended' : 'Active'}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  {!u.is_admin && (
                    <form action={setBanned}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="banned" value={String(!u.banned)} />
                      <button className="btn-ghost !px-3 !py-1.5 text-xs">{u.banned ? 'Restore' : 'Suspend'}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
