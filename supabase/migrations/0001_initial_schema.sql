-- 0001_initial_schema.sql

-- ============================================================
-- LAWS
-- ============================================================
create table laws (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,        -- e.g. 'codigo-civil'
  short_name  text not null,               -- e.g. 'Código Civil'
  full_name   text not null,
  decree      text,                        -- e.g. 'Decreto Ley 106'
  enacted_on  date,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- SECTIONS  (flexible hierarchy)
-- Every node in the tree — book, title, chapter, or none —
-- is a row here. Articles are NOT stored here, they live in
-- their own table. A section's parent is another section or
-- null (meaning it hangs directly off the law).
-- ============================================================
create table sections (
  id          uuid primary key default gen_random_uuid(),
  law_id      uuid not null references laws(id) on delete cascade,
  parent_id   uuid references sections(id) on delete cascade,
  kind        text not null check (kind in ('libro','titulo','capitulo','seccion','parte')),
  number      text,                        -- e.g. 'I', '1', 'Único'
  heading     text not null,
  position    integer not null,            -- order within parent
  created_at  timestamptz default now()
);

-- ============================================================
-- ARTICLES
-- ============================================================
create table articles (
  id          uuid primary key default gen_random_uuid(),
  law_id      uuid not null references laws(id) on delete cascade,
  section_id  uuid references sections(id) on delete set null, -- nullable = hangs directly off law
  number      text not null,               -- e.g. '1', '1 Bis'
  heading     text,                        -- optional title of the article
  position    integer not null,
  is_current  boolean default true,
  version     integer not null default 1,
  superseded_by uuid references articles(id),
  effective_on  date,
  created_at  timestamptz default now()
);

-- ============================================================
-- PARAGRAPHS
-- The article text, split into numbered paragraphs.
-- This is what annotations point to.
-- ============================================================
create table paragraphs (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references articles(id) on delete cascade,
  position    integer not null,            -- order within article
  text        text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- ANNOTATIONS
-- A highlight (free tier) or highlight + note (pro tier).
-- user_id is nullable in the DB but RLS will require auth to insert.
-- char_start / char_end are offsets within the paragraph text.
-- ============================================================
create table annotations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  paragraph_id  uuid not null references paragraphs(id) on delete cascade,
  article_id    uuid not null references articles(id) on delete cascade,
  color         text not null default 'yellow' check (color in ('yellow','green','blue','pink')),
  char_start    integer not null,
  char_end      integer not null,
  note          text,                      -- null = free tier highlight only
  is_pinned_to_old_version boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table laws       enable row level security;
alter table sections   enable row level security;
alter table articles   enable row level security;
alter table paragraphs enable row level security;
alter table annotations enable row level security;

-- Laws, sections, articles, paragraphs: anyone can read
create policy "public read laws"       on laws       for select using (true);
create policy "public read sections"   on sections   for select using (true);
create policy "public read articles"   on articles   for select using (true);
create policy "public read paragraphs" on paragraphs for select using (true);

-- Annotations: only the owner can read, insert, update, delete
create policy "owner read annotations"   on annotations for select using (auth.uid() = user_id);
create policy "owner insert annotations" on annotations for insert with check (auth.uid() = user_id);
create policy "owner update annotations" on annotations for update using (auth.uid() = user_id);
create policy "owner delete annotations" on annotations for delete using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index on sections   (law_id);
create index on sections   (parent_id);
create index on articles   (law_id);
create index on articles   (section_id);
create index on articles   (is_current);
create index on paragraphs (article_id);
create index on annotations (user_id);
create index on annotations (paragraph_id);
