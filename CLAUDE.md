# LexGT — CLAUDE.md

## Project Summary

LexGT es una biblioteca legal guatemalteca: los usuarios navegan y leen legislación estructurada (leyes, códigos, decretos, jurisprudencias), marcan fragmentos, agregan notas y organizan trabajo en "casos". Stack: Next.js 15 (App Router, Turbopack), Supabase (PostgreSQL + Auth + RLS), Tailwind CSS v4, TypeScript. Dos tiers: Free (lectura + búsqueda + 1 color de highlight) y Pro (multi-color highlights, notas, casos, jurisprudencias, notificaciones de reformas).

---

## Current Goal

**Remediation plan — `LEXGT_EXECUTION_PLAN.md`** (en progreso, una fase por sesión)

Phase 11 (rediseño completo) está commiteado y `npm run build --turbopack` pasa.
Antes de Phase 12 (deploy), se ejecuta `LEXGT_EXECUTION_PLAN.md`:

- ✓ **Phase 0 — Baseline & hygiene**: `0009_schema_reconciliation.sql` (sections.kind
  ampliado a 9 valores + 8 índices duplicados eliminados), `supabase/SCHEMA_SNAPSHOT.md`
  generado, `components/Header.tsx` eliminado (sin imports), depcheck limpio,
  secrets hygiene en lex-extractor verificado (sin hallazgos).
- ✓ **Phase 1 — Security patching (P0, bloquea deploy)**: mover admin a
  `app_metadata` (E1 — afecta también `admin_find_user_by_email`, no solo `is_admin()`),
  bloquear self-update de `user_profiles.tier` (E2), `current_user_tier()`/`is_pro()`
  + WITH CHECK en annotations/cases (E3), `docs/SECURITY.md`. Migraciones
  `0010`-`0013` aplicadas a prod vía Supabase MCP.
- ✓ **Phase 2 — Authorization & error-handling unification**: tipo `Tier`
  unificado (`'anonymous'|'free'|'pro'` + `AuthedTier`), `lib/authz.ts`
  (`getActor`/`requireUser`/`requirePro`/`requireAdmin`/`AuthzError`),
  `lib/action-result.ts` (`ActionResult<T>`/`runAction`/`ActionError`).
  Las tres `actions.ts` (leyes, casos, admin) y sus consumidores cliente
  reescritos para devolver `ActionResult` en vez de `throw new Error`.
- ▸ **Phase 3 — Service layer extraction** (en progreso):
  - ✓ Step 3.1 — `lib/services/annotations.ts` (saveAnnotation,
    updateAnnotationNote, deleteAnnotation, migrateAnnotations,
    markReformSeen) con schemas Zod + Vitest.
  - ✓ Step 3.2 — `lib/services/cases.ts`, `lib/services/reforms.ts`
    (publishReform, createReformDraft, approveReform — comparten
    `supersedeArticle`), `lib/services/admin.ts` (findArticle,
    setUserTier). `app/leyes/actions.ts`, `app/casos/actions.ts`,
    `app/admin/actions.ts` son wrappers delgados.
  - [ ] Step 3.3 — read-path query modules (`lib/services/queries/`).
- [ ] Phases 4-7 (API v1, anchoring v2, testing/CI, module architecture)
  — ver `LEXGT_EXECUTION_PLAN.md`.

Fases del roadmap original siguen después: Phase 12 (deploy Vercel), Phase 13
(jurisprudencias — Railway + Playwright), Phase 14 (pagos Visanet), Phase 15 (React Native).

---

## Security Invariants

Ver `docs/SECURITY.md` para la matriz completa tabla × operación × política RLS.

- **RLS + triggers son la única frontera de seguridad real.** Server Actions
  y checks de UI son UX, no seguridad — son evitables con `curl` + el anon key.
- **Admin role vive en `app_metadata`**, nunca en `user_metadata` (autoescribible
  por el usuario). `is_admin()`, `admin_find_user_by_email()`, middleware,
  `app/admin/layout.tsx` y `app/admin/actions.ts` leen `app_metadata.role`.
- **Tier enforcement vive en `WITH CHECK`**, no solo en Server Actions.
  `public.is_pro()` / `public.current_user_tier()` son la fuente de verdad;
  cualquier tabla nueva escribible por usuarios y sensible al tier debe
  replicar este patrón en sus políticas RLS.
- **`user_profiles.tier`/`tier_expires_at`/`tier_source`** solo son escribibles
  por admin (política + trigger `prevent_tier_self_update`).

---

