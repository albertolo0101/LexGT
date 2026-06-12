# LexGT — Architectural Remediation & Mobile-Readiness Execution Plan

> **Audience:** Claude Code (autonomous coding agent).
> **Rule:** Execute phases in order. Do not start a phase until the previous phase's success criteria pass. Each step lists files, the problem solved, and verifiable success criteria.
> **Scope guard:** This plan does NOT include Phase 13 (jurisprudencia), Phase 14 (payments), or any UI redesign work. It hardens what exists and prepares the API layer for mobile.

---

## Threat model summary (why the ordering below)

The Supabase anon key is public by design. Anything not enforced by **RLS or DB triggers** is enforceable by nothing — Server Action checks and UI gating are bypassable with `curl` + the anon key. Today three privilege escalations exist:

| # | Vector | Severity | Current "protection" |
|---|---|---|---|
| E1 | `supabase.auth.updateUser({ data: { role: 'admin' } })` — `user_metadata` is **self-writable**; `is_admin()` and middleware both read it | **Critical** — full admin takeover | None |
| E2 | `PATCH /rest/v1/user_profiles?user_id=eq.<me>` with `{ "tier": "pro" }` — owner UPDATE policy has no column restriction | High — free → pro | UI only |
| E3 | Direct PostgREST `INSERT` into `annotations` (color ≠ yellow, note ≠ null) and `cases` — RLS checks ownership only, tier checks live in Server Actions | High — free gets all Pro features | Server Actions only |

Phase 1 closes all three. Nothing deploys to production (Phase 12) before Phase 1 is complete and tested.

---

## Phase 0 — Baseline, schema reconciliation & hygiene

Goal: a trustworthy starting state. No behavior changes.

### Step 0.1 — Snapshot real DB schema and reconcile drift
- **Files:** `supabase/migrations/0009_schema_reconciliation.sql` (new), `supabase/SCHEMA_SNAPSHOT.md` (new, generated)
- **Problem:** `sections.kind` CHECK constraint in migration 0001 allows only `libro/titulo/capitulo/seccion/parte`, but the live DB and `lib/types.ts` use a wider set (`parrafo, subseccion, articulo, disposiciones`). The widening was done ad-hoc and is not a tracked migration → any fresh environment built from migrations diverges from prod.
- **Actions:**
  1. Run `supabase db diff` (or query `information_schema` via the Supabase MCP) against prod to capture the actual constraint definitions, columns, and policies.
  2. Write `0009_schema_reconciliation.sql` so that `migrations 0001–0009 applied to an empty DB == prod schema exactly`. Use `ALTER TABLE ... DROP CONSTRAINT IF EXISTS ... / ADD CONSTRAINT` idempotent form. Include the full `sections.kind` value set.
  3. Generate `SCHEMA_SNAPSHOT.md` documenting every table, column, constraint, policy, function, trigger as they exist post-0009. Commit it.
- **Success criteria:**
  - `supabase db reset` on a local instance followed by `supabase db diff --linked` reports **zero differences** against prod schema (data excluded).
  - All existing `sections.kind` values in prod pass the new constraint (verify with `SELECT DISTINCT kind FROM sections;` — no row violates).

### Step 0.2 — Dead code removal & dependency audit
- **Files:** delete `components/Header.tsx`; `package.json`
- **Problem:** Documented-dead code creates ambiguity for an autonomous agent ("which header is real?").
- **Actions:** Delete `Header.tsx`, grep for any remaining imports, run `npm run build`. Run `npx depcheck` and remove unused deps.
- **Success criteria:** `npm run build` succeeds; `grep -r "components/Header" app/ components/ lib/` returns nothing.

### Step 0.3 — Secrets hygiene (extractor repo + local config)
- **Files (lex-extractor repo):** `.claude/settings.local.json`, `.env` (new), `.gitignore`
- **Problem:** The Postgres session-pooler password is stored in plain text inside `.claude/settings.local.json` command allowlist entries.
- **Actions:**
  1. Move the connection string to `LEX_DB_URL` in an untracked `.env`; update extractor scripts to read it from the environment (`psql "$LEX_DB_URL"`).
  2. Scrub the password from `settings.local.json` (replace allowlist entries with env-var-based commands).
  3. **Rotate the database password in the Supabase dashboard** (the old one must be treated as leaked). Update `.env.local` / extractor `.env` accordingly. *(This rotation step is for Beto to perform manually — Claude Code: stop and request it, do not attempt to change credentials yourself.)*
