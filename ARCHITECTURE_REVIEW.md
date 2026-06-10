# LexGT — Architecture & Functionality Brief (for external review)

> Purpose of this document: give a powerful model enough context to recommend
> improvements to the architecture/framework choices for **robustness,
> security, and maintainability**. It describes what exists today (as of
> 2026-06-09), not aspirations.

---

## 1. Product Summary

LexGT is a Guatemalan legal-library web app. Users browse and read structured
legislation (laws, codes, decrees — eventually jurisprudencia/case law),
highlight fragments of text, attach notes, organize work into "casos"
(case folders), get full-text search, and receive notifications when a law
they're tracking is reformed (amended).

**Tiers**
- **Free**: read all content, full-text search, single highlight color
  (yellow), reform notifications with a 1-month visibility window.
- **Pro**: multi-color highlights (yellow/green/blue/pink), notes on
  highlights, "casos" (folders that group highlighted articles across laws),
  jurisprudencia access (planned), 6-month reform-notification window.
- **Anonymous** (not logged in): read-only, search, 7-day reform window, no
  annotations.

Tier is per-user, stored in `user_profiles.tier` (`'free' | 'pro'`), with an
optional `tier_expires_at` for time-limited Pro grants.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Turbopack for dev+build) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme inline` design tokens in `globals.css`), Source Serif 4 + Geist/Geist Mono fonts |
| Backend | Supabase (managed Postgres + Auth + Storage not used yet) |
| DB access | `@supabase/supabase-js` + `@supabase/ssr` — two client factories (browser vs server, see §5) |
| Auth | Supabase Auth (email/password), session via cookies, refreshed in `middleware.ts` |
| Authorization | Postgres Row-Level Security (RLS) on every user-data table + a `public.is_admin()` SQL helper |
| Hosting (planned) | Vercel (Phase 12, not yet done) |
| Content pipeline | Separate sibling repo `pdf-sql-LEX/lex-extractor` — parses legal PDFs into idempotent SQL inserts (`ON CONFLICT DO NOTHING`) for `laws/sections/articles/paragraphs` |
| Search | Postgres full-text search (`tsvector` + GIN indexes + triggers, `to_tsvector('spanish', ...)`), exposed via `/api/search` |
| External MCP tooling | A local `context-sync-mcp` (stdio MCP server) writes session summaries to `CLAUDE.md` / `session-log.md` — dev workflow tool only, not part of the runtime app |

No state-management library, no ORM (raw `supabase-js` query builder everywhere),
no test suite currently exists.

---

## 3. Directory / Route Map

```
app/
  layout.tsx                        root layout, mounts <AppShell>, loads fonts
  page.tsx                          redirect → /leyes
  globals.css                       Tailwind v4 @theme tokens (navy/gold/paper/ink/hl palettes)
  api/search/route.ts               GET /api/search?q=&law=&limit= — full text search (articles+paragraphs, deduped)
  buscar/page.tsx                   full search-results page
  leyes/
    page.tsx                        catalog (server) — fetches laws, pending reforms, article counts
    LeyesIndexClient.tsx             catalog UI (hero, filters, grid/list, "reformas recientes")
    actions.ts                      mutations: saveAnnotation, deleteAnnotation, updateAnnotationNote,
                                     migrateAnnotations, markReformSeen, publishReform
    [slug]/page.tsx                 table of contents (section tree) for one law
    [slug]/[section_id]/            reading view for one section's articles
      page.tsx                       data loader + composition
      DocHeader.tsx, ChapterRail.tsx, Article.tsx, SectionNav.tsx,
      RightPanel.tsx, NotifBanner.tsx, types.ts
  casos/
    page.tsx, CasesClient.tsx       Pro-only "casos" list + create modal
    [id]/page.tsx                   single caso detail (annotations grouped)
    actions.ts                      createCase, deleteCase, addAnnotationToCase, removeAnnotationFromCase
  auth/
    actions.ts                      signOut()
    login/page.tsx, register/page.tsx
  admin/
    layout.tsx                      guard: redirects non-admins
    page.tsx, actions.ts            findArticle, createReformDraft, approveReform, setUserTier
    reformas/nueva/page.tsx, reformas/[id]/page.tsx, NewReformForm.tsx, TierForm.tsx

