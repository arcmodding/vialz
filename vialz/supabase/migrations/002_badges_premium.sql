-- 002: roles, badges, premium codes, and analytics.
-- Run after schema.sql in the Supabase SQL Editor. Safe on an existing database.

-- ─── Roles ─────────────────────────────────────────────────────────────────
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin', 'owner'));
update public.profiles set role = 'admin' where is_admin;
alter table public.profiles drop column is_admin;
-- Derived from role, so code that reads is_admin keeps working.
alter table public.profiles
  add column is_admin boolean generated always as (role in ('admin', 'owner')) stored;

-- ─── Premium ───────────────────────────────────────────────────────────────
-- null = free. A past date = expired. '9999-12-31' = lifetime.
alter table public.profiles add column premium_until timestamptz;

-- ─── Tables ────────────────────────────────────────────────────────────────
create table public.badges (
  slug text primary key check (slug ~ '^[a-z_]{2,30}$'),
  label text not null,
  description text not null,
  icon text not null,
  tone text not null check (tone in ('blue', 'amber', 'gold', 'violet', 'green', 'rose')),
  sort int not null default 0
);

create table public.profile_badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_slug text not null references public.badges (slug) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (profile_id, badge_slug)
);

create table public.premium_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null check (char_length(label) between 1 and 60),
  duration_days int check (duration_days is null or duration_days > 0),
  max_uses int not null default 1 check (max_uses between 1 and 1000),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.premium_redemptions (
  code_id uuid not null references public.premium_codes (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, profile_id)
);

create table public.profile_daily (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  views int not null default 0,
  primary key (profile_id, day)
);

create table public.link_daily (
  link_id uuid not null references public.links (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  clicks int not null default 0,
  primary key (link_id, day)
);
create index link_daily_profile_idx on public.link_daily (profile_id);

-- ─── Premium check (used by RLS and triggers) ─────────────────────────────
create or replace function public.is_premium(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select premium_until > now() from public.profiles where id = uid), false);
$$;

-- ─── Row level security ────────────────────────────────────────────────────
alter table public.badges enable row level security;
alter table public.profile_badges enable row level security;
alter table public.premium_codes enable row level security;
alter table public.premium_redemptions enable row level security;
alter table public.profile_daily enable row level security;
alter table public.link_daily enable row level security;

create policy "Badges are public" on public.badges for select using (true);
create policy "Profile badges are public" on public.profile_badges for select using (true);

-- Analytics are visible only to the owner, and only while they have Premium.
create policy "Premium owners read daily views" on public.profile_daily for select to authenticated
  using (profile_id = auth.uid() and public.is_premium(auth.uid()));
create policy "Premium owners read link clicks" on public.link_daily for select to authenticated
  using (profile_id = auth.uid() and public.is_premium(auth.uid()));

-- premium_codes and premium_redemptions have no policies. Only security definer functions touch them.
revoke all on public.badges, public.profile_badges, public.premium_codes, public.premium_redemptions,
  public.profile_daily, public.link_daily from anon, authenticated;
grant select on public.badges, public.profile_badges to anon, authenticated;
grant select on public.profile_daily, public.link_daily to authenticated;

-- ─── Views and clicks ──────────────────────────────────────────────────────
drop function if exists public.increment_views(text);
create function public.increment_views(uname text) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  update public.profiles set views = views + 1
  where username = lower(uname) and banned = false
  returning id into pid;

  if pid is not null then
    insert into public.profile_daily (profile_id, day, views) values (pid, current_date, 1)
    on conflict (profile_id, day) do update set views = profile_daily.views + 1;
  end if;
end;
$$;

