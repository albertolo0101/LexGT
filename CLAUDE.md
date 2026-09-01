# LexGT — CLAUDE.md

Contexto del proyecto para agentes y colaboradores. Es la fuente de verdad
del **estado**; el detalle temático vive en `docs/` (ver índice abajo).

## Qué es

Biblioteca legal guatemalteca: los usuarios navegan y leen legislación
estructurada (constitución, códigos, leyes, decretos), buscan texto completo,
marcan fragmentos, agregan notas y organizan trabajo en "casos".

Stack: Next.js 15 (App Router, Turbopack), React 19, Supabase (PostgreSQL +
Auth + RLS), Tailwind CSS v4, TypeScript, Vitest, Playwright.

Tres tiers: **anónimo** (lectura + búsqueda, ventana de reformas 7 días),
**Free** (+ highlights amarillos, 1 mes), **Pro** (+ 4 colores, notas, casos,
6 meses).

---

## Estado (2026-08-31)

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (70), `npm run build`:
  verdes. `npm run test:rls` (pgTAP): 15/15 con Docker corriendo.
- Plan de remediación arquitectónica **Phases 0-7 completo** — seguridad
  cerrada a nivel RLS, capa de servicios, API v1, anclaje de anotaciones v2,
  CI, convención de módulos. Resumen por fase en `docs/ROADMAP.md`.
- Prod (`enrykddxhqsibbokrood`): migraciones hasta `0019` aplicadas; `0020`
  espera la recarga de contenido. 16 leyes, 6,330 artículos, 4 usuarios.
- **Siguiente paso: Phase 12 — deploy de prueba a Vercel**, con la app tal
  como está. Runbook: `docs/DEPLOY.md`.

Pendientes conocidos (no bloquean la prueba, sí el lanzamiento público):

1. **Calidad de contenido** — `validate_law()` falla en 12 de 16 leyes
   (huecos de párrafos, numeración `Bis` colapsada, posiciones de sección
   duplicadas). Los bugs ya están corregidos en `lex-extractor`; falta un
   camino de **recarga por ley** para que el dato viejo se reemplace. Detalle
   en `docs/ROADMAP.md` §Datos.
2. **Cuenta free de prueba** (Beto) para habilitar los 2 e2e autenticados
   (`PLAYWRIGHT_FREE_USER_EMAIL` / `_PASSWORD`).
3. **No hay `app/auth/callback/route.ts`** — con "Confirm email" activado en
   Supabase, el enlace del correo no puede canjear su `?code=` por sesión.
   Para la prueba, dejar la confirmación apagada.

---

## Invariantes de seguridad

Matriz completa en `docs/SECURITY.md`.

- **RLS + triggers son la única frontera real.** Server Actions y checks de
  UI son UX: se evitan con `curl` + la anon key (que es pública por diseño).
- **El rol admin vive en `app_metadata`**, nunca en `user_metadata`
  (autoescribible). Lo leen `is_admin()`, `admin_find_user_by_email()`,
  `middleware.ts`, `app/admin/layout.tsx` y `lib/authz.ts`.
- **El tier se impone en `WITH CHECK`**, no solo en Server Actions.
  `public.current_user_tier()` / `public.is_pro()` son la fuente de verdad;
  toda tabla nueva escribible por usuarios y sensible al tier replica el
  patrón.
- **`user_profiles.tier` / `tier_expires_at` / `tier_source`** solo los
  escribe un admin (política + trigger `prevent_tier_self_update`).
- La app **nunca** usa la `service_role` key.

---

## Decisiones clave

1. **Cuatro factories de cliente Supabase, no mezclar** — `lib/supabase.ts`
   (browser, Client Components), `lib/supabase-server.ts` (cookie-bound,
   Server Components/Actions; `next/headers` rompe Client Components),
   `lib/supabase-bearer.ts` (Bearer token, solo `app/api/v1/*`),
   `lib/supabase-public.ts` (sin sesión, solo contenido público cacheado —
   `unstable_cache` no puede leer cookies).
2. **`sections.kind` en español**: `libro/titulo/capitulo/seccion/parte/
   parrafo/subseccion/articulo/disposiciones`. La columna de texto es
   `heading`, no `title`.
3. **`public.is_admin()` vive en `public`**, no en `auth` (Supabase no
   permite `CREATE FUNCTION` ahí).
4. **Mutaciones por Server Action**, que devuelven `ActionResult` vía
   `runAction` — nunca `throw new Error(pgError.message)`.