components/
  AppShell.tsx        server: fetches user/tier/laws/cases/pending-reforms, composes ShellClient
  ShellClient.tsx      client: app shell layout (TopBar + Sidebar + main), owns search/paywall modal state
  TopBar.tsx           navy top bar: brand, search trigger (⌘K), tier badge / upgrade CTA, user menu
  SidebarContent.tsx   nav: "Todas las leyes", "Actualizaciones", law list w/ reform dots, "Mis casos"
  SearchOverlay.tsx    ⌘K command-palette search (debounced fetch to /api/search)
  PaywallModal.tsx     Free vs Pro feature comparison modal
  LawCard.tsx          law card (grid/list) + embedded ReformModal (reform-review/migration flow)
  ReformModal.tsx       reform diff viewer + per-article "migrate annotations" decision UI
  ParagraphHighlighter.tsx  text-selection → highlight/note/case popover (client, uses portal)
  Header.tsx           LEGACY, unused (superseded by AppShell/ShellClient) — candidate for deletion
  icons.tsx            small inline SVG icon set

lib/
  supabase.ts          browser client (createBrowserClient)
  supabase-server.ts   server client (createServerClient, cookie-bound) — server-only
  get-user-tier.ts     getUserTier(supabase) → 'free' | 'pro', server-only
  get-pending-reforms.ts  getPendingReforms(supabase, tier, userId) — tier-based reform visibility window
  get-article-counts.ts  per-law article counts (parallel count queries)
  case-colors.ts       color token maps for cases + highlights
  section-kind.ts      kind→label map + sectionLabel() helper
  types.ts             all shared TS types (mirrors DB rows)

