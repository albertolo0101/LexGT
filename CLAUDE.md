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
- ✓ **Phase 3 — Service layer extraction**:
  - ✓ Step 3.1 — `lib/services/annotations.ts` (saveAnnotation,
    updateAnnotationNote, deleteAnnotation, migrateAnnotations,
    markReformSeen) con schemas Zod + Vitest.
  - ✓ Step 3.2 — `lib/services/cases.ts`, `lib/services/reforms.ts`
    (publishReform, createReformDraft, approveReform — comparten
    `supersedeArticle`), `lib/services/admin.ts` (findArticle,
    setUserTier). `app/leyes/actions.ts`, `app/casos/actions.ts`,
    `app/admin/actions.ts` son wrappers delgados.
  - ✓ Step 3.3 — `lib/services/queries/laws.ts` (`getLawCatalog`),
    `lib/services/queries/reading.ts` (`getLawToc`, `getSectionReadingBundle`,
    `getLawMeta`, `getSectionMeta`), `lib/services/queries/search.ts`
    (`searchArticles`). `app/leyes/page.tsx`, `[slug]/page.tsx`,
    `[slug]/[section_id]/page.tsx`, `app/buscar/page.tsx` y
    `app/api/search/route.ts` consumen estos módulos — sin `.from(`.
- ✓ **Phase 4 — Versioned API layer (mobile-readiness)**:
  - ✓ Step 4.1 — `lib/supabase-bearer.ts` (tercera factory de cliente,
    `Authorization: Bearer <token>`, RLS aplica vía JWT).
  - ✓ Step 4.2 — `lib/api/handler.ts` (`apiHandler`: bearer → `getActor` →
    zod parse → servicio → `{ok,data|code}` + status HTTP), `app/api/v1/{me,
    annotations,annotations/[id],cases,cases/[id]}/route.ts`,
    `lib/services/queries/cases.ts` (`listCases`, `getCaseDetail`),
    `docs/API.md`.
  - ✓ Step 4.3 — `lib/api/rate-limit.ts` (Upstash Redis, sliding window,
    fail-open): `searchLimiter` 30/min por IP en `/api/search`, `apiLimiter`
    60/min por `actor.userId` en `lib/api/handler.ts`. Código `RATE_LIMITED`
    → 429 en `lib/action-result.ts`.
- ✓ **Phase 5 — Annotation anchoring v2 (data integrity)**:
  - ✓ Step 5.1 — `0014_annotation_anchors.sql` (`quote/prefix/suffix/
    text_checksum/anchor_status` en `annotations`, backfill desde
    `paragraphs.text` actual; aplicada a prod — 14/14 `anchored`).
  - ✓ Step 5.2 — `lib/anchoring.ts` (`textChecksum` SHA-256, `resolveAnchor`:
    checksum → prefix+quote+suffix → quote único → `orphaned`).
    `saveAnnotation` captura quote/prefix/suffix del cliente y calcula el
    checksum server-side. `getSectionReadingBundle` resuelve cada highlight
    contra el texto actual, persiste re-anclajes de forma perezosa, excluye
    `orphaned` del render inline y los muestra en el panel "Notas" bajo
    "Texto modificado". `ParagraphHighlighter` envía quote + 32 chars de
    contexto al guardar.
  - ✓ Step 5.3 — `lib/services/admin.ts` (`correctParagraphText`): admin-only,
    actualiza `paragraphs.text` y re-ancla todas las anotaciones de ese
    párrafo, retorna `{reanchored, orphaned}`. Wrapper en
    `app/admin/actions.ts`.