5. **`approveReform` ≠ `publishReform`** — approveReform reutiliza el
   `reform_id` del borrador; publishReform crearía un duplicado.
6. **Tooltips y modales dentro de `ReaderSurface` van por portal**
   (`createPortal(…, document.body)`) para no meter un `<div>` dentro de un
   `<p>` (error de hidratación).
7. **Búsqueda**: `plainto_tsquery('spanish', q)` sobre `tsvector`; articles y
   paragraphs en paralelo, deduplicados por `article_id`.
8. **Colecciones curadas**: `law_collections` + `law_collection_items` (RLS
   pública). Los modos "Caso" se derivan en runtime de `case_annotations`; el
   modo activo se guarda en localStorage.
9. **Ventana de reformas por tier**: anónimo 7 días, free 1 mes, pro 6 meses.
10. **`paragraphs.text` no se actualiza en crudo** — correcciones por
    `correctParagraphText` (admin, re-ancla anotaciones); cambios reales de
    la ley por el flujo de reformas.
11. **El contenido lo produce `lex-extractor`** (repo hermano en
    `PDFtoSQLapp/pdf-sql-LEX/lex-extractor`): es el plano de control
    editorial; LexGT es el lector. Conexión: Session Pooler en
    `aws-1-us-east-1.pooler.supabase.com:5432`.
12. **Módulos Pro aislados** en `lib/modules/<name>/` — nada del core los
    importa (`docs/MODULES.md`).
13. **Una ley = una página.** La vista de lectura renderiza la ley completa en
    scroll continuo; el índice de la izquierda solo hace scroll y marca dónde
    va el lector. Tres consecuencias que hay que respetar:
    - **Paginar toda lectura a escala de ley**: PostgREST corta en 1,000 filas
      y el Código Civil tiene 1,996 artículos y 2,894 párrafos. Sin
      `.range(...)` en bucle la ley sale truncada **sin error**.
    - **El orden de lectura sale de `articles.position`**, no de
      `sections.position` (que tiene colisiones conocidas en 7 leyes). Los
      encabezados de sección se emiten al cambiar de rama del árbol.
    - **Un solo componente cliente por página** (`ReaderSurface`), con
      delegación de eventos sobre párrafos renderizados en el servidor. Montar
      un componente por párrafo era viable con un capítulo, no con una ley.
14. **El contenido de ley se cachea, la capa de usuario no** —
    `getLawContent` (público, idéntico para todos) va por
    `lib/cache/law-content.ts`; `getLawUserLayer` (highlights, notas,
    reformas) siempre se consulta fresco. Las acciones que cambian texto
    llaman `revalidateTag(LAW_CONTENT_TAG)`.

---

## Convenciones

- Credenciales en `.env.local` (no commiteado); plantilla en `.env.example`.
  Sin las variables de Upstash, el rate limiting queda deshabilitado
  (fail-open con warning).
- Migraciones en `supabase/migrations/000N_descripcion.sql`, idempotentes
  donde se pueda. **Nada de DDL ad-hoc desde el dashboard** — ya rompió la
  paridad migraciones↔prod dos veces (`0009`, `0019`).
- Seeds idempotentes: `ON CONFLICT DO NOTHING` o `INSERT … WHERE NOT EXISTS`.
- `getUserTier(supabase)` es server-only y recibe el cliente existente.
- Páginas y route handlers no contienen `.from(` — las lecturas viven en
  `lib/services/queries/*`, las mutaciones en `lib/services/*`.
- Rutas nuevas de `/api/v1/*` siempre vía `apiHandler`, nunca un route
  handler ad-hoc.
- `npm run dev` (Turbopack) · `npm run build` · `npm run test` ·
  `npm run test:rls` (requiere `supabase start`).

---

## Mapa de archivos

