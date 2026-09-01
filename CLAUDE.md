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

- `npx tsc --noEmit`, `npm run lint`, `npm run test` (146), `npm run build`:
  verdes. `npm run test:e2e`: 8/8 anónimos (3 autenticados en skip).
  `npm run test:rls` (pgTAP): 15/15 con Docker corriendo.
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
15. **Un resaltado puede cruzar párrafos** — la selección se parte en un
    segmento por párrafo y cada uno se guarda como su propia anotación
    (`saveAnnotations`, tope de 50 por gesto): el anclaje es por
    `paragraph_id` + offsets y no se toca. Consecuencia: borrar o anotar
    afecta solo al fragmento del párrafo en el que se hizo clic. Los `<mark>`
    se pintan reconstruyendo el rango desde los offsets contra el DOM vigente
    (`rangeFromOffsets`), no guardando el `Range` de la selección, que queda
    inválido al envolver el primer tramo.
16. **El panel de anotación es un formulario, no un tooltip** — se cierra solo
    con "Guardar nota", "Eliminar", la X o Escape. Un click afuera ya no lo
    descarta (borraba la nota a medio escribir) y guardar en un caso lo deja
    abierto con la confirmación. El panel de una selección nueva sí se
    descarta al hacer click afuera: la selección se pierde igual.
17. **Las herramientas (`/herramientas/*`) son páginas cliente puras** — sin
    DB, sin tier, sin API: el cálculo vive en `lib/modules/herramientas/*`
    (módulos sin `server-only`, con tests de Vitest) y la página solo lo
    dibuja. Alta en `lib/tools.ts`, que alimenta el menú y el índice.

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
    actions.ts                   → saveAnnotation, saveAnnotations (selección
                                    multi-párrafo), deleteAnnotation,
                                    updateAnnotationNote, migrateAnnotations,
                                    markReformSeen, publishReform
    [slug]/                      → vista de lectura: la ley COMPLETA en scroll
      page.tsx                    → compone índice + hoja + panel derecho
      LawToc.tsx                  → índice sticky con scroll-spy (cliente)
      RevisionLed.tsx             → LED verde "texto al día" + fecha de la
                                    última revisión del Diario de Centro
                                    América (misma para todas las leyes)
      DocHeader.tsx               → portada del documento
      ArticleBlock.tsx            → artículo (entrada corrida "Artículo N.")
      ParagraphText.tsx           → párrafo anotable, 100% servidor
      RightPanel.tsx              → notas/caso/concordancias/historial,
                                    ABIERTO por defecto (se cierra con la X)
      NotifBanner.tsx, types.ts
    [slug]/[section_id]/page.tsx → redirect a #seccion-… (enlaces viejos)
  casos/
    page.tsx, CasesClient.tsx
    [id]/page.tsx + CaseDetailClient.tsx → notas del caso (caja de texto
                                    arriba), nota editable por anotación y
                                    "Ver en la ley" (#articulo-N)
    actions.ts                   → createCase, updateCase, deleteCase,
                                    addAnnotationToCase, removeAnnotationFromCase
  herramientas/                  → herramientas públicas, 100% cliente
    page.tsx                     → índice
    ToolHeader.tsx, ui.ts        → migas + título, clases compartidas
    prestaciones/                → indemnización, aguinaldo, bono 14,
                                    vacaciones por tiempo servido
    plazos/                      → vencimiento en días hábiles (Art. 45 LOJ)
    timbres/                     → timbre notarial + fiscal y denominaciones
    arancel/                     → honorarios mínimos del Decreto 111-96
    area/                        → área de polígono por coordenadas o por
                                    rumbos y distancias + unidades agrarias
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
  ToolsMenu.tsx       → dropdown "Herramientas" en la barra superior
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
  tools.ts            → catálogo de herramientas (menú + índice)
  revision.ts         → `GAZETTE_REVIEWED_ON`: fecha de la última revisión del
                         Diario de Centro América. **Se actualiza a mano cada
                         vez que se cierra una revisión del diario oficial**;
                         es lo único que mueve el LED del lector.
  modules/calc-laboral/ → schemas.ts, service.ts, README.md (+tests)
  modules/herramientas/ → prestaciones.ts, plazos.ts, timbres.ts, arancel.ts,
                         area.ts, format.ts — cálculo puro, sin `server-only`:
                         lo importan las páginas cliente (+tests)
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

## Última sesión (2026-08-31, parte 5)

**Resaltado de varios párrafos a la vez.**

- Antes, una selección que cruzaba párrafos se descartaba en silencio. Ahora
  `ReaderSurface` la parte en un segmento por párrafo (offsets propios de cada
  uno) y los guarda de un jalón con `saveAnnotations`, acción y servicio
  nuevos: una sola consulta por los textos, checksum por párrafo calculado en
  el servidor y los ids devueltos **en el orden de los segmentos**, emparejados
  por su ancla (el `RETURNING` de Postgres no garantiza orden).
- Tope de 50 párrafos por gesto (`MAX_ANNOTATIONS_PER_SAVE`), con aviso en
  pantalla: un "seleccionar todo" sobre el Código Civil no debe insertar miles
  de filas.
- Los `<mark>` se pintan reconstruyendo el rango desde los offsets contra el
  DOM vigente; si alguno no se puede envolver, se cae a `router.refresh()`.
  El panel de la selección se ancla al puntero (con una selección larga el
  inicio suele quedar fuera de la pantalla).
- Verificado en un navegador real (parche temporal de sesión, ya revertido):
  arrastrar sobre tres párrafos muestra "Destacar 3 párrafos" y pinta tres
  `<mark>`, uno por párrafo, con texto idéntico byte a byte al seleccionado y
  sin alterar el `textContent` del párrafo (contrato de anclaje). Cruza sin
  problema el límite entre artículos y los encabezados de sección.
- **Sin verificar (requiere sesión Pro):** el guardado real contra la base. El
  e2e que lo cubre ya está escrito y corre en cuanto exista la cuenta de
  prueba (`tests/e2e/smoke.spec.ts`, grupo autenticado).
- `tsc`, `lint`, 146 unit tests, `build` y 8/8 e2e anónimos en verde.

Siguiente sesión: ejecutar `docs/DEPLOY.md` (deploy a Vercel) y, después, la
recarga por ley del contenido desde `lex-extractor`.

---

## Sesión previa (2026-08-31, parte 4)

**Cinco herramientas y el LED de vigencia global.**

- El LED del lector ya no muestra la fecha de reforma de cada ley: muestra la
  **última revisión del Diario de Centro América**, la misma para todo el
  catálogo, en `lib/revision.ts` (`GAZETTE_REVIEWED_ON`). Bumpear esa constante
  es lo único que hay que hacer al cerrar una revisión del diario.
- Tres herramientas nuevas, con el mismo patrón (módulo puro + test + página
  cliente + alta en `lib/tools.ts`):
  - **Plazos** — vencimiento en días hábiles, calendario, meses o años.
    Fundamento verificado contra el texto que ya está en la base: Art. 45 d) y
    e) de la LOJ (el plazo corre desde el día siguiente a la notificación; no
    se cuentan domingos, sábados de descanso, feriados ni los días de cierre
    del tribunal) y Art. 127 del Código de Trabajo para los asuetos. Semana
    Santa se deriva de la Pascua (algoritmo gregoriano). Acepta días inhábiles
    adicionales, que es justo lo que contempla el Art. 45 d).
  - **Timbres** — timbre notarial (Decreto 82-96: 2 por millar, piso Q1, techo
    Q300; Q10 en actas, legalizaciones, protocolaciones y valor indeterminado),
    timbre fiscal (Decreto 37-92: 3%, excluyente del IVA) y papel de protocolo
    (valor por hoja editable, no una constante escondida). Devuelve el desglose
    de denominaciones con programación dinámica — el algoritmo voraz falla
    (Q0.30 son tres timbres de Q0.10) — y avisa cuando hay que redondear
    porque no existe timbre para el remanente exacto.
  - **Arancel** — honorarios mínimos del Decreto 111-96: regla general
    (15%/5%), ejecuciones (10%/5%), sucesorios (7%/3%/1%, Art. 8), jurisdicción
    voluntaria (Q800 + 5%, Art. 9) y casación/amparo (Q1,500–Q5,000); segunda
    instancia = mitad.
