-- Phase 6.2a — one-off cleanup of duplicate `paragraphs` rows created by
-- re-running lex-extractor against the same law without an idempotency
-- constraint (see validate_law's paragraphs_position_unique check and
-- LEXGT_EXECUTION_PLAN.md §6.2).
--
-- Step 1: re-point any annotation whose paragraph_id is an "extra" duplicate
-- (same article_id+position, later created_at) to the kept row (earliest
-- created_at). Verified beforehand that text is identical between extra and
-- kept rows for all 3 affected annotations.
with ranked as (
  select id, article_id, position, created_at,
    row_number() over (partition by article_id, position order by created_at) as rn
  from public.paragraphs
),
kept as (
  select article_id, position, id as kept_id from ranked where rn = 1
)
update public.annotations an
set paragraph_id = kept.kept_id
from ranked extra
join kept on kept.article_id = extra.article_id and kept.position = extra.position
where extra.id = an.paragraph_id and extra.rn > 1;

-- Step 2: delete the extra duplicate rows.
with ranked as (
  select id, row_number() over (partition by article_id, position order by created_at) as rn
  from public.paragraphs
)
delete from public.paragraphs p
using ranked
where ranked.id = p.id and ranked.rn > 1;

-- Step 3: make future re-runs idempotent — extractor's ON CONFLICT can now
-- target (article_id, position).
alter table public.paragraphs
  add constraint paragraphs_article_id_position_key unique (article_id, position);
