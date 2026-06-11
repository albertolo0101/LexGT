-- 0012_tier_enforcement.sql
-- E3 fix: tier rules (yellow-only / no notes for free, cases/case_annotations
-- Pro-only) were enforced only in Server Actions, which the anon key bypasses
-- via direct PostgREST calls. This migration makes RLS the source of truth.

-- ============================================================
-- TIER HELPERS
-- security definer so the function can read user_profiles
-- regardless of the caller's RLS context (it is its own subject).
-- ============================================================
create or replace function public.current_user_tier()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 'anonymous'
    when exists (
      select 1 from user_profiles
      where user_id = auth.uid()
        and tier = 'pro'
        and (tier_expires_at is null or tier_expires_at > now())
    ) then 'pro'
    else 'free'
  end
$$;

create or replace function public.is_pro()
returns boolean
language sql
stable
as $$
  select public.current_user_tier() = 'pro'
$$;

-- ============================================================
-- ANNOTATIONS — free tier limited to a single yellow highlight,
-- no notes. Pro can use any color and attach notes.
-- ============================================================
drop policy if exists "owner insert annotations" on annotations;
drop policy if exists "owner update annotations" on annotations;

create policy "owner insert annotations"
  on annotations for insert
  with check (
    auth.uid() = user_id
    and (public.is_pro() or (color = 'yellow' and note is null))
  );

create policy "owner update annotations"
  on annotations for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (public.is_pro() or (color = 'yellow' and note is null))
  );

-- ============================================================
-- CASES — Pro only. Expired-pro/free users keep read access to
-- their existing cases (read-only history) but cannot create or
-- modify new ones.
-- ============================================================
drop policy if exists "cases: owner all" on cases;

create policy "cases: owner select"
  on cases for select
  using (auth.uid() = user_id);

create policy "cases: owner delete"
  on cases for delete
  using (auth.uid() = user_id);

create policy "cases: owner insert"
  on cases for insert
  with check (auth.uid() = user_id and public.is_pro());

create policy "cases: owner update"
  on cases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.is_pro());

-- ============================================================
-- CASE_ANNOTATIONS — same Pro-only rule for writes; reads stay
-- ownership-only so expired-pro users can still see old cases.
-- ============================================================
drop policy if exists "case_annotations: case owner all" on case_annotations;

create policy "case_annotations: case owner select"
  on case_annotations for select
  using (
    exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  );

create policy "case_annotations: case owner delete"
  on case_annotations for delete
  using (
    exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  );

create policy "case_annotations: case owner insert"
  on case_annotations for insert
  with check (
    public.is_pro()
    and exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  );

create policy "case_annotations: case owner update"
  on case_annotations for update
  using (
    exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    public.is_pro()
    and exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  );
