-- 0005_annotations_color_note.sql
-- color and note were included in 0001_initial_schema.sql.
-- This migration is a no-op if they already exist (IF NOT EXISTS).
-- Kept for tracking purposes in migration history.

alter table annotations
  add column if not exists color text not null default 'yellow',
  add column if not exists note  text;
