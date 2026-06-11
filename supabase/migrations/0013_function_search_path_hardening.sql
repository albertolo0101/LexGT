-- 0013_function_search_path_hardening.sql
-- The Supabase security advisor flags is_admin/is_pro/prevent_tier_self_update
-- (touched/added in 0010-0012) for a mutable search_path. Pin it explicitly
-- to prevent search_path hijacking via a malicious schema earlier in the path.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
$$;

create or replace function public.is_pro()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.current_user_tier() = 'pro'
$$;

create or replace function public.prevent_tier_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.tier is distinct from old.tier
      or new.tier_expires_at is distinct from old.tier_expires_at
      or new.tier_source is distinct from old.tier_source)
     and not public.is_admin() then
    raise exception 'Not authorized to change tier fields';
  end if;
  return new;
end;
$$;