## Last Session

Ejecutado Phase 3, Steps 3.1 y 3.2 de `LEXGT_EXECUTION_PLAN.md` (Step 3.3
queda pendiente).

- **Setup**: instalado `zod` y `vitest` (`npm test` → `vitest run`),
  `vitest.config.ts` con alias `@` y stub de `server-only` (no resoluble en
  Node) en `lib/test/empty-module.ts`. Helper compartido de mocks de Supabase
  en `lib/test/mock-supabase.ts` (`makeBuilder`/`makeDb`, query builder
  encadenable + `rpc`).
- **Step 3.1**: nuevo `lib/services/annotations.ts` — `saveAnnotation`,
  `updateAnnotationNote`, `deleteAnnotation`, `migrateAnnotations`,
  `markReformSeen`, cada uno con su schema Zod (`SaveAnnotationInput`, etc.)
  y firma `(db, actor, input)`. `app/leyes/actions.ts` ahora son wrappers
  delgados: `getActor` → `Schema.parse` → service → `runAction`. 15 tests en
  `lib/services/annotations.test.ts`.
- **Step 3.2**: mismo patrón para `lib/services/cases.ts` (createCase,
  deleteCase, addAnnotationToCase, removeAnnotationFromCase),
  `lib/services/reforms.ts` (publishReform, createReformDraft, approveReform
  — todas comparten el helper privado `supersedeArticle` para no duplicar la
  lógica de "nueva versión de artículo + paragraphs + marcar superseded"),
  y `lib/services/admin.ts` (findArticle, setUserTier). `app/casos/actions.ts`
  y `app/admin/actions.ts` reescritos como wrappers delgados (~60 líneas cada
  uno); `publishReform` se movió de `app/leyes/actions.ts` a
  `lib/services/reforms.ts` (el wrapper sigue en `leyes/actions.ts`, sigue
  pareciendo código muerto). 20 tests adicionales en
  `lib/services/{cases,reforms,admin}.test.ts` (35 totales).

`npx vitest run` → 35/35 verde. `npx tsc --noEmit` limpio. `npm run build
--turbopack` pasa (14 rutas). Verificado por grep: `lib/services/` no importa
`next/*`; ningún `actions.ts` contiene `throw new Error(`. Smoke test con
servidor dev limpio (`.next` borrado): `/leyes`→200, `/casos`→200,
`/admin`→307 (redirect esperado para no-admin).

Próxima sesión: Step 3.3 (read-path query modules —
`lib/services/queries/{laws,reading,search}.ts`, refactor de
`app/leyes/page.tsx`, `[slug]/page.tsx`, `[slug]/[section_id]/page.tsx`,
`app/api/search/route.ts`).

---

## Key Decisions

1. **`supabase.ts` vs `supabase-server.ts` separados** — `next/headers` rompe Client Components. Browser client en `lib/supabase.ts`, server client en `lib/supabase-server.ts`. No mezclar.
2. **`sections.kind` en español** — valores: `libro/titulo/capitulo/seccion/parte/parrafo/subseccion/articulo/disposiciones`. Columna es `heading`, no `title`.
3. **`public.is_admin()`** — en schema `public`, no `auth` (Supabase no permite CREATE en `auth`).
4. **Server Actions para mutaciones** — signOut, saveAnnotation, deleteAnnotation, migrateAnnotations, markReformSeen, publishReform, createReformDraft, approveReform, setUserTier.
5. **`approveReform` ≠ `publishReform`** — approveReform reutiliza el reform_id del borrador. publishReform crearía un duplicado.
6. **Tooltip via portal** — `createPortal(…, document.body)` para evitar `<div>` hijo de `<p>` (hydration error).
7. **Búsqueda** — `plainto_tsquery('spanish', q)` sobre `tsvector`. Articles + paragraphs en paralelo, deduplicados por `article_id`. IDs son strings (UUID).
8. **Modos de navegación — colecciones curadas** — `law_collections` + `law_collection_items` con RLS pública. `law_id` es UUID (no integer). Modos "Caso" se derivan en runtime desde `case_annotations`, sin tabla adicional. Modo activo guardado en localStorage.
9. **Ventana de reformas por tier** — anónimo 7 días, free 1 mes, pro 6 meses.
10. **Content Extractor** — proyecto separado en `PDFtoSQLapp/pdf-sql-LEX/lex-extractor`. Genera SQL idempotente (`ON CONFLICT DO NOTHING`). Ver `SCHEMA_CONTEXT.md` en ese repo para bugs pendientes. Conexión: Session Pooler en `aws-1-us-east-1.pooler.supabase.com:5432`.
11. **Admin role** — `user_metadata.role = 'admin'` en Supabase dashboard. Doble protección: middleware + layout.