- [ ] **Phase 6 — Testing & CI** (en progreso):
  - ✓ Step 6.1 — `supabase/tests/database/rls.test.sql` (pgTAP, 15/15 verde
    vía `npm run test:rls` contra `db reset` desde cero, migraciones
    0001-0018 + seed). Matriz E1/E2/E3 completa: admin solo vía
    `app_metadata`, `user_profiles.tier` no auto-actualizable, anotaciones
    color/nota gateadas por tier, `cases` Pro-only, aislamiento cross-user
    en annotations/cases/reform_notifications/user_profiles.
  - ✓ Step 6.2a — `0016_dedupe_paragraphs.sql` (7,369 filas duplicadas de
    `paragraphs` eliminadas, 3 anotaciones re-apuntadas, constraint
    `UNIQUE (article_id, position)` agregada — `paragraphs_position_unique`
    ahora 0 fallos en las 15 leyes), `0017_validate_law_tolerate_derogado.sql`
    (`articles_have_paragraphs` tolera `heading ILIKE '%derogad%'`),
    `0018_grant_table_privileges.sql` (gap de schema-reconciliation: grants
    `anon/authenticated/service_role` faltaban en `db reset` desde cero,
    prod ya los tenía vía provisioning de Supabase). Las 3 aplicadas a prod.
  - ⚠️ Step 6.2 (resto) — **fallos restantes son 100% extractor-scope**, ver
    `LEXGT_EXECUTION_PLAN.md` §6.2: ~1,007 artículos sin párrafos (huecos de
    contenido reales), 35 pares `sections` con `position` duplicado en 7
    leyes (bug: contador de `position` compartido entre `kind`s en
    `parent_id=null`), 11 números de artículo duplicados en 3 leyes (bug:
    extractor descarta sufijos `Bis/Ter/Quater`, ej. 4 artículos distintos
    todos como "152" en `ley-organica-del-organismo-legislativo`). **No
    marcar 6.2 como hecho** — diferido a la sesión de fix del extractor
    (después de Phase 7). **Bloquea Phase 12 (deploy)** igual que Step 6.3.
  - ✓ Step 6.3 — `.github/workflows/ci.yml` (tsc → lint → vitest → build,
    placeholder Supabase env vars). `playwright.config.ts` +
    `tests/e2e/smoke.spec.ts`: dos tests anónimos pasan localmente
    (lectura de artículo, ⌘K → resultado → `#articulo-N`); dos tests de
    usuario free (highlight persiste, panel Notas → paywall) están escritos
    pero `test.skip` salvo que se definan `PLAYWRIGHT_FREE_USER_EMAIL`/
    `PLAYWRIGHT_FREE_USER_PASSWORD` — **requiere que Beto cree una cuenta
    free de prueba** (no se ejecutan en CI todavía, solo local vía `npm run
    test:e2e`).
- ✓ **Phase 7 — Module architecture (design + scaffold)**:
  - ✓ Step 7.1 — `docs/MODULES.md` (convención: `lib/modules/<name>/{service.ts,
    schemas.ts, README.md}` + `app/api/v1/<name>/`; nunca importado desde
    `app/leyes`/`components`/`lib/services/queries`; tablas con prefijo +
    RLS + `is_pro()` igual que Phase 1; regla de cómputo síncrono-en-route
    vs. worker Railway+`jobs` table para async/pesado).
    `lib/modules/README.md` (scaffold).
  - ✓ Step 7.2 — `lib/modules/calc-laboral/` (`calculateIndemnizacion`, Art.
    82 Código de Trabajo, conteo 30/360, zod `IndemnizacionInput`/
    `IndemnizacionResult`, 4 tests unitarios), `POST /api/v1/calc-laboral`
    (Pro-gated vía `requirePro`, sin tabla/UI). Documentado en `docs/API.md`.
    `grep -r "lib/modules" app/leyes components lib/services/queries` vacío.

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

**Phase 7 completa** (module architecture — diseño + scaffold):

- ✓ Step 7.1 — `docs/MODULES.md`: convención de módulos (`lib/modules/<name>/
  {service.ts, schemas.ts, README.md}` + `app/api/v1/<name>/`), regla dura de
  aislamiento (nunca importado desde `app/leyes`/`components`/
  `lib/services/queries`), tablas con prefijo + RLS + `is_pro()` (mismo
  patrón Phase 1), regla de cómputo (síncrono-en-route vs. worker
  Railway+`jobs` table para async/pesado, uploads sensibles a Storage
  privado). `lib/modules/README.md` scaffold.
