import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setBanned } from '@/app/actions';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  const [{ data: users }, { count }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, views, banned, is_admin, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl">Users</h1>
        <p className="text-sm text-white/50">{(count ?? 0).toLocaleString('en-US')} total accounts</p>
      </div>

      <div className="glass mt-8 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/[0.08] text-white/45">
            <tr>
              <th className="px-5 py-3 font-normal">Username</th>
              <th className="py-3 font-normal">Views</th>
              <th className="py-3 font-normal">Joined</th>
              <th className="py-3 font-normal">Status</th>
              <th className="px-5 py-3 text-right font-normal">Action</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.05] last:border-0">
                <td className="px-5 py-3">
                  <a href={`/${u.username}`} className="hover:underline">@{u.username}</a>
                  {u.is_admin && <span className="ml-2 font-mono text-xs text-[#9be7ff]">admin</span>}
                </td>
                <td className="py-3 font-mono text-white/70">{Number(u.views).toLocaleString('en-US')}</td>
                <td className="py-3 text-white/50">{new Date(u.created_at).toLocaleDateString('en-US')}</td>
                <td className="py-3">
                  <span className={u.banned ? 'text-red-300' : 'text-white/70'}>{u.banned ? 'Suspended' : 'Active'}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  {!u.is_admin && (
                    <form action={setBanned} className="inline">
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