- **Success criteria:** `git grep -I "postgres\.enrykddxhqsibbokrood"` and a grep for the old password return zero hits in both repos; extractor still connects using `$LEX_DB_URL`.

---

## Phase 1 — Security patching (P0 — blocks deploy)

All changes here are DB-level. The principle: **RLS + triggers are the only real boundary; Server Actions become UX, not security.**

### Step 1.1 — Move admin role to `app_metadata`; fix `is_admin()` and middleware
- **Files:** `supabase/migrations/0010_admin_app_metadata.sql`, `middleware.ts`, `app/admin/layout.tsx`
- **Problem (E1):** `user_metadata` is self-writable via `auth.updateUser()`. Anyone can become admin.
- **Actions:**
  1. Manually (Supabase dashboard / SQL as service role): copy `role: 'admin'` for the admin account from `raw_user_meta_data` into `raw_app_meta_data`, and **delete** it from `user_metadata`. *(Beto performs this; Claude Code provides the exact SQL and waits for confirmation.)*
  2. `0010`: redefine `public.is_admin()` as
     ```sql
     create or replace function public.is_admin() returns boolean
     language sql stable security invoker as $$
       select coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
     $$;
     ```
  3. Update `middleware.ts` and `app/admin/layout.tsx` to read `user.app_metadata.role === 'admin'` instead of `user_metadata`.
- **Success criteria (manual + scripted):**
  - As a normal authenticated user, `await supabase.auth.updateUser({ data: { role: 'admin' } })` succeeds (it always will) but: `/admin` still redirects, and a PostgREST write to an admin-only table (e.g. `INSERT INTO law_collections`) returns a 401/42501 RLS error.
  - The real admin account still passes both middleware and RLS checks.
  - These two checks are codified as the first RLS tests in Phase 6 (write them now in `supabase/tests/`, runnable manually).

### Step 1.2 — Lock `user_profiles.tier` (and friends) against self-update
- **Files:** `supabase/migrations/0011_lock_user_profiles.sql`
- **Problem (E2):** Owner UPDATE policy on `user_profiles` is column-unrestricted.
- **Actions:** Simplest robust fix — users currently have **nothing** legitimate to update in this table, so:
  1. Drop the owner UPDATE policy entirely. Keep owner SELECT. Keep admin INSERT/UPDATE (via `is_admin()`).
  2. Defense in depth: add a `BEFORE UPDATE` trigger that raises an exception if `NEW.tier / NEW.tier_expires_at / NEW.tier_source` differ from `OLD.*` and `NOT public.is_admin()`. (Protects against a future dev re-adding an owner UPDATE policy without thinking.)
  3. If user-editable profile fields are ever needed (display name, preferences), they go in a new `user_preferences` table — do **not** re-open `user_profiles`.
- **Success criteria:** As a free user via PostgREST: `PATCH user_profiles SET tier='pro'` → 0 rows affected / RLS error. Admin `setUserTier` action still works end-to-end.

### Step 1.3 — DB-level tier enforcement: `current_user_tier()` + WITH CHECK policies
- **Files:** `supabase/migrations/0012_tier_enforcement.sql`
- **Problem (E3):** Free users can insert Pro-only data directly via PostgREST.
- **Actions:**
  1. Create the single source of truth for tier:
     ```sql
     create or replace function public.current_user_tier() returns text
     language sql stable security definer set search_path = public as $$
       select case
         when auth.uid() is null then 'anonymous'
         when exists (
           select 1 from user_profiles
           where user_id = auth.uid()
             and tier = 'pro'
             and (tier_expires_at is null or tier_expires_at > now())
         ) then 'pro'
         else 'free'
       end
     $$;
     create or replace function public.is_pro() returns boolean
       language sql stable as $$ select public.current_user_tier() = 'pro' $$;
     ```
     `security definer` is required so the function can read `user_profiles` regardless of the caller's RLS context; `set search_path` prevents hijacking.
  2. **annotations** — replace the INSERT/UPDATE policies' `WITH CHECK` with:
     `auth.uid() = user_id AND (public.is_pro() OR (color = 'yellow' AND note IS NULL))`.
  3. **cases** — INSERT/UPDATE `WITH CHECK`: `auth.uid() = user_id AND public.is_pro()`.
  4. **case_annotations** — extend the existing ownership check with `AND public.is_pro()`.
  5. Keep the Server Action checks (`requirePro`, color validation) — they remain for friendly error messages, but are no longer the security boundary.
  6. **Expiry edge case to preserve:** a downgraded/expired Pro user keeps SELECT access to their existing cases/notes (read-only history) but cannot INSERT/UPDATE — the policies above produce exactly this; do not add tier conditions to SELECT policies.
