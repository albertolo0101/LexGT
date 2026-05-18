# LexGT — Contexto del proyecto

Última actualización: 2026-05-18 (Phase 9 completa, Phase 10 en progreso — 15 leyes cargadas)

---

## Qué es este proyecto

**LexGT** es una biblioteca legal guatemalteca. Los usuarios pueden navegar y leer legislación estructurada (leyes, códigos, decretos, jurisprudencias), marcar fragmentos, agregar notas y organizar su trabajo en "casos". Contenido curado y controlado — los usuarios no pueden subir documentos propios.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Turbopack) |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth vía `@supabase/ssr` |
| Estilos | Tailwind CSS v4 |
| Lenguaje | TypeScript |
| Entorno | Node.js en Windows 11 |

---

## Tiers

| Feature | Free | Pro |
|---|---|---|
| Leer leyes, códigos, decretos | ✓ | ✓ |
| Buscar en legislación | ✓ | ✓ |
| Buscar jurisprudencias (CC + CSJ) | ✓ sesión only | ✓ |
| Highlights | 1 color (amarillo) | 4 colores (amarillo, verde, azul, rosado) |
| Notas de texto | ✗ | ✓ |
| Guardar jurisprudencias | ✗ | ✓ texto completo |
| Casos (carpetas de trabajo) | ✗ | ✓ |
| Modos de navegación por caso | ✗ | ✓ |
| Notificaciones de versioning | ✗ | ✓ |

---

## Checklist de contenido — Launch (121 leyes)

Leyenda: ✅ en DB y seeded | ⚠️ placeholder (reemplazar) | ⏳ pendiente

### Base principal (14)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 1 | Constitución Política + Ley de Orden Público + Ley de Emisión del Pensamiento | ✅ | ✅ |
| 2 | Ley de Amparo, Exhibición Personal y de Constitucionalidad | ✅ | ✅ |
| 3 | Ley Electoral y de Partidos Políticos | ✅ | ✅ |
| 4 | Ley del Organismo Judicial | ✅ | ✅ |
| 5 | Ley del Organismo Legislativo | ✅ | ✅ |
| 6 | Ley del Organismo Ejecutivo | ⏳ | ⏳ |
| 7 | Código Civil | ✅ | ✅ |
| 8 | Código Procesal Civil y Mercantil + Leyes Anexas | ✅ | ✅ |
| 9 | Código de Comercio + Leyes Anexas | ✅ | ✅ |
| 10 | Código de Notariado + Leyes Anexas | ⏳ | ⏳ |
| 11 | Ley de lo Contencioso Administrativo + Leyes Anexas | ✅ | ✅ |
| 12 | Código Penal + Leyes Anexas | ✅ | ✅ |
| 13 | Código Procesal Penal + Leyes Anexas | ⏳ | ⏳ |
| 14 | Código de Trabajo + Leyes Anexas | ✅ | ✅ |

