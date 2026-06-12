-- Phase 6.1 — RLS test suite (pgTAP).
-- Verifies the Phase 1 security guarantees (E1/E2/E3 in
-- LEXGT_EXECUTION_PLAN.md) hold from a from-scratch `db reset`:
--   E1: self-granting admin via user_metadata is inert (app_metadata only)
--   E2: tier fields on user_profiles cannot be self-updated
--   E3: tier-gated writes (annotation color/note, cases) are enforced by RLS,
--       not just Server Actions
-- Plus cross-user read isolation on the owner-scoped tables.

begin;

create extension if not exists pgtap;

select plan(15);

-- ============================================================
-- Fixtures
-- ============================================================

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'free@test.com',     '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'pro@test.com',      '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'expired@test.com',  '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin@test.com',    '', now(), '{"role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'other@test.com',    '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'target@test.com',   '', now(), '{}', '{}', now(), now());

-- Promote pro@test and expired@test via the admin path (the owner UPDATE
-- policy was dropped in 0011; only the admin policy + trigger allow this).
set local request.jwt.claims to '{"app_metadata":{"role":"admin"}}';
update public.user_profiles set tier = 'pro' where user_id = '22222222-2222-2222-2222-222222222222';
update public.user_profiles set tier = 'pro', tier_expires_at = now() - interval '1 day' where user_id = '33333333-3333-3333-3333-333333333333';
reset request.jwt.claims;

insert into public.laws (id, slug, short_name, full_name)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'test-law', 'Ley de Prueba', 'Ley de Prueba para pgTAP');

insert into public.articles (id, law_id, number, heading, position)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '1', 'Artículo 1', 1);

insert into public.paragraphs (id, article_id, position, text)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 1, 'Texto de prueba.');

insert into public.law_reforms (id, law_id, title, published_at, status)
values ('aaaaaaaa-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Reforma de prueba', now(), 'published');

-- Data owned by "other" user, used for cross-user read isolation checks.
insert into public.annotations (id, user_id, paragraph_id, article_id, color, char_start, char_end)
values ('aaaaaaaa-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'yellow', 0, 4);

insert into public.cases (id, user_id, title)
values ('aaaaaaaa-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555', 'Caso de otro usuario');

insert into public.reform_notifications (id, user_id, reform_id)
values ('aaaaaaaa-0000-0000-0000-000000000007', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-0000-0000-0000-000000000004');

-- ============================================================
-- E1 — admin role must come from app_metadata, not user_metadata
-- ============================================================

set local role authenticated;

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","user_metadata":{"role":"admin"}}';
select is(public.is_admin(), false, 'E1: user_metadata.role=admin does not grant is_admin()');

set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","app_metadata":{"role":"admin"}}';
select is(public.is_admin(), true, 'E1: app_metadata.role=admin grants is_admin()');

-- ============================================================
-- E2 — user_profiles.tier cannot be self-updated
-- ============================================================

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
with upd as (
  update public.user_profiles set tier = 'pro' where user_id = '11111111-1111-1111-1111-111111111111' returning 1
)
select is(
  (select count(*) from upd)::int,
  0,
  'E2: free user cannot self-update tier (no owner UPDATE policy)'
);

reset role;
set local request.jwt.claims to '{"app_metadata":{"role":"admin"}}';
with upd as (
  update public.user_profiles set tier = 'pro' where user_id = '66666666-6666-6666-6666-666666666666' returning 1
)
select is(
  (select count(*) from upd)::int,
  1,
  'E2: admin can update another user''s tier'
);

-- ============================================================
-- E3 — annotation color/note gated by tier (RLS, not just Server Actions)
-- ============================================================

set local role authenticated;

-- free user: yellow + no note is allowed
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into public.annotations (user_id, paragraph_id, article_id, color, char_start, char_end)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'yellow', 0, 4) $$,
  'E3: free user can insert a yellow highlight with no note'
);

-- free user: pink is blocked
select throws_like(
  $$ insert into public.annotations (user_id, paragraph_id, article_id, color, char_start, char_end)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'pink', 0, 4) $$,
  '%row-level security%',
  'E3: free user cannot insert a pink highlight'
);

-- free user: a note is blocked
select throws_like(
  $$ insert into public.annotations (user_id, paragraph_id, article_id, color, char_start, char_end, note)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'yellow', 0, 4, 'nota') $$,
  '%row-level security%',
  'E3: free user cannot attach a note'
);

-- pro user: pink + note allowed
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok(
  $$ insert into public.annotations (user_id, paragraph_id, article_id, color, char_start, char_end, note)
     values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'pink', 0, 4, 'nota pro') $$,
  'E3: pro user can insert a pink highlight with a note'
);

-- expired-pro user: treated as free, pink is blocked
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_like(
  $$ insert into public.annotations (user_id, paragraph_id, article_id, color, char_start, char_end)
     values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'pink', 0, 4) $$,
  '%row-level security%',
  'E3: expired-pro user is treated as free (pink blocked)'
);

-- ============================================================
-- E3 — cases are Pro-only
-- ============================================================

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_like(
  $$ insert into public.cases (user_id, title) values ('11111111-1111-1111-1111-111111111111', 'Caso free') $$,
  '%row-level security%',
  'E3: free user cannot create a case'
);

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok(
  $$ insert into public.cases (user_id, title) values ('22222222-2222-2222-2222-222222222222', 'Caso pro') $$,
  'E3: pro user can create a case'
);

-- ============================================================
-- Cross-user read isolation
-- ============================================================

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.annotations where user_id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Cross-user: cannot read another user''s annotations'
);

select is(
  (select count(*) from public.cases where user_id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Cross-user: cannot read another user''s cases'
);

select is(
  (select count(*) from public.reform_notifications where user_id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Cross-user: cannot read another user''s reform_notifications'
);

select is(
  (select count(*) from public.user_profiles where user_id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'Cross-user: cannot read another user''s user_profiles'
);

select * from finish();

rollback;