- **Success criteria:**
  - Free user via raw PostgREST: insert annotation `color='pink'` → RLS error; `color='yellow', note=null` → success; insert into `cases` → RLS error.
  - Pro user: all of the above succeed.
  - Pro user with `tier_expires_at` in the past behaves as free for writes but can still SELECT their old cases.
  - Existing app flows (highlight save, case create as Pro) still work through the UI.

### Step 1.4 — Decide & document: anon key write surface review
- **Files:** `docs/SECURITY.md` (new)
- **Problem:** No single document states what the anon key can and cannot do — every future feature risks repeating E3.
- **Actions:** Write `docs/SECURITY.md`: table of every RLS-enabled table × operation × policy, the rule *"any new user-writable table MUST encode tier rules in WITH CHECK, never only in actions"*, and the `app_metadata` vs `user_metadata` rule. Link it from `CLAUDE.md` so future Claude Code sessions load it.
- **Success criteria:** File exists, `CLAUDE.md` references it under a "Security invariants" heading.

---

## Phase 2 — Authorization & error-handling unification

Goal: one tier type, one authz module, structured errors. Pure app-layer refactor, no schema changes.

### Step 2.1 — Unify the tier type
- **Files:** `lib/types.ts`, `lib/get-pending-reforms.ts`, every consumer of `Tier`/`UserTier` (grep-driven)
- **Problem:** `Tier = 'free'|'pro'` and `UserTier = 'anonymous'|'free'|'pro'` coexist; components hand-map between them.
- **Actions:** Single exported type in `lib/types.ts`:
  ```ts
  export type Tier = 'anonymous' | 'free' | 'pro';
  export type AuthedTier = Exclude<Tier, 'anonymous'>;
  ```
  `getUserTier()` returns `Tier` (returns `'anonymous'` when no user — changing its current behavior of returning `'free'`). Delete `UserTier`. Fix all call sites; where DB rows are concerned (`user_profiles.tier`), type as `AuthedTier`.
- **Success criteria:** `tsc --noEmit` passes; `grep -rn "UserTier" lib/ app/ components/` returns nothing; manual smoke: anonymous visitor sees 7-day reform window, free sees 1 month, pro sees 6 months (unchanged behavior).

### Step 2.2 — `lib/authz.ts` — single authorization module
- **Files:** `lib/authz.ts` (new), `app/casos/actions.ts`, `app/leyes/actions.ts`, `app/admin/actions.ts`
- **Problem:** `requirePro()` lives in `casos/actions.ts`, admin checks are re-implemented per file, error shapes vary.
- **Actions:** Implement and export from `lib/authz.ts`:
  ```ts
  export type Actor = { userId: string | null; tier: Tier; isAdmin: boolean };
  export async function getActor(supabase): Promise<Actor>;
  export function requireUser(actor): asserts userId non-null;   // throws AuthzError('UNAUTHENTICATED')
  export function requirePro(actor): void;                        // throws AuthzError('PRO_REQUIRED')
  export function requireAdmin(actor): void;                      // throws AuthzError('ADMIN_REQUIRED')
  export class AuthzError extends Error { code: AuthzCode }
  ```
  Replace every inline check in the three `actions.ts` files with these helpers.