- Prestaciones y plazos enlazan a su artículo dentro del lector.
- El texto completo del 111-96, del 82-96 y del 37-92 **no está en la base**:
  los porcentajes salen de fuentes secundarias y las herramientas lo dicen en
  pantalla ("cálculo referencial"). Cargar esas tres leyes con el extractor es
  el siguiente paso natural para poder citarlas con enlace.
- Verificado: `tsc`, `lint`, 141 unit tests, `build` y 8/8 e2e anónimos contra
  el build de producción (tres nuevos: plazos, timbres y arancel).


---

## Sesión previa (2026-08-31, parte 3)

**Casos, lector y herramientas.**

- **Casos:** cada caso abre con una caja de "Notas del caso" (se guarda en
  `cases.description` vía `updateCase`, acción nueva); cada anotación guardada
  tiene su nota editable en línea y un botón **Ver en la ley** que salta a
  `/leyes/<slug>#articulo-<n>` — `getCaseDetail` ahora trae `laws(slug,
  short_name)` por el join de artículos. `/casos` y `/casos/[id]` dejaron de
  usar `.from(` directo y pasan por `lib/services/queries/cases.ts`.
- **Panel de anotación (`ReaderSurface`):** ya no se cierra al hacer click
  afuera ni al elegir un caso del dropdown; se cierra con "Guardar nota",
  "Eliminar", la X o Escape, y al reabrir un highlight la nota aparece
  editable. Guardar en un caso confirma en línea sin cerrar.
- **Lector:** el panel derecho (Notas/Caso/Concordancias/Historial) abre
  **abierto** y arranca en Notas; cerrado deja una pestaña dorada vertical
  "Herramientas", mucho más visible que el icono anterior. Arriba del
  documento hay un LED verde (`RevisionLed`) con la fecha de la última
  revisión del **Diario de Centro América** — una sola fecha para todo el
  catálogo, en `lib/revision.ts`, no la fecha de reforma de cada ley.
- **Contraste:** los formularios de caso, el pie de la barra lateral y los
  textos del panel derecho pasaron de gris claro a tinta oscura.
- **Herramientas:** dropdown nuevo en la barra superior, junto al buscador, e
  índice en `/herramientas`. Dos calculadoras, ambas 100% en el navegador:
  **prestaciones** (indemnización Art. 82, aguinaldo, bono 14, vacaciones y
  vacaciones no gozadas, convención 30/360) y **área** (polígono por
  coordenadas o por rumbos y distancias, con error de cierre, dibujo del
  polígono y conversión a varas², hectáreas, manzanas y caballerías —
  vara = 0.835905 m).
- Verificado: `tsc`, `lint`, 96 unit tests, `build`, y contra el build de
  producción 5/5 e2e anónimos (dos nuevos cubren el menú de herramientas y la
  calculadora de área).
- **Sin verificar (requiere sesión Pro):** notas del caso, edición de notas
  desde el caso y el panel de anotación con un usuario real — sigue faltando
  la cuenta de prueba.