-- Counts a click and returns the destination URL, or null if the link is unavailable.
create or replace function public.record_link_click(p_link uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  target record;
begin
  select l.id, l.profile_id, l.url into target
  from public.links l
  join public.profiles p on p.id = l.profile_id
  where l.id = p_link and p.banned = false;
  if not found then return null; end if;

  insert into public.link_daily (link_id, profile_id, day, clicks)
  values (target.id, target.profile_id, current_date, 1)
  on conflict (link_id, day) do update set clicks = link_daily.clicks + 1;

  return target.url;
end;
$$;

-- Saves links. Keeps existing rows so click history survives edits. Free: 10 links. Premium: 30.
create or replace function public.replace_links(items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  max_links int := case when public.is_premium(auth.uid()) then 30 else 10 end;
  rec record;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > max_links then
    raise exception 'Your plan allows up to % links', max_links;
  end if;

  delete from public.links l
  where l.profile_id = auth.uid()
    and not exists (
      select 1 from jsonb_array_elements(items) as e(v)
      where e.v->>'id' = l.id::text
    );

  for rec in select e.v, e.ord from jsonb_array_elements(items) with ordinality as e(v, ord) loop
    if rec.v->>'id' is not null and exists (
      select 1 from public.links where id = (rec.v->>'id')::uuid and profile_id = auth.uid()
    ) then
      update public.links
        set label = rec.v->>'label', url = rec.v->>'url', position = rec.ord::int - 1
        where id = (rec.v->>'id')::uuid;
    else
      insert into public.links (profile_id, label, url, position)
      values (auth.uid(), rec.v->>'label', rec.v->>'url', rec.ord::int - 1);
    end if;
  end loop;
end;
$$;

-- ─── Premium codes ─────────────────────────────────────────────────────────
-- Codes are stored as SHA-256 hashes. The plain code is shown once, at creation.
create or replace function public.create_premium_code(
  p_hash text, p_label text, p_duration_days int, p_max_uses int, p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  insert into public.premium_codes (code_hash, label, duration_days, max_uses, expires_at, created_by)
  values (p_hash, p_label, p_duration_days, p_max_uses, p_expires_at, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.list_premium_codes()
returns table (
  id uuid, label text, duration_days int, max_uses int, uses int,
  expires_at timestamptz, revoked boolean, created_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  return query
    select c.id, c.label, c.duration_days, c.max_uses, c.uses, c.expires_at, c.revoked, c.created_at
    from public.premium_codes c
    order by c.created_at desc
    limit 200;
end;
$$;

create or replace function public.revoke_premium_code(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  update public.premium_codes set revoked = true where id = p_id;
end;
$$;

-- Redeems a code for the signed-in user. Stacks time onto any existing Premium.
create or replace function public.redeem_premium_code(p_hash text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  c public.premium_codes%rowtype;
  uid uuid := auth.uid();
  base timestamptz;
  until_at timestamptz;
begin
  if uid is null then raise exception 'Log in to redeem a code'; end if;

  select * into c from public.premium_codes where code_hash = p_hash for update;
  if not found or c.revoked then raise exception 'That code is not valid'; end if;
  if c.expires_at is not null and c.expires_at < now() then raise exception 'That code has expired'; end if;
  if c.uses >= c.max_uses then raise exception 'That code has already been used'; end if;
  if exists (select 1 from public.premium_redemptions where code_id = c.id and profile_id = uid) then
    raise exception 'You already redeemed this code';
  end if;

  select premium_until into base from public.profiles where id = uid;
  base := greatest(coalesce(base, now()), now());
  until_at := case
    when c.duration_days is null then '9999-12-31 00:00:00+00'::timestamptz
    else base + make_interval(days => c.duration_days)
  end;

  update public.premium_codes set uses = uses + 1 where id = c.id;
  insert into public.premium_redemptions (code_id, profile_id) values (c.id, uid);
  update public.profiles set premium_until = until_at where id = uid;
  return until_at;
end;
$$;

-- ─── Badges ────────────────────────────────────────────────────────────────
create or replace function public.grant_badge(p_target uuid, p_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  if p_slug = 'owner' and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only the owner can grant the owner badge';
  end if;
  insert into public.profile_badges (profile_id, badge_slug) values (p_target, p_slug)
  on conflict do nothing;
end;
$$;

create or replace function public.revoke_badge(p_target uuid, p_slug text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then raise exception 'Forbidden'; end if;
  if p_slug = 'owner' and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only the owner can remove the owner badge';
  end if;
  delete from public.profile_badges where profile_id = p_target and badge_slug = p_slug;
end;
$$;

-- ─── Premium-only effects, enforced in the database ───────────────────────
create or replace function public.enforce_premium_effects() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.effect = 'glow' and old.effect is distinct from 'glow' and not public.is_premium(new.id) then
    raise exception 'Animated glow needs Premium';
  end if;
  return new;
end;
$$;

create trigger enforce_premium_effects
  before update on public.profiles
  for each row execute function public.enforce_premium_effects();

-- ─── Grants ────────────────────────────────────────────────────────────────
revoke all on function public.is_premium(uuid) from public, anon;
grant execute on function public.is_premium(uuid) to authenticated;

grant execute on function public.increment_views(text) to anon, authenticated;
grant execute on function public.record_link_click(uuid) to anon, authenticated;

revoke all on function public.redeem_premium_code(text) from public, anon;
grant execute on function public.redeem_premium_code(text) to authenticated;

revoke all on function public.create_premium_code(text, text, int, int, timestamptz) from public, anon;
grant execute on function public.create_premium_code(text, text, int, int, timestamptz) to authenticated;

revoke all on function public.list_premium_codes() from public, anon;
grant execute on function public.list_premium_codes() to authenticated;

revoke all on function public.revoke_premium_code(uuid) from public, anon;
grant execute on function public.revoke_premium_code(uuid) to authenticated;

revoke all on function public.grant_badge(uuid, text) from public, anon;
grant execute on function public.grant_badge(uuid, text) to authenticated;

revoke all on function public.revoke_badge(uuid, text) from public, anon;
grant execute on function public.revoke_badge(uuid, text) to authenticated;

-- ─── Seed badges ───────────────────────────────────────────────────────────
insert into public.badges (slug, label, description, icon, tone, sort) values
  ('owner', 'Owner', 'Runs vialz.lol', 'crown', 'gold', 0),
  ('staff', 'Staff', 'Part of the vialz.lol team', 'shield', 'violet', 1),
  ('verified', 'Verified', 'Identity or notability confirmed by vialz.lol', 'check', 'blue', 2),
  ('developer', 'Developer', 'Builds on vialz.lol', 'code', 'green', 3),
  ('early_supporter', 'Early supporter', 'Joined during the early days', 'star', 'rose', 4)
on conflict (slug) do nothing;

-- ─── Make yourself the owner (run once, after you sign up) ────────────────
-- update public.profiles set role = 'owner' where username = 'yourname';
-- insert into public.profile_badges (profile_id, badge_slug)
--   select id, 'owner' from public.profiles where username = 'yourname' on conflict do nothing;
