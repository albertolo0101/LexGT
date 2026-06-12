-- 0014_annotation_anchors.sql
-- Phase 5.1: annotation anchoring v2. char_start/char_end into paragraphs.text
-- silently corrupt on any text edit (typo fixes, reforms). Add a durable
-- TextQuoteSelector-style anchor (quote + prefix/suffix context) alongside a
-- cheap checksum of the paragraph text, so the app can detect drift and
-- re-anchor highlights instead of pointing at the wrong characters.

alter table annotations
  add column if not exists quote text,
  add column if not exists prefix text,
  add column if not exists suffix text,
  add column if not exists text_checksum text,
  add column if not exists anchor_status text not null default 'anchored';

alter table annotations
  drop constraint if exists annotations_anchor_status_check;

alter table annotations
  add constraint annotations_anchor_status_check
  check (anchor_status in ('anchored', 'reanchored', 'orphaned'));

-- Backfill quote/prefix/suffix/checksum from current paragraph text using the
-- stored offsets. Annotations whose offsets fall outside the current text are
-- marked orphaned (their stored offsets predate a text change).
update annotations a
set
  quote = case
    when a.char_start >= 0 and a.char_end <= length(p.text) and a.char_start < a.char_end
      then substring(p.text from a.char_start + 1 for a.char_end - a.char_start)
    else null
  end,
  prefix = case
    when a.char_start >= 0 and a.char_end <= length(p.text) and a.char_start < a.char_end
      then substring(p.text from greatest(a.char_start - 32, 0) + 1 for least(32, a.char_start))
    else null
  end,
  suffix = case
    when a.char_start >= 0 and a.char_end <= length(p.text) and a.char_start < a.char_end
      then substring(p.text from a.char_end + 1 for 32)
    else null
  end,
  text_checksum = encode(sha256(convert_to(p.text, 'UTF8')), 'hex'),
  anchor_status = case
    when a.char_start >= 0 and a.char_end <= length(p.text) and a.char_start < a.char_end
      then 'anchored'
    else 'orphaned'
  end
from paragraphs p
where p.id = a.paragraph_id;
