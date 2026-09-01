-- 0022_jurisprudencia.sql
-- Índice de jurisprudencia constitucional (Corte de Constitucionalidad).
--
-- De dónde sale el dato: de la Gaceta Jurisprudencial, la compilación
-- trimestral que la CC publica por mandato del art. 189 de la Ley de Amparo,
-- Exhibición Personal y de Constitucionalidad. La carga la hace lex-extractor
-- (`gaceta.py` + `main.py upload-gaceta`), que se conecta como `postgres` por
-- el Session Pooler y por lo tanto salta RLS. La app NUNCA escribe aquí: no
-- hay política de insert/update/delete, así que ni la anon key ni un usuario
-- autenticado pueden tocar la tabla.
--
-- Qué guardamos y qué no: guardamos el ÍNDICE (expediente, fecha, tipo de
-- proceso, resultado y el sumario que imprime la gaceta), no el texto íntegro
-- de la sentencia. El texto íntegro se queda donde vive, en el portal de la
-- CC, y cada fila enlaza hacia allá. Esto es deliberado — el robots.txt de
-- cc.gob.gt declara `Content-Signal: search=yes, use=reference, ai-train=no`,
-- y un índice que busca y cita es exactamente eso.

-- ============================================================
-- JURISPRUDENCIA — contenido curado, de solo lectura, Pro
-- ============================================================
create table if not exists jurisprudencia (
  id               uuid primary key,        -- uuid5(expediente + fecha) del extractor
  expediente       text not null,           -- '7843-2023' (el principal)
  expedientes      text[] not null default '{}',  -- todos, cuando hay acumulados
  tipo_proceso     text,                    -- 'Amparo en Única Instancia', …
  tipo_resolucion  text not null default 'Sentencia',
  resultado        text,                    -- 'SIN LUGAR' | 'CON LUGAR' | …
  fecha_sentencia  date not null,
  sumario          text not null,
  gaceta           integer,                 -- número de gaceta
  periodo          text,                    -- 'Octubre - Diciembre 2024'
  pagina           integer,
  source_url       text,                    -- el PDF de la gaceta
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  search_vector    tsvector
);

-- Un expediente puede reimprimirse en una gaceta posterior; la identidad real
-- es expediente + fecha de la resolución, que es justo lo que hashea el uuid5.
create unique index if not exists jurisprudencia_expediente_fecha_key
  on jurisprudencia (expediente, fecha_sentencia);

create index if not exists jurisprudencia_search_idx
  on jurisprudencia using gin (search_vector);
create index if not exists jurisprudencia_fecha_idx
  on jurisprudencia (fecha_sentencia desc);
create index if not exists jurisprudencia_expedientes_idx
  on jurisprudencia using gin (expedientes);
create index if not exists jurisprudencia_tipo_idx
  on jurisprudencia (tipo_proceso);
create index if not exists jurisprudencia_gaceta_idx
  on jurisprudencia (gaceta);