```
app/
  layout.tsx                     → root layout, monta <AppShell>
  page.tsx                       → redirect a /leyes
  globals.css                    → tokens Tailwind v4 (navy/gold/paper/ink/hl)
  api/
    search/route.ts              → GET /api/search?q=&law=&limit= (rate-limited)
    v1/me/route.ts               → GET actor (userId/tier/isAdmin)
    v1/annotations/route.ts      → POST
    v1/annotations/[id]/route.ts → PATCH (nota), DELETE
    v1/cases/route.ts            → GET (lista), POST
    v1/cases/[id]/route.ts       → GET (detalle), DELETE
    v1/calc-laboral/route.ts     → POST indemnización Art. 82 (Pro)
  buscar/page.tsx                → resultados full-text
  leyes/
    page.tsx + LeyesIndexClient.tsx → catálogo (cuadrícula de "libros" + lista)
    actions.ts                   → saveAnnotation, deleteAnnotation,
                                    updateAnnotationNote, migrateAnnotations,
                                    markReformSeen, publishReform
    [slug]/                      → vista de lectura: la ley COMPLETA en scroll
      page.tsx                    → compone índice + hoja + panel derecho
      LawToc.tsx                  → índice sticky con scroll-spy (cliente)
      DocHeader.tsx               → portada del documento
      ArticleBlock.tsx            → artículo (entrada corrida "Artículo N.")
      ParagraphText.tsx           → párrafo anotable, 100% servidor
      RightPanel.tsx, NotifBanner.tsx, types.ts
    [slug]/[section_id]/page.tsx → redirect a #seccion-… (enlaces viejos)
  casos/
    page.tsx, CasesClient.tsx, [id]/page.tsx
    actions.ts                   → createCase, deleteCase,
                                    addAnnotationToCase, removeAnnotationFromCase
  auth/actions.ts (signOut), login/page.tsx, register/page.tsx
  admin/
    layout.tsx (guard), page.tsx, TierForm.tsx
    actions.ts                   → findArticle, createReformDraft,
                                    approveReform, setUserTier,
                                    correctParagraphText
    reformas/nueva/{page.tsx,NewReformForm.tsx}, reformas/[id]/page.tsx

components/
  AppShell.tsx        → Server: fetcha user/tier/leyes, compone ShellClient
  ShellClient.tsx     → Client: layout h-screen (TopBar + sidebar + panel)
  TopBar.tsx          → marca, trigger de búsqueda (⌘K), badge de tier, menú
  SidebarContent.tsx  → Server: leyes, actualizaciones, link /casos
  SearchOverlay.tsx   → paleta ⌘K (debounce → /api/search)
  SearchBar.tsx       → form → /buscar?q=
  ReaderSurface.tsx   → UNA superficie cliente por ley: selección de texto,
                         tooltip de highlight/nota, "guardar en caso"
  LawCard.tsx, ReformModal.tsx, PaywallModal.tsx, icons.tsx

lib/
  supabase.ts / supabase-server.ts / supabase-bearer.ts / supabase-public.ts
                      → las cuatro factories (ver decisión 1)
  anchors.ts          → articleAnchor / sectionAnchor (ids del documento)
  cache/law-content.ts → contenido de ley cacheado (unstable_cache + tags)
  authz.ts            → Actor, getActor, requireUser/requirePro/requireAdmin
  action-result.ts    → ActionResult, runAction, ActionError (incl. RATE_LIMITED)
  anchoring.ts        → textChecksum (SHA-256), resolveAnchor, ANCHOR_CONTEXT_LENGTH
  get-user-tier.ts, get-pending-reforms.ts, get-article-counts.ts
  case-colors.ts, section-kind.ts, types.ts
  api/handler.ts      → apiHandler (auth → rate limit → zod → servicio → JSON)
  api/rate-limit.ts   → searchLimiter / apiLimiter (Upstash, fail-open)
  services/           → annotations.ts, cases.ts, reforms.ts, admin.ts (+tests)
  services/queries/   → laws.ts, reading.ts, search.ts, cases.ts (+tests)
  modules/calc-laboral/ → schemas.ts, service.ts, README.md (+tests)
  test/               → mock-supabase.ts, empty-module.ts

middleware.ts         → refresca la cookie de sesión; protege /admin/*

supabase/
  migrations/0001…0020_*.sql    → 0001-0019 aplicadas a prod; 0020 pendiente
  seed.sql, seeds/{codigo_trabajo,test_reform}.sql
  tests/database/rls.test.sql   → pgTAP, 15 asserts (E1/E2/E3 + aislamiento)
  SCHEMA_SNAPSHOT.md            → schema vigente de prod

tests/e2e/smoke.spec.ts         → 2 tests anónimos (verdes) + 2 free (skip)
.github/workflows/ci.yml        → tsc → lint → vitest → build
```

