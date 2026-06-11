-- 0010_admin_app_metadata.sql
-- E1 fix: user_metadata is self-writable via supabase.auth.updateUser(),
-- so any authenticated user could grant themselves role: 'admin'.
-- Admin role now lives in app_metadata, which only a service-role key
-- (or the Supabase dashboard) can write. The admin account's
-- raw_app_meta_data.role = 'admin' was set manually before this migration.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
$$;

create or replace function public.admin_find_user_by_email(email_input text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') != 'admin' then
    raise exception 'Not authorized';
  end if;
  select id into v_user_id
  from auth.users
  where email = email_input
  limit 1;
  return v_user_id;
end;
$$;