-- Mismo patrón que 0007: el tsvector se mantiene por trigger, config
-- 'spanish', para que `plainto_tsquery('spanish', q)` del buscador aplique
-- igual aquí que en articles/paragraphs.
create or replace function update_jurisprudencia_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := to_tsvector('spanish',
    coalesce(new.expediente, '') || ' ' ||
    coalesce(array_to_string(new.expedientes, ' '), '') || ' ' ||
    coalesce(new.tipo_proceso, '') || ' ' ||
    coalesce(new.resultado, '') || ' ' ||
    coalesce(new.sumario, '')
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists jurisprudencia_search_vector_update on jurisprudencia;
create trigger jurisprudencia_search_vector_update
  before insert or update on jurisprudencia
  for each row execute function update_jurisprudencia_search_vector();

alter table jurisprudencia enable row level security;

-- Pro-only, impuesto en RLS y no en una Server Action: la anon key es pública
-- y `is_pro()` es la única frontera que un `curl` no puede saltar.
--
-- El `(select …)` NO es cosmético. Escrita como `using (public.is_pro())` la
-- función se evalúa **una vez por fila** — sobre 23,882 filas eso hace que un
-- SELECT con la anon key muera por statement timeout en vez de devolver
-- vacío. Envuelta en un subselect, el planner la resuelve como InitPlan: una
-- sola vez por consulta. Verificado contra prod: 0.87 s → `[]` para anónimo,
-- 0.38 s para las 23,882 filas de un Pro.
drop policy if exists "jurisprudencia: pro select" on jurisprudencia;
create policy "jurisprudencia: pro select"
  on jurisprudencia for select
  using ((select public.is_pro()));

-- Los valores para los desplegables de la búsqueda. Va como función y no como
-- SELECT desde la app porque PostgREST no sabe hacer DISTINCT: llenar dos
-- listas de ~20 y ~30 valores costaba traer miles de filas en cada carga de
-- la página. `stable` + `security definer` para que el planner la resuelva
-- con el índice y no dependa del RLS del que llama; el acceso sigue siendo
-- Pro porque el `grant execute` es solo a `authenticated` y la función no
-- devuelve ninguna resolución, apenas el catálogo de etiquetas.
create or replace function public.jurisprudencia_facets()
returns table (tipos_proceso text[], resultados text[])
language sql
stable
security definer
set search_path = public
as $$
  select
    case when public.is_pro() then
      (select coalesce(array_agg(t order by t), '{}')
         from (select distinct tipo_proceso as t from jurisprudencia
                where tipo_proceso is not null) s)
    else '{}'::text[] end,
    case when public.is_pro() then
      (select coalesce(array_agg(r order by r), '{}')
         from (select distinct resultado as r from jurisprudencia
                where resultado is not null) s)
    else '{}'::text[] end
$$;

revoke all on function public.jurisprudencia_facets() from public, anon;
grant execute on function public.jurisprudencia_facets() to authenticated, service_role;

-- ============================================================
-- JURISPRUDENCIA_REFS — lo que el usuario guarda
-- ============================================================
-- `jurisprudencia_id` es nullable a propósito: un abogado debe poder anotar
-- una sentencia que todavía no está en el índice (la gaceta va meses atrás
-- del portal) escribiendo el expediente a mano. Cuando la gaceta la publique,
-- el backfill puede enlazarla sin perder la nota.
create table if not exists jurisprudencia_refs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  jurisprudencia_id uuid references jurisprudencia(id) on delete set null,
  expediente        text not null,
  fecha_sentencia   date,
  label             text,
  note              text,
  url               text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Nada de UNIQUE sobre columnas nullable: en Postgres dos NULL no chocan y el
-- índice no serviría. Se restringe solo el caso enlazado, que es el que puede
-- duplicarse por accidente al guardar dos veces el mismo resultado.
create unique index if not exists jurisprudencia_refs_user_juris_key
  on jurisprudencia_refs (user_id, jurisprudencia_id)
  where jurisprudencia_id is not null;

create index if not exists jurisprudencia_refs_user_idx
  on jurisprudencia_refs (user_id, created_at desc);

alter table jurisprudencia_refs enable row level security;

-- Mismo reparto que `cases` (0012): leer y borrar es del dueño; crear y
-- editar exige Pro vigente, así que un Pro vencido conserva su historial en
-- modo lectura en vez de perderlo.
drop policy if exists "jurisprudencia_refs: owner select" on jurisprudencia_refs;
create policy "jurisprudencia_refs: owner select"
  on jurisprudencia_refs for select
  using (auth.uid() = user_id);

drop policy if exists "jurisprudencia_refs: owner delete" on jurisprudencia_refs;
create policy "jurisprudencia_refs: owner delete"
  on jurisprudencia_refs for delete
  using (auth.uid() = user_id);

drop policy if exists "jurisprudencia_refs: owner insert" on jurisprudencia_refs;
create policy "jurisprudencia_refs: owner insert"
  on jurisprudencia_refs for insert
  with check (auth.uid() = user_id and public.is_pro());

drop policy if exists "jurisprudencia_refs: owner update" on jurisprudencia_refs;
create policy "jurisprudencia_refs: owner update"
  on jurisprudencia_refs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.is_pro());

-- ============================================================
-- CASE_JURISPRUDENCIA — la referencia dentro de un caso
-- ============================================================
-- Espejo exacto de `case_annotations` (0006 + 0012).
create table if not exists case_jurisprudencia (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references cases(id) on delete cascade,
  ref_id     uuid not null references jurisprudencia_refs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (case_id, ref_id)
);

create index if not exists case_jurisprudencia_case_idx
  on case_jurisprudencia (case_id);

alter table case_jurisprudencia enable row level security;

drop policy if exists "case_jurisprudencia: case owner select" on case_jurisprudencia;
create policy "case_jurisprudencia: case owner select"
  on case_jurisprudencia for select
  using (
    exists (
      select 1 from cases
      where cases.id = case_jurisprudencia.case_id
        and cases.user_id = auth.uid()
    )
  );

drop policy if exists "case_jurisprudencia: case owner delete" on case_jurisprudencia;
create policy "case_jurisprudencia: case owner delete"
  on case_jurisprudencia for delete
  using (
    exists (
      select 1 from cases
      where cases.id = case_jurisprudencia.case_id
        and cases.user_id = auth.uid()
    )
  );

drop policy if exists "case_jurisprudencia: case owner insert" on case_jurisprudencia;
create policy "case_jurisprudencia: case owner insert"
  on case_jurisprudencia for insert
  with check (
    public.is_pro()
    and exists (
      select 1 from cases
      where cases.id = case_jurisprudencia.case_id
        and cases.user_id = auth.uid()
    )
    and exists (
      select 1 from jurisprudencia_refs
      where jurisprudencia_refs.id = case_jurisprudencia.ref_id
        and jurisprudencia_refs.user_id = auth.uid()
    )
  );

drop policy if exists "case_jurisprudencia: case owner update" on case_jurisprudencia;
create policy "case_jurisprudencia: case owner update"
  on case_jurisprudencia for update
  using (
    exists (
      select 1 from cases
      where cases.id = case_jurisprudencia.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    public.is_pro()
    and exists (
      select 1 from cases
      where cases.id = case_jurisprudencia.case_id
        and cases.user_id = auth.uid()
    )
  );

-- Grants: mismo razonamiento que 0018 — RLS es la frontera, esto es solo el
-- permiso de tabla que Postgres revisa antes de siquiera evaluar RLS.
grant all on table jurisprudencia, jurisprudencia_refs, case_jurisprudencia
  to anon, authenticated, service_role;