Migraciones, en orden: `0001` schema inicial · `0002` versionado + reformas ·
`0003` estado de reformas + `is_admin()` · `0004` `user_profiles` · `0005`
color/nota en anotaciones · `0006` casos · `0007` búsqueda full-text · `0008`
colecciones · `0009` reconciliación de schema · `0010` admin en
`app_metadata` · `0011` cierre de `user_profiles` · `0012` tier en
`WITH CHECK` · `0013` `search_path` hardening · `0014` anclas de anotaciones ·
`0015` `validate_law()` · `0016` dedupe de párrafos + UNIQUE · `0017`
`validate_law` tolera derogados · `0018` grants de tabla · `0019`
reconciliación del schema del extractor · `0020` posición única de secciones
hermanas (pendiente).

---

## Documentación

| Documento | Contenido |
|---|---|
| `README.md` | Setup, scripts, estructura — puerta de entrada del repo |
| `docs/ROADMAP.md` | Estado por fase, pendientes, roadmap de producto, reglas permanentes |
| `docs/DEPLOY.md` | Runbook de deploy a Vercel + checklist de lanzamiento |
| `docs/SECURITY.md` | Matriz RLS tabla × operación × política |
| `docs/API.md` | API v1 para mobile |
| `docs/MODULES.md` | Convención de módulos Pro |
| `docs/CONTENT.md` | Checklist de 121 leyes + estado de calidad de datos |
| `supabase/SCHEMA_SNAPSHOT.md` | Schema de producción |

---

## Última sesión (2026-08-31)

**Parte 1 — limpieza de repo y documentación** (commit `e68b8e2`): README real,
CLAUDE.md reescrito contra el estado verificado, `docs/ROADMAP.md` y
`docs/DEPLOY.md` nuevos, `LAWS.md` → `docs/CONTENT.md`, `SCHEMA_SNAPSHOT.md`
regenerado desde prod. Borrados `ARCHITECTURE_REVIEW.md`,
`LEXGT_EXECUTION_PLAN.md`, `.env.local.example` y los SVG de create-next-app.

**Parte 2 — vista de lectura: la ley completa en una página.**

- `app/leyes/[slug]/` es ahora el lector: documento continuo + índice sticky
  con scroll-spy + panel derecho (colapsado por defecto). La antigua tabla de
  contenidos y la ruta por sección desaparecieron;
  `[slug]/[section_id]` solo redirige a `#seccion-…`.
- `components/ReaderSurface.tsx` reemplaza a `ParagraphHighlighter`: una sola
  superficie cliente con delegación de eventos; los párrafos los renderiza el
  servidor (`ParagraphText`, `segments.ts`). Al guardar/borrar un highlight se
  parcha el DOM (`saveAnnotation` ahora devuelve el `id`) en vez de
  re-renderizar la ley; solo las notas fuerzan `router.refresh()`.
- **Hallazgo crítico:** PostgREST corta en 1,000 filas — el Código Civil
  (1,996 artículos) salía truncado sin error. Todas las lecturas a escala de
  ley se paginan con `.range()`.
- Orden de lectura por `articles.position` (no `sections.position`, que tiene
  colisiones); los encabezados se emiten al cambiar de rama.
- Contenido cacheado en `lib/cache/law-content.ts` (`unstable_cache`, tag +
  versión de clave) con `lib/supabase-public.ts` como cuarta factory.
  Medido en build de producción: Código Civil 2.3 s frío → 0.75 s cacheado
  (1.3 MB gzip); Código de Trabajo 0.41 s.
- **Rate limiting:** las credenciales de Upstash de `.env.local` apuntan a una
  instancia inexistente y cada búsqueda pagaba ~4.6 s de reintentos antes de
  hacer fail-open. `lib/api/rate-limit.ts` ahora usa 1 reintento y un techo de
  400 ms → búsqueda de 4.75 s a ~0.2 s. **Antes de configurar Upstash en
  Vercel, verificar que la instancia exista.**
- Catálogo: las tarjetas de la cuadrícula ahora son "libros" (pasta azul,
  tipografía dorada, lomo); en la lista y en la barra lateral va primero el
  nombre de la ley y luego el decreto en tono pálido.
- Verificado: `tsc`, `lint` limpio, 78 unit tests, `build`, 3/3 e2e anónimos
  contra el build de producción, y que el texto de cada `[data-paragraph-id]`
  en el DOM coincide byte a byte con `paragraphs.text` (contrato de anclaje).
- **Sin verificar (requiere sesión):** guardar highlight, nota y "guardar en
  caso" con un usuario real — los e2e autenticados siguen en `test.skip`
  hasta que exista la cuenta free de prueba.

Siguiente sesión: ejecutar `docs/DEPLOY.md` (deploy a Vercel) y, después, la
recarga por ley del contenido desde `lex-extractor`.