---

## Token Rules

- Credenciales en `.env.local` (no commiteado). Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Nunca usar `Header.tsx` — está reemplazado por `AppShell`/`ShellClient`. El header vive dentro de `ShellClient`.
- `getUserTier(supabase)` es server-only — recibe el cliente existente, no crea uno nuevo.
- Las migraciones van en `supabase/migrations/` con nombre `000N_descripcion.sql`. Ya aplicadas hasta `0008_collections.sql`.
- Seeds idempotentes: siempre usar `ON CONFLICT DO NOTHING` o `INSERT … WHERE NOT EXISTS`.
- `dev`: `npm run dev` (Turbopack). Build: `npm run build --turbopack`.

---

## File Map

```
app/
  layout.tsx                    → root layout — monta <AppShell>
  page.tsx                      → redirect a /leyes
  globals.css
  api/search/route.ts           → GET /api/search?q=&law=&limit= (full-text)
  buscar/page.tsx               → página de resultados full-text
  leyes/
    page.tsx                    → lista de leyes + badges de reformas pendientes
    actions.ts                  → saveAnnotation, deleteAnnotation, updateAnnotationNote,
                                   migrateAnnotations, markReformSeen, publishReform
    [slug]/page.tsx             → tabla de contenidos (árbol de secciones)
    [slug]/[section_id]/page.tsx → vista de lectura: artículos + párrafos + highlights
  casos/
    page.tsx                    → lista de casos (guard Pro)
    CasesClient.tsx             → modal "Nuevo caso" + lista
    actions.ts                  → createCase, deleteCase, addAnnotationToCase, removeAnnotationFromCase
    [id]/page.tsx               → detalle de caso
  auth/
    actions.ts                  → signOut()
    login/page.tsx
    register/page.tsx
  admin/
    layout.tsx                  → guard admin
    page.tsx
    actions.ts                  → findArticle, createReformDraft, approveReform, setUserTier
    reformas/nueva/page.tsx
    reformas/[id]/page.tsx

components/
  AppShell.tsx                  → Server Component: fetcha user+laws, compone ShellClient+SidebarContent
  ShellClient.tsx               → Client Component: h-screen layout (header + sidebar + content + right panel)
  SidebarContent.tsx            → Server Component: lista de leyes, Jurisprudencias badge, link /casos
  Header.tsx                    → LEGACY — no usar, reemplazado por AppShell/ShellClient
  SearchBar.tsx                 → Client Component: form → /buscar?q=; mobile: lupa icon
  ParagraphHighlighter.tsx      → selección de texto, tooltip, highlights, "Guardar en caso"
  LawCard.tsx                   → card de ley con badge de reformas + modal
  ReformModal.tsx               → modal de reforma con IntersectionObserver

lib/
  supabase.ts                   → createClient() — browser ONLY
  supabase-server.ts            → createServerSupabaseClient() — server only
  get-user-tier.ts              → getUserTier(supabase): Promise<Tier> — server-only
  types.ts                      → Law, Section, Article, Paragraph, Annotation, Case,
                                   LawCollection, LawCollectionItem, Tier, UserProfile, etc.

middleware.ts                   → refresca cookie; protege /admin/* (redirige si no es admin)

supabase/
  migrations/
    0001_initial_schema.sql     → laws, sections, articles, paragraphs, annotations + RLS
    0002_versioning.sql         → versioning en articles, law_reforms, reform_notifications
    0003_reform_status.sql      → status en law_reforms, reform_draft_articles, public.is_admin()
    0004_user_profiles.sql      → user_profiles + trigger on_auth_user_created
    0005_annotations_color_note.sql → color NOT NULL DEFAULT 'yellow', note nullable
    0006_cases.sql              → cases + case_annotations (many-to-many, FK cascade)
    0007_search.sql             → search_vector tsvector, índices GIN, triggers, backfill
    0008_collections.sql        → law_collections + law_collection_items + 7 colecciones seeded
  seed.sql                      → Código Civil completo
  seeds/
    test_reform.sql             → reforma ficticia para pruebas
```

**Archivos de contexto en este repo (no borrar):**
- `CONTEXT.md` — fuente original de este CLAUDE.md; contiene checklist de 121 leyes y estado detallado por fase. Mantener actualizado en paralelo o migrar completamente aquí.