middleware.ts          refreshes Supabase session cookie; gates /admin/* by user_metadata.role==='admin'

supabase/
  migrations/0001-0008  see §4
  seed.sql, seeds/      seed data (Código Civil, test reform)
```

---

## 4. Data Model (Postgres / Supabase)

All tables live in `public` schema. RLS is enabled on every table that holds
user data; content tables (`laws/sections/articles/paragraphs`) are publicly
readable.

### Content tables
- **`laws`**: `id (uuid pk), slug (unique), short_name, full_name, decree, enacted_on, is_active, created_at`
- **`sections`**: hierarchical tree (self-referencing `parent_id`) representing
  libro/título/capítulo/sección/parte/párrafo/subsección/disposiciones nodes.
  `kind` is a checked enum (Spanish terms), `position` orders siblings.
  *(Note: DB check constraint from migration 0001 only allows
  `'libro','titulo','capitulo','seccion','parte'` — but `lib/types.ts` and
  CLAUDE.md describe a wider set including `parrafo/subseccion/articulo/disposiciones`.
  This may be a drift between the DB constraint and the app's type model —
  worth flagging.)*
- **`articles`**: `law_id, section_id (nullable), number, heading, position,
  is_current, version, superseded_by, effective_on` + versioning columns added
  in 0002 (`version_number, superseded_at, previous_version_id, reform_id`).
  Articles are versioned by **copy-on-write**: a reform creates a new article
  row (`is_current=true`, `previous_version_id` → old row), flips the old row
  to `is_current=false`.
- **`paragraphs`**: `article_id, position, text` — the actual annotatable text
  unit. Each has its own `search_vector`.

### Reform / versioning
- **`law_reforms`**: `law_id, title, description, published_at (nullable while draft), status ('draft'|'published')`.
- **`reform_draft_articles`** (0003): staging table for admin-authored reform
  content before publish — admin-only RLS.
- **`reform_notifications`**: per-user "have I seen this reform" rows
  (`user_id, reform_id, seen_at`).
- **`getPendingReforms(supabase, tier, userId)`** computes, per law, which
  reforms are "pending" for a given user: reforms published within a
  tier-based window (anonymous 7 days / free 1 month / pro 6 months) that the
  user hasn't marked seen via `reform_notifications`.

### User data (RLS: owner-only via `auth.uid() = user_id`)
- **`annotations`**: `user_id, paragraph_id, article_id, color (yellow|green|blue|pink, default yellow), char_start, char_end, note (nullable), is_pinned_to_old_version, created_at, updated_at`.
  - `char_start`/`char_end` are character offsets into `paragraphs.text`.
  - Free tier is restricted to `color='yellow'` and `note=null` — enforced in
    the **server action** (`saveAnnotation` / `updateAnnotationNote` in
    `app/leyes/actions.ts`), not at the DB/RLS level.
- **`cases`**: `user_id, title, description, color, created_at, updated_at` — Pro-only "carpetas".
- **`case_annotations`**: many-to-many `case_id ↔ annotation_id`, RLS via
  `exists (select 1 from cases where cases.id = case_annotations.case_id and cases.user_id = auth.uid())`.
- **`user_profiles`**: `user_id (pk, fk auth.users), tier, tier_expires_at, tier_source, created_at`.
  Auto-created via `handle_new_user()` trigger (security definer) on signup.
  Owner can read/update own row (update is unrestricted by column — i.e. RLS
  doesn't prevent a user from setting their own `tier='pro'` via a direct
  PostgREST call, only the UI doesn't expose this — **potential
  privilege-escalation gap**, see §8).

### Collections
- **`law_collections`** / **`law_collection_items`** (0008): curated groupings
  of laws for a "browse mode" selector (e.g. "Derecho Civil", "Derecho Penal").
  Public read, admin write. 7 collections seeded. "Casos" browse-mode is
  derived at runtime from `case_annotations`, not stored.

### Admin
- **`public.is_admin()`**: `SELECT (auth.jwt()->'user_metadata'->>'role') = 'admin'`
  — SQL function used in RLS policies (admin write access to `law_reforms`,
  `reform_draft_articles`, `user_profiles`, `law_collections`). Defined in
  `public` because Supabase disallows `CREATE FUNCTION` in `auth` schema.
  Admin status is set via `user_metadata.role='admin'` in the Supabase
  dashboard (manual, out-of-band).

### Search (0007)
- `articles.search_vector` / `paragraphs.search_vector` (`tsvector`,
  Spanish config), populated by `BEFORE INSERT OR UPDATE` triggers, indexed
  with GIN. `/api/search` runs `textSearch(...)` against both tables in
  parallel and merges/dedupes results by `article_id`.

---

## 5. Auth, Sessions & Authorization

- **Two Supabase client factories** (deliberate split, documented as a "key
  decision" because `next/headers` breaks Client Components):
  - `lib/supabase.ts` → `createBrowserClient()` — used in Client Components
    (e.g. `ParagraphHighlighter`'s "load my cases" fetch).
  - `lib/supabase-server.ts` → `createServerClient()` bound to
    `next/headers` cookies — used in Server Components and Server Actions.
- **`middleware.ts`**: runs on every request (matcher excludes static assets),
  calls `supabase.auth.getUser()` to refresh the session cookie, and
  redirects away from `/admin/*` if `user.user_metadata.role !== 'admin'`.
  `app/admin/layout.tsx` re-checks the same condition (defense in depth).
- **Tier resolution**: `getUserTier(supabase)` — anonymous → `'free'`
  (note: the *function* returns 'free' for logged-out users, but the app
  layer (`AppShell`) maps logged-out users to a third pseudo-tier
  `'anonymous'` for UI purposes via `UserTier = 'anonymous'|'free'|'pro'` in
  `get-pending-reforms.ts`. `lib/types.ts Tier` is only `'free'|'pro'`. Two
  overlapping tier types exist — see §8).
- **Authorization enforcement is split across three layers** with varying
  consistency:
  1. RLS policies (DB) — strongest, applies to all PostgREST/`supabase-js`
     calls regardless of client.
  2. Server Action checks (`getUserTier` + `throw new Error(...)`) — e.g.
     `saveAnnotation` blocking non-yellow colors for free tier,
     `requirePro()` in `app/casos/actions.ts`.
  3. UI gating (paywall modals, hidden tabs) — cosmetic only.

---

## 6. Key Flows

### Reading
`/leyes/[slug]/[section_id]` (server component) loads, in parallel: the law,
the section, its current articles+paragraphs, parent section, sibling
sections (for prev/next chapter nav), `law_reforms` for the law, the user's
existing highlight annotations for these articles, and (if Pro) all
note-bearing annotations across the whole law (for the "Notas" tab). Renders
`ChapterRail` (TOC for current chapter) + `Article[]` (each paragraph wrapped
in `ParagraphHighlighter`) + `RightPanel` (tabs: Notas/Caso/Concordancias/Historial).

### Highlighting / Annotation
`ParagraphHighlighter` computes character offsets via `document.createTreeWalker`
on mouseup, shows a floating popover (portal to `document.body`) to pick a
color (1 color for free, 4 for Pro) and save via the `saveAnnotation` server
action. Clicking an existing highlight opens a second popover with note
editing (Pro), "save to caso" (fetches user's cases client-side via the
browser Supabase client), and delete.

### Reform / versioning flow
Admin drafts a reform (`createReformDraft`) → `approveReform` (reuses the
draft's `reform_id`) or `publishReform` (creates a new `law_reforms` row,
copy-on-write new `articles` rows with `previous_version_id`, marks old
articles `is_current=false`). When a user views a law with a recent reform,
`LawCard`/`ReformModal` offers to **migrate or delete** their highlights/notes
on the now-superseded article version (`migrateAnnotations` — copies
annotation text into the note as a blockquote on the new article's first
paragraph, since char offsets don't carry over across versions).

### Search
`SearchOverlay` (⌘K) debounces (250ms) calls to `/api/search?q=&limit=8`,
navigates to `/leyes/{law_slug}/{section_id}#articulo-{number}`. `/buscar`
is the full results page (same API).

### Casos (Pro)
`cases` + `case_annotations` many-to-many. `addAnnotationToCase` /
`removeAnnotationFromCase` are Server Actions gated by `requirePro()`.

---

## 7. Design System

Tailwind v4 `@theme inline` tokens in `app/globals.css`:
- **navy** scale (`navy-50…900`) — primary brand/UI chrome color
- **gold** scale (`gold-50…700`) — accent/Pro/CTA color
- **paper / paper-2** — background (warm off-white, "legal paper" feel)
- **ink** scale — text colors
- **hl-yellow/green/blue/pink** — highlight colors (also in `lib/case-colors.ts`
  as `HL_TOKENS`)
- Fonts: `Source Serif 4` (body/article text, legal-document feel) +
  Geist/Geist Mono (UI chrome)
- Custom `@keyframes lexpulse` / `.animate-pulse-gold` for reform-alert dots

---

## 8. Known Gaps, Tech Debt & Open Questions for Review

These are the areas where I'd want architectural input:

1. **No automated tests** (unit/integration/e2e). Server Actions contain
   business-critical authorization logic (tier checks) with no test coverage.
2. **`user_profiles` RLS** allows owner `UPDATE` with no column restriction —
   need to verify a user can't `PATCH` their own `tier` to `'pro'` via direct
   PostgREST call (only the `setUserTier` admin action and the UI prevent
   this today). Likely needs a trigger or column-level policy / generated
   column.
3. **Tier type duplication**: `lib/types.ts` `Tier = 'free'|'pro'` vs
   `lib/get-pending-reforms.ts` `UserTier = 'anonymous'|'free'|'pro'`. Components
   juggle both, with manual mapping (`tier === 'pro' ? 'pro' : 'free'`).
   Candidate for unification.
4. **`sections.kind` CHECK constraint** (migration 0001) appears narrower
   than the values used by `lib/types.ts`/content extractor
   (`parrafo, subseccion, articulo, disposiciones` not in the original
   constraint — may have been altered later by an ad-hoc `ALTER TABLE`
   recorded only in `.claude/settings.local.json` history, not as a tracked
   migration file). Schema-drift risk between tracked migrations and actual
   DB state.
5. **Annotation char-offset fragility**: highlights are anchored to raw
   character offsets in `paragraphs.text`. Any edit to article text
   (corrections, re-extraction) silently invalidates/misaligns existing
   annotations. The reform-migration flow only handles the *new-version*
   case, not arbitrary content edits/typo fixes.
6. **No automated content pipeline → app integration tests**: the extractor
   (separate repo) generates SQL independently; nothing verifies that newly
   inserted laws/sections/articles satisfy the app's assumptions (e.g.
   non-null `heading`, valid `kind`, `position` uniqueness within a parent).
7. **Server Action error handling**: most actions `throw new Error(message)`
   directly from Postgres error strings — these propagate to the client as
   generic Next.js error boundaries; no structured error codes for the UI to
   branch on (e.g. distinguishing "not authenticated" vs "pro required" vs
   "DB error").
8. **No rate limiting / abuse protection** on `/api/search` or Server Actions.
9. **Legacy dead code**: `components/Header.tsx` is explicitly documented as
   unused/superseded but still present in the tree.
10. **No CI pipeline** (lint/typecheck/build run manually via `npm run build --turbopack`).
11. **Secrets**: `.env.local` holds Supabase URL + publishable (anon) key only
    (not committed) — service-role key is not used anywhere in the Next.js
    app (good), but the separate extractor repo connects directly to Postgres
    via the session pooler with a DB password stored in
    `.claude/settings.local.json` command-allowlist entries (visible in plain
    text in that file) — worth a secrets-hygiene pass.
12. **Deployment**: Phase 12 (Vercel deploy) not yet done — no production
    environment exists yet, so this is a good time to influence
    infra/observability decisions (env management, logging, error tracking).
13. **Internationalization**: all UI copy is hardcoded Spanish strings inline
    in components — fine for a GT-only product today, but worth noting if
    multi-locale is ever a goal.
14. **Jurisprudencia (Phase 13)** and **payments (Phase 14, Visanet)** are
    unbuilt — current schema/RLS has no tables for case-law documents or
    subscription/payment records, so the tier system (`tier_source`,
    `tier_expires_at`) is the only existing scaffolding for paid plans.

---

## 9. Roadmap (for context)

- **Phase 11** (current, mostly done): visual redesign (navy/gold/paper design
  system, AppShell/reader/search/paywall UI) — functional logic largely
  unchanged from pre-redesign state.
- **Phase 12**: deploy to Vercel.
- **Phase 13**: jurisprudencias (case law) — separate Railway + Playwright
  scraping pipeline.
- **Phase 14**: payments via Visanet (Guatemalan payment processor).
- **Phase 15**: React Native mobile app (implies an eventual API layer beyond
  direct Supabase client calls from a web app — relevant to any "make it a
  proper API" recommendation).