- **Success criteria:** `grep -rn "requirePro\|role.*admin" app/` shows only imports from `lib/authz` (plus middleware/layout); build passes; a free user attempting case creation gets the `PRO_REQUIRED` code (verified in Step 2.3's shape).

### Step 2.3 — Structured Server Action results
- **Files:** `lib/action-result.ts` (new), all `actions.ts` files, their client consumers (`CasesClient.tsx`, `ParagraphHighlighter.tsx`, `ReformModal.tsx`, admin forms)
- **Problem:** Actions `throw new Error(pgError.message)` → raw Postgres strings reach generic error boundaries; the UI cannot branch (e.g. show paywall on `PRO_REQUIRED`).
- **Actions:**
  ```ts
  export type ActionResult<T = void> =
    | { ok: true; data: T }
    | { ok: false; code: 'UNAUTHENTICATED' | 'PRO_REQUIRED' | 'ADMIN_REQUIRED'
                      | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'INTERNAL';
        message: string };
  ```
  Wrap each action body in try/catch: `AuthzError` → its code; known PG codes (23505 → CONFLICT, 42501 → mapped by context) → structured; everything else → `INTERNAL` with a generic message (log the real error server-side, never leak `pgError.message` to the client). Update client consumers: `PRO_REQUIRED` opens `PaywallModal`, `UNAUTHENTICATED` redirects to login.
- **Success criteria:** No `actions.ts` file contains a bare `throw new Error(`; clicking "save note" as free user opens the paywall modal instead of a Next.js error screen; build passes.

---

## Phase 3 — Service layer extraction (mobile-readiness, part 1)

Goal: business logic lives in pure, transport-agnostic functions. Server Actions become thin wrappers. **No new infrastructure.** This is the entire migration path to mobile — Phase 4 just adds a second transport.

### Step 3.1 — Create `lib/services/` and extract annotation logic
- **Files:** `lib/services/annotations.ts` (new), `app/leyes/actions.ts`
- **Problem:** Logic (validation, tier rules, migration-on-reform) is welded to the Server Action transport, unusable from API routes.
- **Actions:** Signature convention for every service function:
  ```ts
  // (supabase: SupabaseClient, actor: Actor, input: ZodValidatedInput) => Promise<Result>
  export async function saveAnnotation(db, actor, input: SaveAnnotationInput) { ... }
  ```
  Rules: services never import `next/*`, never call `revalidatePath` (the wrapper does), never read cookies/headers; all input validated with `zod` schemas exported next to the function (`SaveAnnotationInput = z.infer<...>`). Move `saveAnnotation, deleteAnnotation, updateAnnotationNote, migrateAnnotations, markReformSeen` bodies into the service; `app/leyes/actions.ts` becomes: get client → `getActor` → call service → map errors → `revalidatePath`.
- **Success criteria:** `grep -rn "next/" lib/services/` returns nothing; all annotation UI flows work unchanged; each service function has at least one Vitest unit test with a mocked Supabase client (set up Vitest in this step: `vitest.config.ts`, `npm run test`).

### Step 3.2 — Extract cases, reforms, admin, tier services
- **Files:** `lib/services/cases.ts`, `lib/services/reforms.ts`, `lib/services/admin.ts` (new); `app/casos/actions.ts`, `app/admin/actions.ts`
- **Problem/Actions:** Same pattern as 3.1 for `createCase, deleteCase, addAnnotationToCase, removeAnnotationFromCase, publishReform, createReformDraft, approveReform, findArticle, setUserTier`. Preserve the documented invariant: **`approveReform` reuses the draft's `reform_id` — never route it through `publishReform`** (would duplicate `law_reforms` rows). Encode that invariant as a unit test.
- **Success criteria:** All `actions.ts` files are ≤ ~15 lines per action (wrapper only); full manual regression of admin reform flow (draft → approve → user sees badge → migrate annotations) passes; unit tests green.

### Step 3.3 — Read-path query modules
- **Files:** `lib/services/queries/laws.ts`, `queries/reading.ts`, `queries/search.ts` (new); refactor `app/leyes/page.tsx`, `[slug]/page.tsx`, `[slug]/[section_id]/page.tsx`, `app/api/search/route.ts` to consume them
- **Problem:** The big parallel reads in Server Components (reading view loads 7 datasets) are inline — mobile will need identical queries.
- **Actions:** Extract each page's data-loading into named query functions returning typed DTOs (`getLawCatalog`, `getSectionReadingBundle`, `searchArticles`). Pages keep only composition/rendering.
- **Success criteria:** Pages render identically (visual smoke on the 3 routes + search); `app/**/page.tsx` files contain no `.from(` calls (grep).

---

## Phase 4 — Versioned API layer (mobile-readiness, part 2)

Goal: expose the Phase 3 services over HTTP for React Native. Web app keeps using Server Actions (no churn). **Decision: do NOT build a separate backend (Railway/Render) for the core app** — Next.js Route Handlers on Vercel + Supabase RLS already give a real API; a separate deployable is reserved for the Phase 13 scraper and future heavy-compute modules (see Phase 7).

### Step 4.1 — Bearer-token Supabase client factory
- **Files:** `lib/supabase-bearer.ts` (new)
- **Problem:** `lib/supabase-server.ts` is cookie-bound; mobile clients authenticate with `Authorization: Bearer <supabase_access_token>`.
- **Actions:** Factory that builds a server client from a request's bearer token:
  ```ts
  export function createBearerClient(accessToken: string) {
    return createClient(URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  ```
  RLS then applies exactly as it does for the web (same JWT semantics). Keep the existing two factories untouched — this is a third, API-route-only factory. Document the three-factory rule in `CLAUDE.md`.
- **Success criteria:** A script obtains a session via password grant and calls a protected query through this client; RLS returns only that user's rows.

### Step 4.2 — `/api/v1` route handlers over services
- **Files:** `app/api/v1/annotations/route.ts`, `app/api/v1/annotations/[id]/route.ts`, `app/api/v1/cases/route.ts`, `app/api/v1/cases/[id]/route.ts`, `app/api/v1/me/route.ts` (tier/profile), `lib/api/handler.ts` (shared wrapper: auth → actor → zod parse → service → JSON; maps `AuthzError`/codes to 401/403/422/409/500)
- **Problem:** No HTTP surface for mobile mutations.
- **Actions:** Each route is ~10 lines: extract bearer token → `createBearerClient` → `getActor` → call the same service from Phase 3 → return `{ ok, data | code }` JSON mirroring `ActionResult`. Reads that are public (laws, sections, search) **don't need v1 endpoints** — mobile uses supabase-js + the existing `/api/search` directly; only mutations and tier-sensitive aggregates go through v1.
- **Success criteria:**
  - `curl` matrix passes: no token → 401; free token + pink annotation → 403 `PRO_REQUIRED` (and the DB would have blocked it anyway per Phase 1); pro token → 200.
  - Zero business logic in route files (only the shared handler + service call — verified by review/grep for `.from(`).
  - `docs/API.md` generated listing every endpoint, method, input schema, error codes.

### Step 4.3 — Rate limiting on public endpoints
- **Files:** `lib/api/rate-limit.ts`, applied in `app/api/search/route.ts` and `lib/api/handler.ts`
- **Problem:** `/api/search` and the new v1 endpoints are unthrottled.
- **Actions:** `@upstash/ratelimit` + Upstash Redis (free tier) — sliding window, e.g. 30 req/min per IP for search, 60 req/min per user for v1 mutations. Fail-open if Redis is unreachable (availability > strictness for a reader app), but log it.
- **Success criteria:** A loop of 50 rapid search requests receives 429s after the limit; normal usage unaffected; env vars documented in `.env.example`.

---

## Phase 5 — Annotation anchoring v2 (data integrity) — ✓ COMPLETE

Goal: highlights survive typo corrections and re-extractions. Design follows the W3C Web Annotation "TextQuoteSelector + TextPositionSelector" pattern (the approach used by Hypothesis): offsets are a fast path, quoted text + context is the durable anchor.

### Step 5.1 — Schema: add quote anchors + orphan state — ✓ DONE (`0014_annotation_anchors.sql`)
- **Files:** `supabase/migrations/0013_annotation_anchors.sql`, `lib/types.ts`
- **Problem:** `char_start/char_end` into `paragraphs.text` silently corrupt on any text edit.
- **Actions:** Add to `annotations`:
  - `quote text` (the exact highlighted string), `prefix text` (≤32 chars before), `suffix text` (≤32 chars after)
  - `anchor_status text not null default 'anchored' check (anchor_status in ('anchored','reanchored','orphaned'))`
  - `text_checksum text` — e.g. md5 of `paragraphs.text` at save time (cheap drift detection)
  - Backfill: for every existing annotation, compute `quote/prefix/suffix/checksum` from current paragraph text using stored offsets (SQL `substring`). Annotations whose offsets exceed current text length → `orphaned`.
- **Success criteria:** Migration runs on a prod-schema copy; `SELECT count(*) FROM annotations WHERE quote IS NULL` = 0; orphan count reported and plausible (likely 0 today).

### Step 5.2 — Save & render paths use anchors — ✓ DONE
- **Files:** `lib/services/annotations.ts`, `components/ParagraphHighlighter.tsx`, `lib/anchoring.ts` (new)
- **Problem:** Client must capture and resolve anchors.
- **Actions:**
  1. On save: `ParagraphHighlighter` sends `quote/prefix/suffix` alongside offsets; service computes checksum server-side from the paragraph row (don't trust client text).
  2. `lib/anchoring.ts` — `resolveAnchor(paragraphText, ann): { start, end, status }`:
     a) if `checksum` matches → use stored offsets (`anchored`);
     b) else search for `prefix+quote+suffix`, then `quote` alone (unique match required) → new offsets (`reanchored`);
     c) else → `orphaned`.
  3. Render: orphaned annotations show in the Notas panel with an "el texto cambió" badge instead of an inline highlight; reanchored ones render normally. Persist re-anchors lazily (fire-and-forget update with new offsets + checksum + status).
