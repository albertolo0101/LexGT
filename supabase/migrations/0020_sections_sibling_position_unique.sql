-- 0020_sections_sibling_position_unique.sql
-- Defensive guard from the extractor Bug 2 investigation (sibling section
-- position collisions). Sibling sections (same law_id + parent_id) must have a
-- unique position. NULLS NOT DISTINCT (Postgres 15+) so root-level siblings
-- (parent_id IS NULL) are ALSO covered — the exact case the synthetic
-- "Disposiciones Finales" position bug hit, which a plain UNIQUE would miss
-- because Postgres treats NULLs as distinct by default.
--
-- Turns any residual position collision (from any code path) into a loud
-- load-time error instead of silent duplicate rows, complementing validate_law().
--
-- APPLICATION TIMING (prod): the 15 legacy laws currently in prod VIOLATE this
-- (55 root + 9 non-root excess rows as of 2026-07-04). Apply this to prod only
-- AFTER the old content is wiped and before/at the clean re-extraction reload,
-- when it acts as a live guard. On a fresh `db reset` (empty data) it applies
-- trivially, so committing it here keeps CI/db-reset in sync.

alter table public.sections
  add constraint sections_sibling_position_unique
  unique nulls not distinct (law_id, parent_id, position);
