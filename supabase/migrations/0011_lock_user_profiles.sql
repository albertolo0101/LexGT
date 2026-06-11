-- 0011_lock_user_profiles.sql
-- E2 fix: the owner UPDATE policy on user_profiles had no column
-- restriction, so a free user could PATCH their own row to set
-- tier = 'pro'. Users have nothing legitimate to update on this table
-- today (profile preferences would live in a separate table), so the
-- owner UPDATE policy is dropped entirely. Owner SELECT and the admin
-- policies (insert/update via is_admin(), used by setUserTier) remain.

drop policy if exists "owner update user_profiles" on user_profiles;

-- Defense in depth: even if a future owner UPDATE policy is added
-- without thinking, this trigger blocks any change to the tier
-- columns unless the caller is an admin.
create or replace function public.prevent_tier_self_update()
returns trigger
language plpgsql
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

drop trigger if exists prevent_tier_self_update on user_profiles;

create trigger prevent_tier_self_update
  before update on user_profiles
  for each row execute procedure public.prevent_tier_self_update();
