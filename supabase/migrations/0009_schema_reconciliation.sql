-- 0009_schema_reconciliation.sql
-- Reconciles tracked migrations (0001-0008) with the live schema, which
-- drifted via untracked ad-hoc changes.

-- sections.kind was widened in prod beyond the 0001 CHECK constraint
-- (libro/titulo/capitulo/seccion/parte) to match the values used by the
-- content extractor and lib/types.ts.
alter table sections drop constraint if exists sections_kind_check;
alter table sections add constraint sections_kind_check
  check (kind in ('libro','titulo','capitulo','seccion','parte','parrafo','subseccion','articulo','disposiciones'));

-- Drop duplicate indexes left over from an accidental re-run of 0001
-- against prod (Postgres auto-suffixed the collisions with "1").
drop index if exists sections_law_id_idx1;
drop index if exists sections_parent_id_idx1;
drop index if exists articles_law_id_idx1;
drop index if exists articles_section_id_idx1;
drop index if exists articles_is_current_idx1;
drop index if exists paragraphs_article_id_idx1;
drop index if exists annotations_user_id_idx1;
drop index if exists annotations_paragraph_id_idx1;
