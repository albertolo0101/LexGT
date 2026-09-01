# Roadmap — dónde estamos y qué falta

Actualizado: 2026-08-31.

LexGT pasó por dos programas de trabajo: el roadmap de producto original
(Phases 1-15) y, dentro de él, un plan de remediación arquitectónica
(Phases 0-7) que se ejecutó completo antes de desplegar. Este documento
reemplaza a `LEXGT_EXECUTION_PLAN.md` y a `ARCHITECTURE_REVIEW.md`: el
detalle de cómo se ejecutó cada fase vive en el historial de git; aquí queda
**el estado y lo que falta**.

---

## Estado en una línea

La app compila, 141 unit tests, 8 e2e anónimos y 15 tests pgTAP de RLS en
verde, la seguridad está cerrada a nivel de base de datos y hay 16 leyes
cargadas. **Falta publicarla** (prueba en Vercel: [DEPLOY.md](DEPLOY.md)) y
**cerrar la calidad del contenido** antes de abrirla al público.

---

## Hecho — remediación arquitectónica (Phases 0-7)

| Fase | Qué dejó |
|---|---|
| 0 — Baseline | `0009_schema_reconciliation.sql` (`sections.kind` a 9 valores, índices duplicados fuera), `SCHEMA_SNAPSHOT.md`, borrado de código muerto, higiene de secretos en el extractor |
| 1 — Seguridad (P0) | Rol admin movido a `app_metadata` (`0010`), `user_profiles.tier` no auto-actualizable (`0011`), tier impuesto en `WITH CHECK` vía `current_user_tier()`/`is_pro()` (`0012`), `search_path` endurecido (`0013`), [SECURITY.md](SECURITY.md) |
| 2 — Autorización y errores | Tipo `Tier` unificado, `lib/authz.ts` (`getActor`/`requireUser`/`requirePro`/`requireAdmin`), `lib/action-result.ts` (`ActionResult`/`runAction`); ninguna Server Action lanza `Error` crudo ni filtra mensajes de Postgres |
| 3 — Capa de servicios | `lib/services/*` (mutaciones) y `lib/services/queries/*` (lecturas) con schemas zod; las páginas y `actions.ts` son wrappers sin `.from(` |
| 4 — API v1 | `lib/supabase-bearer.ts`, `lib/api/handler.ts`, rutas `/api/v1/{me,annotations,cases}`, rate limiting Upstash fail-open, [API.md](API.md) |
| 5 — Anclaje de anotaciones v2 | `0014_annotation_anchors.sql`, `lib/anchoring.ts` (checksum → prefix+quote+suffix → quote único → `orphaned`), re-anclaje perezoso al leer, `correctParagraphText` admin-only |
| 6 — Tests y CI | Suite pgTAP `supabase/tests/database/rls.test.sql` (15/15), `0016`-`0018` (dedupe de párrafos, `validate_law` tolerante a derogados, grants), `.github/workflows/ci.yml`, smoke Playwright |
| 7 — Arquitectura de módulos | [MODULES.md](MODULES.md) + `lib/modules/calc-laboral/` (indemnización Art. 82) probando el patrón, aislado del core |

Migraciones posteriores, de la sesión del extractor (2026-07-04):
`0019_extractor_content_reconciliation.sql` (columnas y tabla
`law_fragments` que el extractor había aplicado como DDL crudo — ahora
reproducibles, con RLS y CHECK que faltaban) — **aplicada a prod**; y
`0020_sections_sibling_position_unique.sql` — **no aplicada a prod**: los
datos legacy la violan, entra junto con la recarga de contenido.

---

## Abierto — bloquea el lanzamiento público

### 1. Calidad del contenido (`validate_law`)

Los tres bugs del extractor **ya están arreglados en código**
(`lex-extractor`, 2026-07-04): sufijos `Bis/Ter/Quater` recuperados en
`articles.number`, colisión de `position` en secciones raíz corregida
(la causa real fue la sección sintética "Disposiciones Finales" usando
`len(sections)` recursivo, no un contador compartido por `kind`), y
`no_silent_empty_articles` como señal bloqueante al extraer.

**El dato en producción sigue viejo**, porque no existe un camino de recarga
por ley: los PK son `uuid5(...)` con `ON CONFLICT (id) DO NOTHING`, así que
re-correr un `insert.sql` es no-op — y peor, como los fixes cambian el número
de artículo y las posiciones de sección, cambian los UUID5 e insertarían
filas nuevas junto a las viejas, ambas `is_current = true`. La única
herramienta de recarga (`scripts/reset_law_data.sql`) borra el corpus entero
**y las anotaciones**: tolerable hoy (14 anotaciones, 4 usuarios),
inaceptable después del lanzamiento.

