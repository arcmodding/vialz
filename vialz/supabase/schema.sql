-- vialz.lol schema. Run once in the Supabase SQL Editor.

-- ─── Tables ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 40),
  bio text check (char_length(bio) <= 280),
  avatar_url text check (avatar_url ~ '^https://'),
  banner_url text check (banner_url ~ '^https://'),
  music_url text check (music_url ~ '^https://'),
  accent text not null default '#9be7ff' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  background text not null default 'midnight' check (background in ('midnight', 'ember', 'dusk', 'void')),
  font text not null default 'sans' check (font in ('sans', 'serif', 'mono')),
  effect text not null default 'grain' check (effect in ('none', 'grain', 'glow')),
  views bigint not null default 0,
  banned boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 30),
  url text not null check (url ~ '^https://'),
  position int not null default 0
);
create index links_profile_idx on public.links (profile_id, position);

-- ─── Row level security ────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.links enable row level security;

-- Profiles are public. Users may update only their own row.
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Owners update their profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Users can edit presentation fields only. Role, ban and view fields stay server-controlled.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, avatar_url, banner_url, music_url, accent, background, font, effect, updated_at)
  on public.profiles to authenticated;

create policy "Links are public" on public.links for select using (true);
create policy "Owners manage their links" on public.links for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ─── Functions ─────────────────────────────────────────────────────────────
-- Creates a profile whenever an account is created. Mirror the reserved list in lib/config.ts.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uname text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
begin
  if uname in ('admin', 'api', 'auth', 'dashboard', 'login', 'signup', 'settings', 'support', 'vialz', 'root') then
    raise exception 'Reserved username';
  end if;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(candidate));
$$;

-- Counts a visit on a public, non-suspended profile.
create or replace function public.increment_views(uname text) returns void
language sql security definer set search_path = public as $$
  update public.profiles set views = views + 1
  where username = lower(uname) and banned = false;
$$;

-- Replaces the signed-in user's links atomically. RLS still applies (security invoker).
create or replace function public.replace_links(items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 10 then
    raise exception 'Invalid links';
  end if;
  delete from public.links where profile_id = auth.uid();
  insert into public.links (profile_id, label, url, position)
  select auth.uid(), x->>'label', x->>'url', (ord - 1)::int
  from jsonb_array_elements(items) with ordinality as t(x, ord);
end;
$$;

create or replace function public.current_user_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Admin-only moderation. Admins cannot suspend other admins.
create or replace function public.admin_set_banned(target uuid, value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.profiles set banned = value where id = target and is_admin = false;
end;
$$;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.increment_views(text) to anon, authenticated;
grant execute on function public.replace_links(jsonb) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

-- ─── Bootstrap your admin account (run after you sign up) ─────────────────
-- update public.profiles set is_admin = true where username = 'yourname';
