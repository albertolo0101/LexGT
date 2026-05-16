-- 0002_versioning.sql

-- ============================================================
-- ARTICLES — add versioning columns
-- ============================================================
alter table articles
  add column version_number      int         not null default 1,
  add column superseded_at       timestamptz,
  add column previous_version_id uuid        references articles(id),
  add column reform_id           uuid;       -- FK constraint added below

-- ============================================================
-- LAW REFORMS
-- ============================================================
create table law_reforms (
  id           uuid        primary key default gen_random_uuid(),
  law_id       uuid        not null references laws(id) on delete cascade,
  title        text        not null,
  description  text,
  published_at timestamptz not null,
  created_at   timestamptz default now()
);

-- FK: articles.reform_id → law_reforms.id
alter table articles
  add constraint fk_article_reform
    foreign key (reform_id) references law_reforms(id);

-- ============================================================
-- REFORM NOTIFICATIONS
-- ============================================================
create table reform_notifications (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null references auth.users(id) on delete cascade,
  reform_id uuid        not null references law_reforms(id) on delete cascade,
  seen_at   timestamptz
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table law_reforms          enable row level security;
alter table reform_notifications enable row level security;

create policy "public read law_reforms"
  on law_reforms for select using (true);

create policy "owner select reform_notifications"
  on reform_notifications for select using (auth.uid() = user_id);

create policy "owner insert reform_notifications"
  on reform_notifications for insert with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index on law_reforms          (law_id);
create index on articles             (reform_id);
create index on reform_notifications (user_id);
create index on reform_notifications (reform_id);