- ✓ Step 7.2 — `lib/modules/calc-laboral/`: `calculateIndemnizacion` (Art. 82
  Código de Trabajo, indemnización por despido injustificado, conteo 30/360),
  zod `IndemnizacionInput`/`IndemnizacionResult`, `service.test.ts` (4 casos:
  rechazo free, año exacto, prorrateo 30/360, duración cero). `POST
  /api/v1/calc-laboral` vía `apiHandler` + `requirePro` (sin tabla, sin UI).
  Documentado en `docs/API.md`. Verificado: `tsc --noEmit`, `npm run test`
  (67/67), `npx eslint`, `npm run build --turbopack` todos verdes;
  `grep -r "lib/modules" app/leyes components lib/services/queries` vacío.

Próxima sesión: **sesión de fix del extractor**
(`PDFtoSQLapp/pdf-sql-LEX/lex-extractor`) — sufijos `Bis/Ter/Quater` en
`articles.number`, contador de `position` por `(parent_id, kind)` en
`sections`, investigar los ~1,007 artículos sin párrafos, agregar un
post-load step que corra `validate_law()` por ley (ver
`LEXGT_EXECUTION_PLAN.md` §6.2 y memoria `project_data_quality` para el
detalle completo de cada hallazgo). Después de eso, retomar el roadmap
general (Phase 12 deploy, etc.).

---

<details>
<summary>Sesión anterior — Phase 6.1 / 6.2a</summary>

Docker instalado por Beto → se completaron Phase 6.1 y Phase 6.2a (la parte
de 6.2 que no requiere tocar el extractor).

- **Phase 6.1** — `supabase init` + `supabase start` (stack local Docker) +
  `supabase db reset` (migraciones 0001-0018 + seed). Escrito
  `supabase/tests/database/rls.test.sql` (pgTAP, `plan(15)`): seeds
  `free@test`/`pro@test`/`expired@test`/`admin@test`/`other@test`/
  `target@test` (6 usuarios — el 6to, `target@test`, evita que el assert de
  "admin puede actualizar el tier de otro usuario" mute el fixture del
  usuario free usado por los tests de E3). Matriz E1 (admin solo vía
  `app_metadata`), E2 (`user_profiles.tier` no auto-actualizable / sí por
  admin), E3 (color/nota de anotaciones gateado por tier — yellow+sin nota
  para free, cualquier color+nota para pro, expired-pro tratado como free;
  `cases` Pro-only), aislamiento cross-user (annotations/cases/
  reform_notifications/user_profiles → 0 filas). `npm run test:rls` → **15/15
  verde**. `0018_grant_table_privileges.sql` (gap encontrado: `db reset` desde
  cero no otorga SELECT/INSERT/UPDATE/DELETE a `anon`/`authenticated`/
  `service_role` en ninguna tabla — solo TRIGGER/TRUNCATE/REFERENCES; prod sí
  los tiene vía provisioning de Supabase) — aplicada a prod.

- **Phase 6.2a** — `0016_dedupe_paragraphs.sql` (re-apunta las 3 anotaciones
  afectadas a la fila "kept", borra las 7,369 filas duplicadas de
  `paragraphs`, agrega `UNIQUE (article_id, position)` —
  `paragraphs_position_unique` ahora 0 fallos en las 15 leyes) y
  `0017_validate_law_tolerate_derogado.sql` (`articles_have_paragraphs`
  tolera `heading ILIKE '%derogad%'`) — ambas **aplicadas a prod** y
  verificadas re-corriendo `validate_law()`.

- **Hallazgos restantes (100% extractor-scope, ver `LEXGT_EXECUTION_PLAN.md`
  §6.2)** — diferidos a la sesión de fix del extractor (después de Phase 7):
  - ~1,007 artículos sin párrafos (huecos de contenido reales).
  - 35 pares `sections` con `(parent_id, position)` duplicado en 7 leyes —
    causa raíz confirmada: el extractor usa un único contador de `position`
    compartido entre todos los `kind` (titulo/capitulo/seccion/subseccion)
    bajo `parent_id=null`, en vez de uno por `(parent_id, kind)`.
  - 11 números de artículo duplicados en 3 leyes — causa raíz confirmada: el
    extractor descarta sufijos `Bis/Ter/Quater` (ej. 4 artículos con headings
    totalmente distintos — "Publicaciones del Congreso", "Publicidad e
    información", "Disponibilidad de información en Internet", "Consulta
    electrónica" — todos guardados como artículo `152` en
    `ley-organica-del-organismo-legislativo`).