- **Success criteria:** Unit tests for `resolveAnchor` covering: unchanged text, typo before the quote (offsets shift, quote intact → reanchored), typo inside the quote (→ orphaned), duplicate quote text disambiguated by prefix. UI smoke: manually `UPDATE paragraphs SET text = ...` inserting a word before a highlight → highlight still renders correctly after reload.

### Step 5.3 — Admin "corrección de texto" path (distinct from reforms) — ✓ DONE
- **Files:** `lib/services/admin.ts` (`correctParagraphText`), `app/admin/actions.ts`, small admin UI affordance (optional this phase: SQL-only function is acceptable)
- **Problem:** The reform flow is the only sanctioned way to change text, but typo fixes are not reforms — admins/the extractor will otherwise edit `paragraphs.text` raw and orphan annotations silently.
- **Actions:** `correctParagraphText(db, actor, { paragraphId, newText })`: requires admin; updates text; runs `resolveAnchor` server-side for every annotation on that paragraph, persisting new offsets/status; returns counts `{ reanchored, orphaned }`. Document in `docs/SECURITY.md`/extractor README: **raw UPDATEs to `paragraphs.text` are forbidden; corrections go through this function; structural changes go through reforms.**
- **Success criteria:** Integration test: paragraph with 3 annotations, correct a typo → 3 reanchored, 0 orphaned; replace the sentence containing one highlight → that one orphaned, others reanchored.

