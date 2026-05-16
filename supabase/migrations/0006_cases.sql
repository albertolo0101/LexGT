-- 0006_cases.sql
-- Cases (carpetas de trabajo Pro) + case_annotations many-to-many

create table cases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  color       text not null default 'gray',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table cases enable row level security;

create policy "cases: owner all"
  on cases for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Many-to-many: una annotation puede estar en múltiples casos.
-- on delete cascade en ambas FKs limpia automáticamente.
create table case_annotations (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references cases(id) on delete cascade,
  annotation_id uuid not null references annotations(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique(case_id, annotation_id)
);

alter table case_annotations enable row level security;

create policy "case_annotations: case owner all"
  on case_annotations for all
  using (
    exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from cases
      where cases.id = case_annotations.case_id
        and cases.user_id = auth.uid()
    )
  );