**Pendiente de Beto:**
- Crear una cuenta de prueba tier `free` y exportar
  `PLAYWRIGHT_FREE_USER_EMAIL`/`PLAYWRIGHT_FREE_USER_PASSWORD` para
  habilitar los 2 tests e2e autenticados.

</details>

---

## Key Decisions

1. **Tres factories de cliente Supabase, no mezclar** — `lib/supabase.ts` (browser, Client Components), `lib/supabase-server.ts` (cookie-bound, Server Components/Actions; `next/headers` rompe Client Components), `lib/supabase-bearer.ts` (Bearer token, solo `app/api/v1/*` para mobile — RLS aplica igual vía el JWT del header `Authorization`).
2. **`sections.kind` en español** — valores: `libro/titulo/capitulo/seccion/parte/parrafo/subseccion/articulo/disposiciones`. Columna es `heading`, no `title`.
3. **`public.is_admin()`** — en schema `public`, no `auth` (Supabase no permite CREATE en `auth`).
4. **Server Actions para mutaciones** — signOut, saveAnnotation, deleteAnnotation, migrateAnnotations, markReformSeen, publishReform, createReformDraft, approveReform, setUserTier.
5. **`approveReform` ≠ `publishReform`** — approveReform reutiliza el reform_id del borrador. publishReform crearía un duplicado.
6. **Tooltip via portal** — `createPortal(…, document.body)` para evitar `<div>` hijo de `<p>` (hydration error).
7. **Búsqueda** — `plainto_tsquery('spanish', q)` sobre `tsvector`. Articles + paragraphs en paralelo, deduplicados por `article_id`. IDs son strings (UUID).
8. **Modos de navegación — colecciones curadas** — `law_collections` + `law_collection_items` con RLS pública. `law_id` es UUID (no integer). Modos "Caso" se derivan en runtime desde `case_annotations`, sin tabla adicional. Modo activo guardado en localStorage.
9. **Ventana de reformas por tier** — anónimo 7 días, free 1 mes, pro 6 meses.
10. **Content Extractor** — proyecto separado en `PDFtoSQLapp/pdf-sql-LEX/lex-extractor`. Genera SQL idempotente (`ON CONFLICT DO NOTHING`). Ver `SCHEMA_CONTEXT.md` en ese repo para bugs pendientes. Conexión: Session Pooler en `aws-1-us-east-1.pooler.supabase.com:5432`.
11. **Admin role** — `app_metadata.role = 'admin'` (Supabase dashboard, no autoescribible). Doble protección: middleware + layout.

---

## Token Rules

- Credenciales en `.env.local` (no commiteado). Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (ver `.env.example`). Si las de Upstash faltan, rate limiting queda deshabilitado (fail-open) con un warning en consola.
- Nunca usar `Header.tsx` — está reemplazado por `AppShell`/`ShellClient`. El header vive dentro de `ShellClient`.
- `getUserTier(supabase)` es server-only — recibe el cliente existente, no crea uno nuevo.
- Las migraciones van en `supabase/migrations/` con nombre `000N_descripcion.sql`. Ya aplicadas hasta `0018_grant_table_privileges.sql`.
- Seeds idempotentes: siempre usar `ON CONFLICT DO NOTHING` o `INSERT … WHERE NOT EXISTS`.
- `dev`: `npm run dev` (Turbopack). Build: `npm run build --turbopack`.
- RLS pgTAP suite: `npm run test:rls` (requiere `supabase start` corriendo localmente — stack Docker).

---

## File Map