---

## Phase 6 — Testing & CI

### Step 6.1 — RLS test suite (highest-value tests in the repo) ✓ DONE (2026-06-12)
- **Files:** `supabase/tests/database/rls.test.sql` (pgTAP via `supabase test db`), `npm run test:rls`
- **Problem:** Every Phase 1 guarantee is currently verified by hand.
- **Actions:** Seeded `free@test`, `pro@test`, `expired@test`, `admin@test`, `other@test`, `target@test` (6th user, dedicated to the E2 admin-update assertion so it doesn't mutate the free-user fixture used by E3). Asserted the full E1/E2/E3 matrix: self-grant admin via user_metadata is inert; tier UPDATE blocked for self / allowed for admin; pink/noted annotation blocked for free, allowed for pro, blocked for expired-pro; cases blocked for free, allowed for pro; cross-user reads return zero rows on `annotations`, `cases`, `reform_notifications`, `user_profiles`.
- **Schema-reconciliation gap found & fixed:** a from-scratch `db reset` (migrations 0001-0017 + seed) left `anon`/`authenticated`/`service_role` without table-level SELECT/INSERT/UPDATE/DELETE grants on any `public` table (only TRIGGER/TRUNCATE/REFERENCES were present) — RLS policies never even get evaluated without the underlying grant. Prod had these grants already, applied out-of-band by Supabase's project-provisioning step. Added `0018_grant_table_privileges.sql` (`grant all ... to anon, authenticated, service_role` + matching `alter default privileges`) and applied to prod for parity.
- **Success criteria:** ✓ `npm run test:rls` (`supabase test db`) green — 15/15 — against a from-scratch `db reset` (migrations 0001-0018 + seed).

### Step 6.2 — Content pipeline validation gate
- **Files:** `supabase/migrations/0015_validate_law.sql` (✓), `0016_dedupe_paragraphs.sql` (✓), `0017_validate_law_tolerate_derogado.sql` (✓) — all applied to prod. Extractor repo: post-load step (pending, extractor-scope, see below).
- **Problem:** Nothing verifies extractor output satisfies app assumptions (review gap #6).
- **Actions:** ✓ `public.validate_law(law_slug text) returns table(check_name text, ok boolean, detail text)` asserting per law: `law_exists`, `has_sections`, `sections_kind_valid`, `sections_sibling_position_unique`, `articles_have_paragraphs`, `paragraphs_position_unique`, `one_current_article_per_number`, `paragraphs_nonempty_text`, `articles_search_vector`, `paragraphs_search_vector`. Deployed to prod (`enrykddxhqsibbokrood`) via Supabase MCP.
- **Status: ✓ "6.2a" (non-extractor cleanup) DONE (2026-06-12)** — see below. **Remaining failures are all extractor-scope** (real content gaps + numbering/position bugs in `lex-extractor`'s output) and are deferred to the planned extractor-fix session (after Phase 7). **Do not mark 6.2 fully done** until that session re-runs extraction for affected laws and `validate_law()` returns zero failing rows across all 15 laws.
- **Success criteria (unchanged):** Running it on all 15 loaded laws returns zero failing rows (fix data or checks until true — investigate, don't loosen blindly); extractor README documents the gate.

#### 6.2a — completed without touching the extractor (2026-06-12)

1. **`paragraphs_position_unique` — FIXED.** `0016_dedupe_paragraphs.sql`: re-pointed the 3 annotations whose `paragraph_id` referenced an "extra" duplicate (matched on identical `article_id`+`position`+`text`, kept the earliest `created_at`) to the kept row, deleted the 7,369 extra duplicate `paragraphs` rows, and added `UNIQUE (article_id, position)` (`paragraphs_article_id_position_key`) so the extractor's `ON CONFLICT` becomes effective on future re-runs. Verified post-apply: `paragraphs_position_unique` is now 0 failures across all 15 laws.

2. **`articles_have_paragraphs` — check refined, data gap remains.** `0017_validate_law_tolerate_derogado.sql`: the check now excludes articles with `heading ILIKE '%derogad%'` (55 articles, legitimately empty — repealed). Reduced failure counts accordingly (e.g. `codigo-penal-de-guatemala` 225 → 163), but **~1,007 articles still have zero paragraphs** — real content gaps from extraction, **extractor-scope**, deferred.

#### Remaining findings — all extractor-scope, deferred to the post-Phase-7 extractor session (2026-06-12)

1. **`articles_have_paragraphs` (~1,007 articles, almost every law)** — extraction silently dropped body text for these articles. Worst offenders: `codigo-penal-de-guatemala` (163), `ley-electoral-y-de-partidos-politicos` (195), `codigo-de-trabajo` (161). Needs investigation in `lex-extractor` (parsing edge case — short articles, articles immediately followed by a section break, etc.) and re-extraction of affected laws.

2. **`sections_sibling_position_unique` (35 duplicate pairs across 7 laws** — `codigo-de-comercio-de-guatemala` 10, `ley-general-de-electricidad` 8, `constitucion-politica-de-la-republica-de-guatemala` 5, `codigo-de-trabajo` 3, `codigo-procesal-civil-y-mercantil` 4, `ley-electoral-y-de-partidos-politicos` 4, `codigo-penal-de-guatemala` 1**). Root cause confirmed by inspection (not a re-extraction duplicate — these are distinct rows with different `kind`/`heading`): the extractor assigns `position` from a **single counter shared across all top-level sections regardless of `kind`** (e.g. `titulo`, `capitulo`, `seccion`, `subseccion` siblings under `parent_id = null` all land on `position 1, 2, 3...` independently, colliding). Fix is a `lex-extractor` change to scope the position counter per `(parent_id, kind)` — or per the law's actual reading order — not a data-cleanup task.

3. **`one_current_article_per_number` (11 article numbers across 3 laws** — `ley-organica-del-organismo-legislativo` 8, `ley-de-garantias-mobiliarias` 2, `ley-de-lo-contencioso-administrativo` 1**). Root cause confirmed by inspection: these are **distinct articles with completely different headings/content that the extractor numbered identically** (e.g. in `ley-organica-del-organismo-legislativo`, four different articles — "Publicaciones del Congreso", "Publicidad e información", "Disponibilidad de información en Internet", "Consulta electrónica" — are all stored as article `152`). This strongly suggests the source law uses suffixed numbering (`152 Bis`, `152 Ter`, `152 Quater`, a common pattern in Guatemalan legislation) and the extractor strips the suffix, collapsing distinct articles onto one `number`. Fix is a `lex-extractor` change to preserve `Bis`/`Ter`/`Quater`/etc. suffixes in `articles.number` — not a data-cleanup task.

**Recommendation for the extractor session:** open `lex-extractor` (`PDFtoSQLapp/pdf-sql-LEX/lex-extractor`) and address, in order: (a) the `Bis`/`Ter` numbering bug (#3 above, smallest blast radius), (b) the per-kind section-position counter bug (#2), (c) the content-gap investigation (#1, largest effort). Add a post-load step running `validate_law('<slug>')` per law and failing loudly so future re-extractions can't regress silently — this also covers the `paragraphs`/`sections` `UNIQUE` constraints added in 6.2a (extractor should target them with `ON CONFLICT`).

### Step 6.3 — Unit + e2e + GitHub Actions
- **Files:** `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- **Problem:** No CI; regressions ship silently.
- **Actions:**
  1. CI jobs on PR + main: `tsc --noEmit` → `next lint` → `vitest run` → `next build`. (RLS tests run locally / pre-release initially; add a supabase-CLI service container to CI as a follow-up if runtime is acceptable.)
  2. Playwright smoke (runs against local dev or preview URL): anonymous can read an article; login as free → yellow highlight saves and persists on reload; ⌘K search navigates to an article anchor; free user clicking note → paywall modal.
- **Success criteria:** CI green on main; a deliberately introduced type error fails the pipeline; smoke suite passes locally.

---

## Phase 7 — Module architecture for future Pro tools (design now, build later)

Goal: ensure OCR contract generation and legal/financial calculators can be added without touching the reading core. **No heavy implementation in this phase — conventions + one scaffold.**

### Step 7.1 — Module convention ✓ DONE (2026-06-12)
- **Files:** `docs/MODULES.md`, `lib/modules/README.md`
- **Problem:** Without a convention, future features will accrete into `lib/services` and the core bundle.
- **Actions:** Documented and scaffolded the rule set:
  - A module = `lib/modules/<name>/{service.ts, schemas.ts, README.md}` + routes under `app/api/v1/<name>/` + (if UI) routes under `app/(modules)/<name>/` — lazy-loaded, never imported by core reading components.
  - Module tables get a prefix (`calc_`, `contracts_`) and their own tracked migrations; RLS mandatory; tier gating via the same `is_pro()`/`WITH CHECK` pattern from Phase 1.
  - **Compute placement rule:** synchronous & light (labor-benefits calculator: pure TS math) → runs in the module's route handler on Vercel. Heavy/async/binary (OCR of IDs, PDF contract rendering) → a separate worker deployable (Railway — same box later reused for the Phase 13 jurisprudencia scraper) consuming a `jobs` table (Postgres `FOR UPDATE SKIP LOCKED` polling; no queue infra needed at this scale), with results written back and the client polling `/api/v1/<module>/jobs/[id]`. **Sensitive uploads (ID photos) go to a private Supabase Storage bucket with owner-only policies and a retention/auto-delete job — never into Postgres rows.**
- **Success criteria:** ✓ `docs/MODULES.md` committed and linked from `CLAUDE.md`; scaffold exists.

### Step 7.2 — Prove the pattern with the cheapest module: `calc-laboral` (skeleton only) ✓ DONE (2026-06-12)
- **Files:** `lib/modules/calc-laboral/{service.ts,schemas.ts,README.md,service.test.ts}`, `app/api/v1/calc-laboral/route.ts`
- **Problem:** Conventions untested are conventions ignored.
- **Actions:** `calculateIndemnizacion` — pure function for Art. 82 Código de Trabajo (indemnización por despido injustificado, 30/360 day-count prorating), zod schema (`IndemnizacionInput`/`IndemnizacionResult`), `POST /api/v1/calc-laboral` Pro-gated via `requirePro`. No DB table, no UI. Documented in `docs/API.md`.
- **Success criteria:** ✓ Unit tests for the formula (4 cases: free-user rejection, exact-year, 30/360 proration, zero-duration) — 67/67 vitest green. `requirePro` throws `AuthzError('PRO_REQUIRED')` → `apiHandler` maps to `403 PRO_REQUIRED` for free tokens (same mapping already covered for `cases`). `grep -r "lib/modules" app/leyes components lib/services/queries` → empty. `tsc`/`lint`/`build --turbopack` all green.

---

## Phase ordering vs. the existing roadmap

| Existing roadmap | This plan |
|---|---|
| Phase 10 (content) — in progress | Unaffected; Step 6.2 adds the validation gate that protects it |
| Phase 11 (redesign) — mostly done | Unaffected |
| **Phase 12 (deploy)** | **Blocked until Phase 1 (security) + Step 6.3 (CI) are green.** Phases 2–3 strongly recommended before deploy; 4–5 can ship after launch |
| Phase 13 (jurisprudencia) | Reuses the Railway worker + jobs-table pattern from Step 7.1 |
| Phase 14 (payments/Visanet) | Lands as a webhook writing `user_profiles.tier` via service role — safe because Phase 1 made tier admin/service-role-only writable |
| Phase 15 (mobile) | Consumes Phase 4's `/api/v1` + supabase-js for auth/reads; zero new backend work needed |

## Standing instructions for Claude Code

1. One migration file per step, numbered sequentially, idempotent where feasible (`IF EXISTS / OR REPLACE`).
2. Never widen an RLS policy or CHECK constraint to make a test pass — investigate the data instead.
3. Stop and request human action for: dashboard operations, credential rotation, the `app_metadata` admin migration (Step 1.1), and any destructive data operation.
4. After each phase: run the full test suite, `next build`, and update `CONTEXT.md` (repo) with what changed.
5. The security boundary is RLS + triggers. Server Actions and UI checks are UX. Repeat this in every PR description that touches authorization.
