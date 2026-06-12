# Module architecture (Phase 7)

LexGT's core is the legal-library reading experience: catalog, table of
contents, reading view, search, annotations, cases. Future Pro features
(labor calculators, contract generation, OCR, etc.) are "modules" — isolated
additions that never get imported by core reading components and never grow
the core bundle.

## What a module is

A module lives at `lib/modules/<name>/`:

```
lib/modules/<name>/
  schemas.ts   → zod input/output schemas
  service.ts   → pure/business logic, takes (actor, input) [+ db if needed]
  README.md    → what it does, the legal/business rules it encodes, status
```

Plus routes:

- API: `app/api/v1/<name>/route.ts` (and `[id]/route.ts` etc.), built with
  `apiHandler` from `lib/api/handler.ts` exactly like `app/api/v1/cases/`.
- UI (if any): `app/(modules)/<name>/` — a route group so module pages don't
  appear in `AppShell`'s reading-focused layout unless explicitly composed
  in. Lazy-load any heavy client components (`next/dynamic`).

**Hard rule:** nothing under `app/leyes/`, `components/` (reading-related),
or `lib/services/queries/` may import from `lib/modules/*`. A module may
depend on core (`lib/authz.ts`, `lib/action-result.ts`, `lib/types.ts`,
`lib/supabase-*`), never the other way around. Enforce with a grep before
merging a module: `grep -r "lib/modules" app/leyes components lib/services/queries`
should return nothing.

## Data

- Module tables get a prefix matching the module name: `calc_*`,
  `contracts_*`, `jobs_*` (shared by async modules — see below).
- Each module's tables get their own tracked migrations
  (`supabase/migrations/000N_<module>_*.sql`), same numbering sequence as
  everything else.
- **RLS is mandatory** on every module table — no exceptions, same as core
  tables (see `docs/SECURITY.md`).
- Tier gating follows the Phase 1 pattern: `public.is_pro()` /
  `public.current_user_tier()` in `WITH CHECK` for writes that are Pro-only,
  plus `requirePro(actor)` in the service layer as the UX-level check. RLS is
  the real boundary; the service check just gives a clean error before
  hitting the DB.

## Compute placement

- **Synchronous & light** (pure math/string transforms — e.g. a labor-law
  indemnización calculator): runs inline in the module's `app/api/v1/<name>/route.ts`
  handler on Vercel. No job table needed.
- **Heavy, async, or binary** (OCR of ID documents, PDF contract rendering,
  the Phase 13 jurisprudencia scraper): a separate worker deployable
  (Railway) that polls a shared `jobs` table with
  `SELECT ... FOR UPDATE SKIP LOCKED` — no queue infrastructure needed at
  this scale. The API route enqueues a row and returns its id; the client
  polls `/api/v1/<module>/jobs/[id]` for status/result.
- **Sensitive uploads** (ID photos, documents) go to a private Supabase
  Storage bucket with owner-only RLS policies and a retention/auto-delete
  job — never stored as bytes in Postgres rows.

## Example: `calc-laboral`

`lib/modules/calc-laboral/` is the first module, proving the pattern with the
cheapest possible case: a pure function (indemnización per Código de Trabajo
Art. 82), zod-validated input, Pro-gated via `requirePro`, exposed at
`app/api/v1/calc-laboral` (POST). No DB table, no UI yet — see
`lib/modules/calc-laboral/README.md`.