Estado actual de `validate_law()` en prod (2026-08-31):

| Ley | Fallos |
|---|---|
| codigo-de-trabajo, ley-de-emision-del-pensamiento, ley-de-garantias-mobiliarias, ley-organica-de-la-sat | ninguno |
| codigo-civil, ley-de-amparo, ley-de-orden-publico, ley-del-organismo-judicial | `articles_have_paragraphs` |
| codigo-de-comercio, codigo-procesal-civil-y-mercantil | `sections_sibling_position_unique` |
| codigo-penal, constitucion, ley-electoral, ley-general-de-electricidad | ambos |
| ley-de-lo-contencioso-administrativo, ley-organica-del-organismo-legislativo | `articles_have_paragraphs` + `one_current_article_per_number` |

**Siguiente paso (en `lex-extractor`, no aquí):** construir `reload-law
<slug>` — borra secciones/artículos/párrafos/fragmentos de una sola ley,
aplica su `insert.sql`, corre `validate-law`, y se niega (o re-ancla) si hay
anotaciones apuntando a esa ley. Después re-extraer las leyes afectadas hasta
que `validate_law()` no devuelva fallos en ninguna.

### 2. Tests e2e autenticados

`tests/e2e/smoke.spec.ts` tiene dos tests anónimos que pasan y dos de usuario
free (`test.skip` hasta que existan `PLAYWRIGHT_FREE_USER_EMAIL` /
`PLAYWRIGHT_FREE_USER_PASSWORD`). **Pendiente de Beto:** crear la cuenta de
prueba tier free. Los e2e todavía no corren en CI.

### 3. Confirmación de correo sin ruta de callback

No existe `app/auth/callback/route.ts`, así que la confirmación por correo de
Supabase no puede canjear su `?code=` por sesión. Ver
[DEPLOY.md](DEPLOY.md) §3: para la prueba basta con dejar "Confirm email"
apagado; para el público hay que agregar la ruta.

---

## Roadmap de producto

- **Herramientas (2026-08-31).** `/herramientas` con cinco calculadoras
  —prestaciones, plazos, timbres, arancel y área— abiertas a cualquier
  visitante y sin backend: el cálculo vive en `lib/modules/herramientas/*` y
  las páginas lo dibujan. Para agregar una: módulo puro + test, página en
  `app/herramientas/<slug>/` y alta en `lib/tools.ts` (menú + índice).
  **Pendiente de contenido:** el Arancel (111-96), la Ley del Timbre Forense y
  Notarial (82-96) y la Ley del Impuesto de Timbres Fiscales (37-92) no están
  cargadas en la base, así que esas dos herramientas citan la norma sin enlace
  y se muestran como cálculo referencial.
- **Phase 12 — Deploy.** Prueba en Vercel ahora ([DEPLOY.md](DEPLOY.md));
  lanzamiento público cuando cierren los tres puntos de arriba.
- **Phase 13 — Jurisprudencias.** Scraper (Railway + Playwright) sobre el
  patrón worker + tabla `jobs` de [MODULES.md](MODULES.md).
- **Phase 14 — Pagos (Visanet).** Aterriza como webhook que escribe
  `user_profiles.tier` con la service-role key — seguro precisamente porque
  Phase 1 dejó ese campo escribible solo por admin/service role.
- **Phase 15 — Mobile (React Native).** Consume `/api/v1` + supabase-js para
  auth y lecturas públicas; no requiere backend nuevo.

Contenido: 16 leyes cargadas de un objetivo de 121 ítems del checklist. Ver
[CONTENT.md](CONTENT.md).

---

## Reglas permanentes para quien trabaje aquí

1. **La frontera de seguridad es RLS + triggers.** Server Actions y checks de
   UI son UX, no seguridad: se evitan con `curl` + la anon key. Toda tabla
   nueva escribible por usuarios codifica sus reglas de tier/ownership en
   `USING`/`WITH CHECK`.
2. **Una migración numerada por cambio**, idempotente donde se pueda
   (`IF EXISTS` / `OR REPLACE`). Nada de DDL ad-hoc desde el dashboard — ya
   rompió la paridad migraciones↔prod dos veces (`0009`, `0019`).
3. **Nunca ampliar una política RLS o un CHECK para que pase un test.**
   Investigar el dato.
4. **`paragraphs.text` no se actualiza en crudo**: correcciones vía
   `correctParagraphText` (re-ancla anotaciones), cambios reales de la ley
   vía el flujo de reformas (`createReformDraft` → `approveReform`).
5. **Detenerse y pedir intervención humana** para operaciones de dashboard,
   rotación de credenciales y cualquier operación destructiva de datos.
6. Al terminar una sesión, actualizar `CLAUDE.md` (estado + última sesión) y
   este documento si cambió lo pendiente.