```
app/
  layout.tsx                    → root layout — monta <AppShell>
  page.tsx                      → redirect a /leyes
  globals.css
  api/search/route.ts           → GET /api/search?q=&law=&limit= (full-text, rate-limited)
  api/v1/
    me/route.ts                  → GET /api/v1/me (actor: userId/tier/isAdmin)
    annotations/route.ts         → POST /api/v1/annotations
    annotations/[id]/route.ts    → PATCH (nota), DELETE
    cases/route.ts               → GET (lista), POST (crear)
    cases/[id]/route.ts          → GET (detalle), DELETE
    calc-laboral/route.ts        → POST indemnización Art. 82 (Pro, Phase 7)
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
  supabase-bearer.ts            → createBearerClient(accessToken) — solo app/api/v1/*
  get-user-tier.ts              → getUserTier(supabase): Promise<Tier> — server-only
  authz.ts                      → getActor/requireUser/requirePro/requireAdmin/AuthzError
  action-result.ts              → ActionResult<T>/runAction/ActionError (incluye RATE_LIMITED)
  anchoring.ts                  → textChecksum (SHA-256), resolveAnchor, ANCHOR_CONTEXT_LENGTH (Phase 5)
  types.ts                      → Law, Section, Article, Paragraph, Annotation, AnchorStatus, Case,
                                   LawCollection, LawCollectionItem, Tier, UserProfile, etc.
  api/
    handler.ts                  → apiHandler(fn) — wrapper de app/api/v1/* (auth, rate limit, errores)
    rate-limit.ts                → searchLimiter/apiLimiter (Upstash, sliding window, fail-open)
  services/
    annotations.ts, cases.ts, reforms.ts, admin.ts → lógica de mutaciones (Phase 3.1-3.2)
    queries/
      laws.ts                    → getLawCatalog (lista de leyes + reformas + conteos)
      reading.ts                 → getLawToc, getSectionReadingBundle, getLawMeta, getSectionMeta
      search.ts                  → searchArticles (full-text articles+paragraphs)
      cases.ts                   → listCases, getCaseDetail (Phase 4.2)
  modules/                       → Phase 7 — herramientas Pro aisladas del core, ver docs/MODULES.md
    calc-laboral/
      schemas.ts                  → IndemnizacionInput/IndemnizacionResult (zod)
      service.ts                  → calculateIndemnizacion (Art. 82 Código de Trabajo, 30/360)
      service.test.ts             → 4 casos (rechazo free, año exacto, prorrateo, duración cero)

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
    0009_schema_reconciliation.sql → sections.kind ampliado, índices duplicados eliminados
    0010_admin_app_metadata.sql → is_admin() lee app_metadata.role (E1)
    0011_lock_user_profiles.sql → owner UPDATE eliminado, trigger prevent_tier_self_update (E2)
    0012_tier_enforcement.sql   → current_user_tier()/is_pro(), WITH CHECK en annotations/cases (E3)
    0013_function_search_path_hardening.sql → set search_path en is_admin/is_pro/prevent_tier_self_update
    0014_annotation_anchors.sql → quote/prefix/suffix/text_checksum/anchor_status en annotations + backfill
    0015_validate_law.sql       → public.validate_law(law_slug) — gate de validación de contenido (Phase 6.2)
    0016_dedupe_paragraphs.sql  → elimina 7,369 paragraphs duplicados, re-apunta 3 annotations, UNIQUE (article_id, position)
    0017_validate_law_tolerate_derogado.sql → articles_have_paragraphs tolera heading ILIKE '%derogad%'
    0018_grant_table_privileges.sql → grants anon/authenticated/service_role en todas las tablas (paridad con prod)
  seed.sql                      → Código Civil completo
  seeds/
    test_reform.sql             → reforma ficticia para pruebas
  tests/
    database/rls.test.sql       → pgTAP RLS suite (E1/E2/E3 + cross-user isolation), 15/15 — npm run test:rls

.github/
  workflows/ci.yml               → tsc → lint → vitest → build (push/PR a main)

playwright.config.ts             → e2e config (webServer: npm run dev, baseURL localhost:3000)
tests/
  e2e/smoke.spec.ts               → smoke tests anónimos (✓) + free user (skip sin credenciales)
```

**Archivos de contexto en este repo (no borrar):**
- `docs/SECURITY.md` — matriz tabla × operación × política RLS (Phase 1).
- `docs/API.md` — endpoints `/api/v1/*`, auth, shapes de respuesta, rate limiting (Phase 4).
- `docs/MODULES.md` — convención de módulos Pro aislados del core (Phase 7).
- `supabase/SCHEMA_SNAPSHOT.md` — snapshot del schema post-migración 0009 (Phase 0).
