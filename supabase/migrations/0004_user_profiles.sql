-- 0004_user_profiles.sql

-- ============================================================
-- USER PROFILES
-- One row per auth user. Created automatically by trigger.
-- ============================================================
create table user_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  tier            text not null default 'free',
  tier_expires_at timestamptz,
  tier_source     text not null default 'manual',
  created_at      timestamptz default now()
);

alter table user_profiles enable row level security;

-- Owner can read and update their own profile
create policy "owner select user_profiles"
  on user_profiles for select
  using (auth.uid() = user_id);

create policy "owner update user_profiles"
  on user_profiles for update
  using (auth.uid() = user_id);

-- Admins can insert and update any profile (for setUserTier)
create policy "admin insert user_profiles"
  on user_profiles for insert
  with check (public.is_admin());

create policy "admin update user_profiles"
  on user_profiles for update
  using (public.is_admin());

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- Must be security definer to bypass RLS on insert.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id, tier, tier_source)
  values (new.id, 'free', 'manual');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RPC: find a user's UUID by email (admin only)
-- Security definer allows access to auth.users without
-- exposing it to the anon role.
-- ============================================================
create or replace function public.admin_find_user_by_email(email_input text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if (auth.jwt()->'user_metadata'->>'role') != 'admin' then
    raise exception 'Not authorized';
  end if;
  select id into v_user_id
  from auth.users
  where email = email_input
  limit 1;
  return v_user_id;
end;
$$;
