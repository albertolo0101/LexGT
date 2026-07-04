-- 0019_extractor_content_reconciliation.sql
-- Reconciles the extractor's raw-DDL prod changes (history entry
-- `001_extractor_columns`, 2026-06-13) into a tracked, idempotent migration,
-- and closes three gaps: (1) law_fragments RLS enabled but no policies;
-- (2) disposicion_kind had no CHECK; (3) FK lacked ON DELETE CASCADE.

-- articles: amendment_note + disposicion_kind (+ CHECK)
alter table public.articles add column if not exists amendment_note text;
alter table public.articles add column if not exists disposicion_kind text;
alter table public.articles drop constraint if exists articles_disposicion_kind_check;
alter table public.articles add constraint articles_disposicion_kind_check
  check (disposicion_kind is null
         or disposicion_kind in ('transitoria','derogatoria','final'));

-- laws: promulgation JSONB
alter table public.laws add column if not exists promulgation jsonb;

-- law_fragments (Fase 5). uuid5 PK shape from the extractor; adds ON DELETE CASCADE.
create table if not exists public.law_fragments (
  id            uuid primary key,
  law_id        uuid not null references public.laws(id) on delete cascade,
  raw_text      text not null,
  context_hint  text,
  fragment_type text,
  position      integer not null,
  reviewed      boolean not null default false
);

-- If it pre-existed with a non-cascading FK, replace it.
do $$
declare fk_name text;
begin
  select conname into fk_name from pg_constraint
  where conrelid = 'public.law_fragments'::regclass
    and contype = 'f' and confdeltype <> 'c';
  if fk_name is not null then
    execute format('alter table public.law_fragments drop constraint %I', fk_name);
    alter table public.law_fragments add constraint law_fragments_law_id_fkey
      foreign key (law_id) references public.laws(id) on delete cascade;
  end if;
end $$;

create index if not exists law_fragments_law_id_idx on public.law_fragments(law_id);

-- RLS: curator content, admin-only (mirrors reform_draft_articles).
-- Extractor writes via the session pooler (RLS-bypassing), so loads are unaffected.
alter table public.law_fragments enable row level security;
drop policy if exists law_fragments_admin_all on public.law_fragments;
create policy law_fragments_admin_all on public.law_fragments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.law_fragments to authenticated;
grant select on public.law_fragments to anon;