### Leyes Civiles (20)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 15 | Ley de Adopciones | ⏳ | ⏳ |
| 16 | Procedimiento Relativo al Hallazgo de Bienes Mostrencos | ⏳ | ⏳ |
| 17 | Ley General de Caza | ⏳ | ⏳ |
| 18 | Ley de Garantías Mobiliarias | ✅ | ✅ |
| 19 | Ley de Inquilinato | ⏳ | ⏳ |
| 20 | Ley de Nacionalidad | ⏳ | ⏳ |
| 21 | Ley Reguladora de las Áreas de Reservas Territoriales del Estado (OCRET) | ⏳ | ⏳ |
| 22 | Ley de Organizaciones No Gubernamentales para el Desarrollo (ONG's) | ⏳ | ⏳ |
| 23 | Ley General de Pesca y Acuicultura | ⏳ | ⏳ |
| 24 | Ley de la Protección para las Personas de la Tercera Edad | ⏳ | ⏳ |
| 25 | Ley de Titulación Supletoria | ⏳ | ⏳ |
| 26 | Ley de Tribunales de Familia | ⏳ | ⏳ |
| 27 | Ley de Vivienda | ⏳ | ⏳ |
| 28 | Ley del Registro Nacional de las Personas (RENAP) | ⏳ | ⏳ |
| 29 | Ley General de Cooperativas | ⏳ | ⏳ |
| 30 | Ley del Programa de Aporte Económico del Adulto Mayor | ⏳ | ⏳ |
| 31 | Código de Migración + Ley de Migración (Ley Parcial) | ⏳ | ⏳ |
| 32 | Ley de Dignificación y Promoción Integral de la Mujer | ⏳ | ⏳ |
| 33 | Código de Derecho Internacional Privado | ⏳ | ⏳ |
| 34 | Ley de Aviación Civil | ⏳ | ⏳ |

### Leyes Mercantiles (20)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 35 | Ley de Propiedad Industrial | ⏳ | ⏳ |
| 36 | Ley de Actividad Aseguradora | ⏳ | ⏳ |
| 37 | Ley de Almacenes Generales de Depósito | ⏳ | ⏳ |
| 38 | Ley de Bancos y Grupos Financieros | ⏳ | ⏳ |
| 39 | Ley del Mercado de Valores y Mercancías | ⏳ | ⏳ |
| 40 | Ley de Protección al Consumidor y Usuario | ⏳ | ⏳ |
| 41 | Ley de Sociedades Financieras Privadas | ⏳ | ⏳ |
| 42 | Ley de Tarjetas de Crédito | ⏳ | ⏳ |
| 43 | Ley de Derecho de Autor y Derechos Conexos | ⏳ | ⏳ |
| 44 | Ley de Libre Negociación de Divisas | ⏳ | ⏳ |
| 45 | Ley Monetaria | ⏳ | ⏳ |
| 46 | Convenio de París para la Protección de la Propiedad Industrial | ⏳ | ⏳ |
| 47 | Convenio de Roma | ⏳ | ⏳ |
| 48 | Ley de Fortalecimiento al Emprendimiento | ⏳ | ⏳ |
| 49 | Ley de los Contratos de Factoraje y de Descuento | ⏳ | ⏳ |
| 50 | Clasificación Internacional de Niza | ⏳ | ⏳ |
| 51 | Ley para el Reconocimiento de Comunicaciones y Firmas Electrónicas | ⏳ | ⏳ |
| 52 | Ley de Leasing | ⏳ | ⏳ |
| 53 | Libro III del Comercio Marítimo — Parte vigente del Código de Comercio Anterior | ⏳ | ⏳ |
| 54 | Ley de Insolvencia | ⏳ | ⏳ |

### Leyes Notariales (6)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 55 | Código de Ética Profesional | ⏳ | ⏳ |
| 56 | Ley de Colegiación Profesional Obligatoria | ⏳ | ⏳ |
| 57 | Ley sobre el Impuesto de Herencias, Legados y Donaciones | ⏳ | ⏳ |
| 58 | Ley del Impuesto Único sobre Inmuebles (IUSI) | ⏳ | ⏳ |
| 59 | Ley del Impuesto al Valor Agregado (IVA) | ⏳ | ⏳ |
| 60 | Ley del Registro de Información Catastral (RIC) | ⏳ | ⏳ |

### Leyes Administrativas (35)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 61 | Código Municipal (Decreto 12-2002) | ⏳ | ⏳ |
| 62 | Código Tributario | ⏳ | ⏳ |
| 63 | Ley de Acceso a la Información Pública | ⏳ | ⏳ |
| 64 | Ley de Comisiones de Postulación | ⏳ | ⏳ |
| 65 | Ley de Contrataciones del Estado | ⏳ | ⏳ |
| 66 | Ley de Expropiación | ⏳ | ⏳ |
| 67 | Ley de los Consejos de Desarrollo Urbano y Rural (Decreto 11-2002) | ⏳ | ⏳ |
| 68 | Ley de Probidad y Responsabilidades de Funcionarios y Empleados Públicos | ⏳ | ⏳ |
| 69 | Ley en Materia de Antejuicio | ⏳ | ⏳ |
| 70 | Ley General de Descentralización | ⏳ | ⏳ |
| 71 | Ley Orgánica de la USAC | ⏳ | ⏳ |
| 72 | Ley Orgánica del Banco de Guatemala | ⏳ | ⏳ |
| 73 | Ley Orgánica de la Contraloría General de Cuentas | ⏳ | ⏳ |
| 74 | Ley de Supervisión Financiera | ⏳ | ⏳ |
| 75 | Ley Orgánica del Presupuesto | ⏳ | ⏳ |
| 76 | Ley del Tribunal de Cuentas | ⏳ | ⏳ |
| 77 | Ley del Impuesto de Solidaridad (ISO) | ⏳ | ⏳ |
| 78 | Ley de Actualización Tributaria (ISR) | ⏳ | ⏳ |
| 79 | Ley Orgánica de la SAT | ⏳ | ⏳ |
| 80 | Disposiciones Legales para el Fortalecimiento de la Administración Tributaria | ⏳ | ⏳ |
| 81 | Ley Orgánica del IGSS | ⏳ | ⏳ |
| 82 | Ley de la Carrera Judicial | ⏳ | ⏳ |
| 83 | Ley Nacional de Aduanas | ⏳ | ⏳ |
| 84 | Ley Orgánica de la Procuraduría General de la Nación | ⏳ | ⏳ |
| 85 | Ley de Fomento y Desarrollo de la Actividad Exportadora y de Maquila | ⏳ | ⏳ |
| 86 | Ley del Tribunal de Conflictos de Jurisdicción (Decreto 64-76) | ⏳ | ⏳ |
| 87 | Ley de Zonas Francas | ⏳ | ⏳ |
| 88 | Disposiciones para el Fortalecimiento del Sistema Tributario y el Combate a la Defraudación y al Contrabando | ⏳ | ⏳ |
| 89 | Ley del Impuesto sobre la Distribución de Bebidas Alcohólicas Destiladas, Cervezas y otras Bebidas Fermentadas | ⏳ | ⏳ |
| 90 | Ley del Impuesto Específico a la Distribución de Cemento | ⏳ | ⏳ |
| 91 | Ley del Impuesto a la Distribución de Petróleo Crudo y Combustibles Derivados del Petróleo | ⏳ | ⏳ |
| 92 | Ley del Impuesto Específico sobre la Distribución de Bebidas Gaseosas, Isotónicas, Jugos, Néctares, Yogures, etc. | ⏳ | ⏳ |
| 93 | Ley de Simplificación de Requisitos y Trámites Administrativos | ⏳ | ⏳ |
| 94 | Ley de Simplificación, Actualización e Incorporación Tributaria | ⏳ | ⏳ |
| 95 | Ley de Universidades Privadas | ⏳ | ⏳ |

### Leyes Penales (19)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 96 | Ley contra el Femicidio y otras formas de Violencia contra la Mujer | ⏳ | ⏳ |
| 97 | Ley contra el Lavado de Dinero u otros Activos | ⏳ | ⏳ |
| 98 | Ley contra la Defraudación y Contrabando Aduanero | ⏳ | ⏳ |
| 99 | Ley contra la Delincuencia Organizada | ⏳ | ⏳ |
| 100 | Ley contra la Narcoactividad | ⏳ | ⏳ |
| 101 | Ley para Prevenir, Sancionar y Erradicar la Violencia Intrafamiliar | ⏳ | ⏳ |
| 102 | Ley contra la Violencia Sexual, Explotación y Trata de Personas | ⏳ | ⏳ |
| 103 | Ley de Armas y Municiones | ⏳ | ⏳ |
| 104 | Ley de Extinción de Dominio | ⏳ | ⏳ |
| 105 | Ley del Régimen Penitenciario | ⏳ | ⏳ |
| 106 | Ley del Servicio Público de Defensa Penal | ⏳ | ⏳ |
| 107 | Ley para la Protección de Sujetos Procesales | ⏳ | ⏳ |
| 108 | Ley Orgánica del INACIF | ⏳ | ⏳ |
| 109 | Ley Orgánica del Ministerio Público (MP) | ⏳ | ⏳ |
| 110 | Ley de Protección Integral de la Niñez y Adolescencia (PINA) | ⏳ | ⏳ |
| 111 | Ley para Prevenir y Reprimir el Financiamiento del Terrorismo (Decreto 58-2005) | ⏳ | ⏳ |
| 112 | Ley Reguladora del Procedimiento de Extradición | ⏳ | ⏳ |
| 113 | Ley de Implementación del Control Telemático en el Proceso Penal | ⏳ | ⏳ |
| 114 | Convención de Viena sobre el Derecho de los Tratados | ⏳ | ⏳ |

### Leyes Laborales (7)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 115 | Ley de Servicio Civil | ⏳ | ⏳ |
| 116 | Ley de Servicio Municipal | ⏳ | ⏳ |
| 117 | Convenios Fundamentales de la OIT | ⏳ | ⏳ |
| 118 | Ley de Clases Pasivas Civiles del Estado | ⏳ | ⏳ |
| 119 | Ley de Servicio Civil del Organismo Judicial | ⏳ | ⏳ |
| 120 | Ley de Servicio Civil del Organismo Legislativo | ⏳ | ⏳ |
| 121 | Ley de Sindicalización y Regulación de la Huelga de los Trabajadores del Estado | ⏳ | ⏳ |

**Progreso: 13/121 ítems en DB ✅ — 108/121 pendientes ⏳**
_(Nota: ítem #1 son 3 leyes separadas. Además se cargó Ley General de Electricidad fuera del checklist de 121.)_

**Flujo de carga de contenido:** proyecto separado "LexGT Content Extractor" (`PDFtoSQLapp/pdf-sql-LEX/lex-extractor`) procesa documentos (PDF, Word, texto) y genera SQL compatible con el schema. Ver `SCHEMA_CONTEXT.md` en ese repo para los fixes pendientes al extractor. Output: un bloque SQL por ley, idempotente (`ON CONFLICT DO NOTHING`), ejecutado vía psql.

---

## Base de datos (Supabase — live, ya seeded)

**Conexión:** Session Pooler en `aws-1-us-east-1.pooler.supabase.com:5432`
Usuario: `postgres.enrykddxhqsibbokrood`
Las credenciales están en `.env.local` (no commiteado, en gitignore).

### Migrations aplicadas

| Archivo | Contenido |
|---|---|
| `0001_initial_schema.sql` | Tablas base: laws, sections, articles, paragraphs, annotations + RLS |
| `0002_versioning.sql` | Columnas de versioning en articles, tablas law_reforms y reform_notifications |
| `0003_reform_status.sql` | status en law_reforms, published_at nullable, tabla reform_draft_articles, función auth.is_admin() |
| `0004_user_profiles.sql` | Tabla user_profiles, trigger on_auth_user_created, función admin_find_user_by_email |
| `0005_annotations_color_note.sql` | Idempotent: `color NOT NULL DEFAULT 'yellow'`, `note nullable` |
| `0006_cases.sql` | Tablas `cases` y `case_annotations` (many-to-many) con RLS owner; cascade en ambas FKs |
| `0007_search.sql` | `search_vector tsvector` en articles y paragraphs, índices GIN, triggers automáticos, backfill completo |
| `0008_collections.sql` | Tablas `law_collections` y `law_collection_items`. Seed de 7 colecciones predeterminadas. |

### Tablas activas

| Tabla | Notas |
|---|---|
| `laws` | 15 leyes reales cargadas (ver checklist). Columna clave: `slug` (único), `is_active`. |
| `sections` | Jerarquía: libro → titulo → capitulo → seccion → parte → parrafo → subseccion → articulo → disposiciones. Columna `heading` (no `title`). |
| `articles` | Versioning: `version_number`, `superseded_at`, `previous_version_id`, `reform_id`. `search_vector` indexado. |
| `paragraphs` | Texto por artículo, ordenado por `position`. `search_vector` indexado. |
| `annotations` | Owner CRUD. `is_pinned_to_old_version` para annotations migradas. |
| `law_reforms` | `status`: `'draft'` \| `'published'`. `published_at` nullable. |
| `reform_notifications` | RLS owner-only SELECT + INSERT. |
| `reform_draft_articles` | RLS admin-only. |
| `user_profiles` | `tier`: `'free'` \| `'pro'`. `tier_expires_at` nullable. Trigger en signup. |
| `cases` | Carpetas Pro. `color`: gray/blue/green/red/amber/purple. RLS owner. |
| `case_annotations` | Many-to-many. `unique(case_id, annotation_id)`. FK cascade en ambas. |
| `law_collections` | 7 colecciones seeded. `is_default=true` en `default`. RLS lectura pública. |
| `law_collection_items` | Items activos solo para las leyes en prod. RLS lectura pública. `law_id` es UUID. |

### Colecciones predeterminadas (seeded)

| Slug | Nombre | Items activos |
|---|---|---|
| `default` | Biblioteca completa | codigo-civil |
| `derecho-civil` | Derecho Civil | codigo-civil |
| `derecho-penal` | Derecho Penal | — (pendiente contenido) |
| `derecho-laboral` | Derecho Laboral | — (pendiente contenido) |
| `derecho-mercantil` | Derecho Mercantil | — (pendiente contenido) |
| `derecho-tributario` | Derecho Tributario | — (pendiente contenido) |
| `derecho-municipal` | Derecho Municipal | — (pendiente contenido) |

Items se agregan automáticamente al cargar cada ley en Phase 10.

### Tablas pendientes de migrar

```sql
-- Phase 13 (jurisprudencias Pro)
saved_jurisprudences: id, user_id, source ('CC'|'CSJ'), external_id, title, full_text, url, saved_at
```

### RLS resumen

| Tabla | Política |
|---|---|
| `laws`, `sections`, `articles`, `paragraphs` | Lectura pública |
| `law_collections`, `law_collection_items` | Lectura pública; INSERT/UPDATE/DELETE solo admin |
| `annotations` | Owner CRUD |
| `cases` | Owner all |
| `case_annotations` | Owner all (via join a cases) |
| `law_reforms` | SELECT público; INSERT/UPDATE solo admin |
| `reform_notifications` | SELECT + INSERT solo owner |
| `reform_draft_articles` | CRUD solo admin |
| `user_profiles` | SELECT + UPDATE owner; INSERT + UPDATE admin |

### Funciones PostgreSQL

- `public.is_admin()` — verifica JWT para RLS. En schema `public`.
- `public.handle_new_user()` — trigger que crea fila en `user_profiles` al registrarse.
- `public.admin_find_user_by_email(email)` — security definer, busca usuario sin service role key.

---

## Modos de navegación — planificado (Phase 11)

El sidebar tiene un selector de modo que reorganiza la lista de leyes según un contexto de trabajo.

### Tres tipos de modo

| Tipo | Quién lo define | Disponible para |
|---|---|---|
| Default (Biblioteca completa) | Curador | Todos |
| Rama del derecho | Curador | Todos |
| Caso | El usuario | Solo Pro |

El usuario no puede crear ni modificar modos predeterminados. Solo puede activar modos de caso a partir de sus casos Pro existentes.

### Modos predeterminados (7)

| Slug | Nombre | Leyes incluidas |
|---|---|---|
| `default` | Biblioteca completa | Constitución → todos los códigos → leyes vigentes |
| `derecho-civil` | Derecho Civil | Código Civil, Procesal Civil y Mercantil, Código de Comercio, Ley del Organismo Judicial |
| `derecho-penal` | Derecho Penal | Constitución (Título VI), Código Penal, Código Procesal Penal |
| `derecho-laboral` | Derecho Laboral | Constitución (Título II), Código de Trabajo |
| `derecho-mercantil` | Derecho Mercantil | Código de Comercio, Código Civil (Libro V), Ley del Organismo Judicial |
| `derecho-tributario` | Derecho Tributario | Código Tributario, Constitución (Art. 239-243) |
| `derecho-municipal` | Derecho Municipal | Código Municipal, Ley del Organismo Judicial, Constitución (Título VI) |

### Modo "Caso" (Pro)

- El usuario selecciona uno de sus casos en el selector de modo
- **Sidebar izquierdo:** solo muestra las leyes que tienen highlights de ese caso, ordenadas por cantidad de highlights (descendente)
- **Panel derecho:** cambia automáticamente a la lista de highlights de ese caso (el contenido que hoy está en `/casos/[id]`)
- Click en un highlight del panel derecho → navega al artículo y hace scroll al fragmento
- La lista de leyes se deriva en runtime: `case_annotations → annotations → paragraphs → articles → sections → laws` — no requiere tabla adicional

### Impacto en el layout

- Selector de modo: en la parte superior del sidebar izquierdo
- Modo default activo al entrar (o el último usado, guardado en localStorage)
- En modo "Caso": el panel derecho se bloquea en la tab de highlights del caso activo
- En cualquier otro modo: panel derecho funciona normalmente (Notas / Caso / Concordancias / Historial)

---

## Búsqueda full-text — Phase 9 ✓

- **`0007_search.sql`:** `search_vector tsvector` en `articles` y `paragraphs`, índices GIN, triggers automáticos, backfill completo.
- **`GET /api/search`:** parámetros `q` (mínimo 2 chars), `law` (slug, opcional), `limit` (default 20, max 50). Deduplica por `article_id`.
- **Response shape:**
  ```ts
  {
    results: Array<{
      article_id: string
      article_number: string
      article_heading: string | null
      snippet: string
      law_slug: string
      law_short_name: string
      section_id: string
    }>
    total: number
    query: string
  }
  ```
- **`/buscar`:** Server Component. Estado vacío, sin resultados, lista con snippet + ley + link a `#articulo-[N]`.
- **Header:** input búsqueda desktop + mobile. Submit → `/buscar?q=`. ⌘K en Phase 11.
- **Anclas:** `id="articulo-[N]"` en cada artículo de la vista de lectura.

---

## Versioning de artículos — implementado

- `articles.is_current = false` en versiones antiguas, nunca se borran.
- `law_reforms` + `reform_notifications` para tracking por usuario.
- Flujo de notificación en `/leyes` con badge rojo, `ReformModal` con IntersectionObserver.
- Panel admin en `/admin/reformas` para crear, revisar y publicar reformas.

---

## Panel de administrador (`/admin`)

- Protección doble: middleware + layout.
- Rol admin: `user_metadata.role = 'admin'` en Supabase dashboard.
- Rutas: `/admin`, `/admin/reformas/nueva`, `/admin/reformas/[id]`

---

## Rediseño visual — Phase 11

Mock funcional ya creado en Claude Design. Auditado contra el schema real.

**Cambios confirmados para implementar:**
- Layout: sidebar izquierdo fijo + panel derecho deslizable (Notas / Caso / Concordancias / Historial)
- Header: barra de búsqueda central con ⌘K
- Sidebar: selector de modo en la parte superior, sección "Leyes" unificada, "Jurisprudencias" como Próximamente, sin Favoritos
- TOC como pantalla propia, lectura con side rail colapsable
- Concordancias: tab presente, estado vacío ("próximamente")
- 6 tokens de color para casos (pendiente definir en Design)

**Pantallas pendientes en Design:** `/leyes`, `/leyes/[slug]`, `/buscar`, `/casos`, `/casos/[id]`, auth, diff de reforma, landing page, selector de modo en sidebar, panel derecho en modo "Caso".

---

## Estructura de archivos

```
app/
  page.tsx                              → redirect a /leyes
  layout.tsx                            → root layout con <Header /> global
  globals.css
  api/
    search/
      route.ts                          → GET /api/search?q=&law=&limit=
  buscar/
    page.tsx                            → página de resultados full-text
  leyes/
    page.tsx                            → lista de leyes + badges de reformas pendientes
    actions.ts                          → saveAnnotation, deleteAnnotation, updateAnnotationNote,
                                          migrateAnnotations, markReformSeen, publishReform
    [slug]/
      page.tsx                          → tabla de contenidos con árbol de secciones
      [section_id]/
        page.tsx                        → vista de lectura: artículos + párrafos + highlights
  casos/
    page.tsx                            → lista de casos (guard Pro)
    CasesClient.tsx                     → modal "Nuevo caso" + lista
    actions.ts                          → createCase, deleteCase, addAnnotationToCase, removeAnnotationFromCase
    [id]/
      page.tsx                          → detalle de caso
  auth/
    actions.ts                          → signOut()
    login/page.tsx
    register/page.tsx
  admin/
    layout.tsx
    page.tsx
    actions.ts                          → findArticle, createReformDraft, approveReform, setUserTier
    TierForm.tsx
    reformas/
      nueva/
        page.tsx
        NewReformForm.tsx
      [id]/
        page.tsx

components/
  Header.tsx                            → header global + barra de búsqueda (desktop + mobile)
  SearchBar.tsx                         → client component: form → /buscar?q=; mobile: lupa icon
  ParagraphHighlighter.tsx              → selección de texto, tooltip, highlights, "Guardar en caso"
  LawCard.tsx                           → card de ley con badge de reformas + modal
  ReformModal.tsx                       → modal de reforma con IntersectionObserver

lib/
  supabase.ts                           → createClient() — browser ONLY
  supabase-server.ts                    → createServerSupabaseClient() — server only
  get-user-tier.ts                      → getUserTier(supabase): Promise<Tier> — server-only
  types.ts                              → Law, Section, Article, Paragraph, ArticleWithParagraphs,
                                          SectionNode, Annotation, LawReform, ReformNotification,
                                          Tier, UserProfile, Case, CaseAnnotation,
                                          LawCollection, LawCollectionItem

middleware.ts                           → refresca cookie; protege /admin/*

supabase/
  migrations/
    0001_initial_schema.sql
    0002_versioning.sql
    0003_reform_status.sql
    0004_user_profiles.sql
    0005_annotations_color_note.sql
    0006_cases.sql
    0007_search.sql
    0008_collections.sql                → law_collections + law_collection_items + 7 colecciones seeded
  seed.sql                              → Código Civil completo
  seeds/
    test_reform.sql                     → reforma ficticia para pruebas
    codigo_trabajo.sql                  → SQL placeholder (20 artículos inventados — reemplazar con real)
```

---

## Páginas implementadas

### `/leyes`
Lista leyes activas con badge de reformas pendientes por tier (anónimo 7d, free 1m, pro 6m).

### `/leyes/[slug]`
Tabla de contenidos. Árbol recursivo (libro → titulo → capitulo).

### `/leyes/[slug]/[section_id]`
Vista de lectura. Sticky breadcrumb. `max-w-2xl`. Highlighting por tier. Anclas `#articulo-[N]`.

### `/buscar`
Búsqueda full-text. Input en header → redirect. Resultados con snippet, ley, link directo al artículo.

### `/casos` y `/casos/[id]`
Carpetas Pro. CRUD completo. Highlights con color, nota y referencia a artículo.

### `/auth/login` y `/auth/register`
Client Components. Errores inline. Trigger crea `user_profiles` en signup.

### `/admin` y subrutas
Panel protegido. Gestión de reformas (crear/revisar/publicar) y tiers de usuarios.

---

## Build order

- ✓ Phase 1: Database schema
- ✓ Phase 2: Auth + estructura de tiers
- ✓ Phase 3: Seed Código Civil + law browser
- ✓ Phase 4: Read (TOC + vista de lectura)
- ✓ Phase 5: Basic highlighting (free tier, amarillo)
- ✓ Phase 6: Versioning logic
- ✓ Phase 6.5: Panel admin
- ✓ Phase 7: Pro tier (user_profiles + multi-color highlights + notes)
- ✓ Phase 8: Casos (Pro)
- ✓ Phase 9: Búsqueda full-text (tsvector + GIN + /buscar + header search)
- ◑ Phase 10: Contenido — 13/121 ítems cargados (15 leyes). Extractor necesita fixes (ver SCHEMA_CONTEXT.md en lex-extractor)
- [ ] Phase 11: Web polish + rediseño completo (mock listo en Claude Design, auditoría completa)
          Incluye: nuevo layout, sidebar con modos de navegación, panel derecho, ⌘K, landing page
          Requiere: 0008_collections.sql ✓ ya aplicado
- [ ] Phase 12: Deploy (Vercel + Supabase free tier, $0)
- [ ] Phase 13: Jurisprudencias (Railway + Playwright, ~$5/mes, post-launch)
- [ ] Phase 14: Pagos (Visanet)
- [ ] Phase 15: Mobile (React Native / Expo)

---

## Lo que falta construir

- **Phase 10:** 13/121 ítems cargados. Continuar con el extractor una vez aplicados los fixes en `SCHEMA_CONTEXT.md` (5 bugs de schema documentados). El archivo `supabase/seeds/codigo_trabajo.sql` era placeholder — ya reemplazado con contenido real.
- **Phase 11:** rediseño visual completo. Incluye selector de modos de navegación en sidebar. `0008_collections.sql` ya está aplicado — Phase 11 puede arrancar en cualquier momento.
- **Phase 12:** deploy en Vercel. Dominio cuando haya usuarios reales.
- **Phase 13:** jurisprudencias — Railway + Playwright para scraping CC/CSJ (ASP.NET WebForms con `__VIEWSTATE`, requiere browser headless).
- **Phase 14:** pagos — Visanet. Schema ya preparado, solo webhook de tier.
- **Phase 15:** mobile — React Native / Expo.
- **Password reset / OAuth:** no implementado.
- **Landing page:** incluida en Phase 11.
- **Design pendiente:** tokens de color de caso (6), pantallas `/leyes`, `/leyes/[slug]`, `/buscar`, `/casos`, `/casos/[id]`, auth, diff de reforma, landing page, selector de modo, panel derecho en modo "Caso".

---

## Decisiones técnicas relevantes

1. **`supabase.ts` vs `supabase-server.ts` separados:** obligatorio — `next/headers` rompe Client Components.
2. **`sections.kind` en español:** `libro/titulo/capitulo/seccion/parte/parrafo/subseccion/articulo/disposiciones`. La columna es `heading` (no `title`). KIND_LABEL maps usan estas claves.
3. **Server Actions para mutaciones:** signOut, saveAnnotation, deleteAnnotation, migrateAnnotations, markReformSeen, publishReform, createReformDraft, approveReform, setUserTier.
4. **Middleware protege `/admin/*`:** doble chequeo con layout. Rol via `user_metadata.role = 'admin'`.
5. **`public.is_admin()`:** en schema `public`, no `auth` (Supabase no permite CREATE en `auth`).
6. **`getUserTier(supabase)`:** server-only, recibe cliente existente, verifica expiración.
7. **Ventana de reformas por tier:** anónimo 7 días, free 1 mes, pro 6 meses.
8. **`approveReform` ≠ `publishReform`:** approveReform reutiliza reform_id del borrador. publishReform crearía duplicado.
9. **Tooltip via portal:** `createPortal(…, document.body)` para evitar `<div>` hijo de `<p>` (hydration error).
10. **`case_annotations` many-to-many:** unique constraint + FK cascade. Colaboración futura = solo agregar `case_members` sin refactor.
11. **Búsqueda:** `plainto_tsquery('spanish', q)` sobre `tsvector`. Búsqueda en articles y paragraphs en paralelo, deduplicada por article_id. IDs en response son strings (UUID), no numbers.
12. **Content Extractor:** proyecto separado en claude.ai genera SQL idempotente (`ON CONFLICT DO NOTHING`) desde cualquier formato. Nunca hardcodea IDs.
13. **Jurisprudencias free = session only:** no saturar DB con 3,500+ docs de usuarios no pagos.
14. **"Guardar en caso":** lazy fetch de casos al primer click en tooltip. Cache en-memoria mientras tooltip abierto.
15. **Modos de navegación — colecciones curadas:** `law_collections` + `law_collection_items` con RLS pública. `law_id` es UUID (no integer) — consistente con `laws.id` en el schema real. Los modos de caso se derivan en runtime desde `case_annotations`, sin tabla adicional. El modo activo se guarda en localStorage en el cliente.
