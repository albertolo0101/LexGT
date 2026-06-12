-- Phase 6.1 — schema-reconciliation gap found while building the pgTAP RLS
-- test suite: a from-scratch `db reset` (migrations 0001-0017 + seed) leaves
-- `anon`/`authenticated`/`service_role` without SELECT/INSERT/UPDATE/DELETE
-- on any table created by these migrations — only TRIGGER/TRUNCATE/REFERENCES
-- are present. Prod has full grants on every public table for these roles
-- (verified via information_schema.role_table_grants), applied out-of-band by
-- the Supabase platform's provisioning step. RLS policies are the actual
-- access boundary; these grants are the prerequisite Postgres checks before
-- RLS is even evaluated. Track them so fresh environments match prod.

grant all on all tables in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
