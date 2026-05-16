-- 0003_reform_status.sql

-- Helper function used by RLS policies below.
-- Defined in public schema (auth schema is restricted in Supabase SQL Editor).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select (auth.jwt()->'user_metadata'->>'role') = 'admin'
$$;

-- ============================================================
-- LAW REFORMS — status column + nullable published_at
-- ============================================================
alter table law_reforms
  add column status text not null default 'draft';

-- Existing rows were already published
update law_reforms set status = 'published';

-- Allow published_at to be null while a reform is in draft
alter table law_reforms
  alter column published_at drop not null;

-- Admins can insert and update (public select already exists from 0002)
create policy "admin insert law_reforms"
  on law_reforms for insert
  with check (public.is_admin());

create policy "admin update law_reforms"
  on law_reforms for update
  using (public.is_admin());

-- ============================================================
-- REFORM DRAFT ARTICLES
-- Stores the new article text before a reform is published.
-- ============================================================
create table reform_draft_articles (
  id          uuid primary key default gen_random_uuid(),
  reform_id   uuid not null references law_reforms(id) on delete cascade,
  article_id  uuid not null references articles(id),
  new_text    text not null,
  created_at  timestamptz default now()
);

alter table reform_draft_articles enable row level security;

create policy "admin select reform_draft_articles"
  on reform_draft_articles for select
  using (public.is_admin());

create policy "admin insert reform_draft_articles"
  on reform_draft_articles for insert
  with check (public.is_admin());

create policy "admin update reform_draft_articles"
  on reform_draft_articles for update
  using (public.is_admin());

create policy "admin delete reform_draft_articles"
  on reform_draft_articles for delete
  using (public.is_admin());

create index on reform_draft_articles (reform_id);
