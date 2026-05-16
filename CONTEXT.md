# LexGT — Contexto del proyecto

Última actualización: 2026-05-16 (Phase 8 completa)

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
| Buscar jurisprudencias (CC + CSJ) | ✓ sesión only | ✓ |
| Highlights | 1 color (amarillo) | 4 colores (amarillo, verde, azul, rosado) |
| Notas de texto | ✗ | ✓ |
| Guardar jurisprudencias | ✗ | ✓ texto completo |
| Casos (carpetas de trabajo) | ✗ | ✓ |
| Notificaciones de versioning | ✗ | ✓ |

**Free tier — jurisprudencias:** el usuario puede buscar y leer durante la sesión, pero nada se guarda en la DB. El propósito es no saturar la base con 3,500+ documentos para usuarios que no pagan.

**Tier storage:** el tier de cada usuario se guarda en `user_profiles.tier` ('free' | 'pro'). Se lee con `lib/get-user-tier.ts`. El admin puede cambiarlo desde `/admin`. Los usuarios anónimos siempre son tratados como 'free' en la lógica de negocio, pero se muestran como 'anonymous' en algunos contextos de UI (p.ej. ventana de reformas = 7 días).

---

## Contenido objetivo al launch

| Tipo | Cantidad |
|---|---|
| Leyes vigentes | 500+ |
| Códigos | 12 |
| Decretos | 1,200+ |
| Jurisprudencias (CC + CSJ) | 3,500+ |

Actualmente solo hay seed del **Código Civil** (Decreto Ley 106). El schema soporta múltiples leyes.

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
| `0005_annotations_color_note.sql` | Idempotent: `color NOT NULL DEFAULT 'yellow'`, `note nullable` (ya existían en 0001; migration de tracking) |
| `0006_cases.sql` | Tablas `cases` y `case_annotations` (many-to-many) con RLS owner; cascade en ambas FKs |

### Tablas activas

| Tabla | Notas |
|---|---|
| `laws` | 1 fila: Código Civil (slug: `codigo-civil`) |
| `sections` | Jerarquía: libro → titulo → capitulo. `kind` en español. |
| `articles` | 1,996+ filas. Columnas de versioning: `version_number`, `superseded_at`, `previous_version_id`, `reform_id`. `is_current=false` en versiones antiguas. |
| `paragraphs` | Texto por artículo, ordenado por `position` |
| `annotations` | Solo el dueño puede leer/escribir. `is_pinned_to_old_version` para annotations migradas. |
| `law_reforms` | Reformas publicadas y borradores. `status`: `'draft'` | `'published'`. `published_at` nullable (null en drafts). |
| `reform_notifications` | Reformas ya vistas por el usuario. RLS owner-only SELECT + INSERT. |
| `reform_draft_articles` | Texto nuevo por artículo antes de publicar. RLS admin-only. |
| `user_profiles` | Un row por usuario auth. `tier`: `'free'` | `'pro'`. `tier_expires_at` nullable. Creado automáticamente en signup via trigger. |

### Tablas activas (continuación)

| Tabla | Notas |
|---|---|
| `cases` | Carpetas Pro. `color` string preset (gray/blue/green/red/amber/purple). RLS owner all. |
| `case_annotations` | Many-to-many. `unique(case_id, annotation_id)`. FK cascade en ambas. RLS via join a cases. |

### Tablas pendientes de migrar

#### `saved_jurisprudences` (Pro)
```sql
saved_jurisprudences: id, user_id, source ('CC'|'CSJ'), external_id, title, full_text, url, saved_at
```

### RLS resumen

| Tabla | Política |
|---|---|
| `laws`, `sections`, `articles`, `paragraphs` | Lectura pública |
| `annotations` | Owner CRUD |
| `cases` | Owner all |
| `case_annotations` | Owner all (via join a cases) |
| `law_reforms` | SELECT público; INSERT/UPDATE solo admin (`auth.is_admin()`) |
| `reform_notifications` | SELECT + INSERT solo owner |
| `reform_draft_articles` | CRUD solo admin |
| `user_profiles` | SELECT + UPDATE owner; INSERT + UPDATE admin |

### Funciones PostgreSQL

- `public.is_admin()` — verifica `auth.jwt()->'user_metadata'->>'role' = 'admin'`. Usada en RLS. (Originalmente escrita como `auth.is_admin()` pero Supabase SQL Editor no permite crear funciones en el schema `auth`.)
- `public.handle_new_user()` — trigger `security definer` que crea fila en `user_profiles` al registrarse.
- `public.admin_find_user_by_email(email)` — `security definer`, verifica admin, retorna `uuid` del usuario. Permite al panel admin buscar usuarios sin service role key.

### Seed de prueba

`supabase/seeds/test_reform.sql` — inserta una reforma ficticia sobre el Artículo 1 del Código Civil: clona la versión 1 en versión 2 con texto modificado y la marca como superseded. Útil para probar la UI de reformas.

---

## Jurisprudencias — integración

**Fuentes:** Corte de Constitucionalidad (CC) y Corte Suprema de Justicia (CSJ). No tienen API pública — la integración es vía web scraping o similar.

**Flujo:**
- El usuario busca desde dentro de LexGT
- Los resultados se muestran en un panel integrado dentro de la app (no redirige al sitio oficial)
- Free: puede buscar y leer durante la sesión. Nada se persiste en DB.
- Pro: puede guardar en `saved_jurisprudences` y hacer annotations sobre ellas.

**Implementación pendiente de diseñar.** Evaluar si el scraping corre en un backend separado (Railway/Render) o como Route Handler de Next.js.

---

## Versioning de artículos — implementado

- `articles.is_current = false` en versiones antiguas, nunca se borran.
- `previous_version_id` apunta al artículo anterior; `reform_id` apunta a la reforma que lo creó.
- `law_reforms` registra cada reforma con `published_at` y `status`.
- `reform_notifications` guarda qué reformas ya vio cada usuario.

### Flujo de notificación (UI en /leyes)

1. `app/leyes/page.tsx` (Server Component) calcula las reformas no vistas por tier:
   - Anónimo: últimos 7 días
   - Free: último mes
   - Pro: últimos 6 meses
2. Pasa `pendingReforms` y `articlePairsByReform` a cada `<LawCard>`.
3. `LawCard` muestra badge rojo con el número. Al click abre `ReformModal`.
4. `ReformModal` bloquea botones hasta que el usuario llega al fondo (IntersectionObserver).
5. Si el usuario tiene annotations en artículos superseded → botones "Borrar mis notas" o "Conservar como anexo". Si no → "Entendido".
6. Al confirmar: llama `migrateAnnotations()` (si aplica) y luego `markReformSeen()`.

### Flujo de publicación (panel admin)

1. Admin crea borrador en `/admin/reformas/nueva`: selecciona ley, busca artículos por número, pega texto nuevo.
2. `createReformDraft()` inserta en `law_reforms (status='draft')` y `reform_draft_articles`.
3. Admin revisa en `/admin/reformas/[id]`: vista lado a lado del texto vigente vs nuevo.
4. "Publicar reforma" → `approveReform()`: inserta nueva versión de cada artículo, marca la vieja como superseded, actualiza `status='published'`.

---

## Panel de administrador (`/admin`)

- **Protección doble:** middleware redirige a `/` si `user.user_metadata.role !== 'admin'`; el layout hace un segundo chequeo.
- **Rol admin:** se setea manualmente en el dashboard de Supabase (`user_metadata.role = 'admin'`). No hay migration para esto.
- **Rutas:**
  - `/admin` — lista de reformas en borrador + formulario de gestión de tiers
  - `/admin/reformas/nueva` — formulario de creación de reforma (Server Component wrapper + Client Component form)
  - `/admin/reformas/[id]` — revisión y publicación de reforma

---

## Estructura de archivos

```
app/
  page.tsx                              → redirect a /leyes
  layout.tsx                            → root layout con <Header /> global
  globals.css
  leyes/
    page.tsx                            → lista de leyes + badges de reformas pendientes (server component)
    actions.ts                          → saveAnnotation (color + note + Pro validation),
                                          deleteAnnotation, updateAnnotationNote (Pro only),
                                          migrateAnnotations, markReformSeen, publishReform
    [slug]/
      page.tsx                          → tabla de contenidos con árbol de secciones
      [section_id]/
        page.tsx                        → vista de lectura: artículos + párrafos + highlights
  casos/
    page.tsx                            → lista de casos (server component, guard Pro)
    CasesClient.tsx                     → client component: modal "Nuevo caso" + lista
    actions.ts                          → createCase, deleteCase, addAnnotationToCase, removeAnnotationFromCase
    [id]/
      page.tsx                          → detalle de caso: highlights + notas (server component)
  auth/
    actions.ts                          → server action: signOut()
    login/page.tsx                      → formulario login (client component)
    register/page.tsx                   → formulario registro (client component)
  admin/
    layout.tsx                          → sidebar admin + doble chequeo de rol (server component)
    page.tsx                            → lista de borradores + TierForm
    actions.ts                          → findArticle, createReformDraft, approveReform, setUserTier
    TierForm.tsx                        → client component: form para cambiar tier de un usuario
    reformas/
      nueva/
        page.tsx                        → server wrapper (fetcha leyes)
        NewReformForm.tsx               → client component: formulario completo de reforma
      [id]/
        page.tsx                        → revisión de borrador + botón publicar (server component)

components/
  Header.tsx                            → header global con estado de auth (server component)
  ParagraphHighlighter.tsx              → client component: selección de texto, tooltip, highlights
  LawCard.tsx                           → client component: card de ley con badge de reformas + modal
  ReformModal.tsx                       → client component: modal de reforma con IntersectionObserver

lib/
  supabase.ts                           → createClient() — browser client ONLY
  supabase-server.ts                    → createServerSupabaseClient() — server only (usa next/headers)
  get-user-tier.ts                      → getUserTier(supabase): Promise<Tier> — server-only
  types.ts                              → Law, Section, Article, Paragraph, ArticleWithParagraphs,
                                          SectionNode, Annotation, LawReform, ReformNotification,
                                          Tier, UserProfile, Case, CaseAnnotation

middleware.ts                           → refresca cookie de sesión; protege /admin/* redirigiendo a /

supabase/
  migrations/
    0001_initial_schema.sql             → schema base (aplicado en prod)
    0002_versioning.sql                 → versioning columns + law_reforms + reform_notifications
    0003_reform_status.sql              → status en law_reforms + reform_draft_articles + auth.is_admin()
    0004_user_profiles.sql              → user_profiles + trigger + admin_find_user_by_email
    0005_annotations_color_note.sql     → idempotent tracking: color + note en annotations
  seed.sql                              → Código Civil completo (aplicado en prod)
  seeds/test_reform.sql                 → reforma ficticia sobre Artículo 1 para pruebas
```

---

## Páginas implementadas

### `/leyes`
Lista leyes activas. Cada `LawCard` muestra badge rojo si hay reformas no vistas. Click en card con reformas abre `ReformModal`; sin reformas es un `<Link>` normal. El tier del usuario se lee desde `user_profiles` via `getUserTier()`.

### `/leyes/[slug]`
Tabla de contenidos. Árbol recursivo (libro → titulo → capitulo). Las secciones hoja son links a la vista de lectura.

### `/leyes/[slug]/[section_id]`
Vista de lectura. Artículos + párrafos. Sticky breadcrumb. `max-w-2xl`. Highlighting con soporte de tier: Free = solo amarillo; Pro = 4 colores (amarillo, verde, azul, rosado) con selector de color al crear y editor de nota al click en mark existente. Annotations se fetchean server-side; `getUserTier()` corre en paralelo en el mismo `Promise.all`. Se pasa `tier` a `ParagraphHighlighter`.

### `/auth/login` y `/auth/register`
Client Components. Login llama `signInWithPassword()`, register llama `signUp()`. Ambos manejan errores inline. `register` muestra pantalla de éxito si Supabase requiere confirmación de email. Al registrarse, el trigger `on_auth_user_created` crea automáticamente la fila en `user_profiles`.

### `/admin`
Panel administrativo protegido. Lista reformas en borrador. Formulario `TierForm` para cambiar el tier de un usuario por email.

### `/admin/reformas/nueva`
Formulario para crear una reforma. Búsqueda de artículos por número dentro de una ley. Permite agregar múltiples artículos con su texto reformado. Guarda como borrador.

### `/admin/reformas/[id]`
Revisión de un borrador. Comparación lado a lado: texto vigente vs texto nuevo. Botón "Publicar reforma" ejecuta `approveReform()` via Server Action form.

### `/casos`
Server Component con guard Pro. Lista casos del usuario ordenados por `updated_at desc`. Muestra título, color (borde izquierdo), número de highlights y fecha. `CasesClient.tsx` maneja el modal "Nuevo caso" (título, descripción, color picker: gray/blue/green/red/amber/purple). Al crear: llama `createCase()` + `router.refresh()`.

### `/casos/[id]`
Server Component. Detalle del caso: título, descripción, lista de highlights via join `case_annotations → annotations → paragraphs + articles`. Muestra excerpt resaltado con el color correcto, nota si existe, artículo de referencia. Botones vía form actions: "Eliminar del caso" llama `removeAnnotationFromCase(caId)`, "Eliminar caso" llama `deleteCase(id)` que redirecta a `/casos`.

---

## Middleware

`middleware.ts` llama `getUser()` en cada request para refrescar cookies. Redirige `/admin/*` a `/` si el usuario no es admin. Las páginas de lectura son públicas por diseño.

---

## Variables de entorno

`.env.local` (no commiteado):
```
NEXT_PUBLIC_SUPABASE_URL=https://enrykddxhqsibbokrood.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`.env.local.example` está commiteado con las keys vacías como referencia.

---

## Build order

- ✓ Phase 1: Database schema
- ✓ Phase 2: Auth + estructura de tiers (base)
- ✓ Phase 3: Seed Código Civil + law browser
- ✓ Phase 4: Read (tabla de contenidos + vista de lectura)
- ✓ Phase 5: Basic highlighting (free tier, amarillo)
- ✓ Phase 6: Versioning logic (DB + UI de notificaciones + migración de annotations)
- ✓ Phase 6.5: Panel admin (crear/revisar/publicar reformas)
- ✓ Phase 7: Pro tier — S1 (user_profiles + getUserTier + admin tier management) + S2 (multi-color highlights + notes)
- ✓ Phase 8: Casos (Pro) — cases + case_annotations, /casos CRUD, "Guardar en caso" en highlights
- [ ] Phase 9: Jurisprudencias (scraping + panel integrado)
- [ ] Phase 10: Más contenido (500+ leyes, decretos)
- [ ] Phase 11: Web polish + landing page
- [ ] Phase 12: Mobile (React Native / Expo)

---

## Lo que falta construir

- **Phase 7 S2:** ✓ Completada. Highlights multi-color (verde, azul, rosado) y notas inline para Pro.
- **Casos:** ✓ Phase 8 completada. Schema migrado, CRUD implementado, integrado en ParagraphHighlighter.
- **Jurisprudencias:** scraping + panel de búsqueda integrado. Diseño pendiente.
- **Más contenido:** agregar leyes, códigos y decretos al seed.
- **Password reset:** Supabase lo soporta, no está en la UI.
- **OAuth:** no implementado, solo email/password.
- **Mobile nav:** responsive básico, sin nav mobile.
- **Deploy:** no hay CI/CD ni configuración de Vercel.
- **Landing page:** stats: 500+ leyes, 12 códigos, 1,200+ decretos, 3,500+ jurisprudencias.

---

## Decisiones técnicas relevantes

1. **`supabase.ts` vs `supabase-server.ts` separados:** obligatorio — `next/headers` no se puede importar en Client Components. Si se juntan, todos los formularios de auth se rompen.

2. **`sections.kind` en español:** el seed usa `libro/titulo/capitulo`. El schema fue migrado de inglés a español durante el setup inicial. Los `KIND_LABEL` maps en los pages usan estas mismas claves.

3. **Server Actions para mutaciones:** `signOut`, `saveAnnotation`, `deleteAnnotation`, `migrateAnnotations`, `markReformSeen`, `publishReform`, `createReformDraft`, `approveReform`, `setUserTier` — todos son Server Actions. Los formularios de login/register son Client Components porque necesitan estado React para errores.

4. **Middleware protege `/admin/*`:** doble chequeo — middleware redirige, layout también verifica. El rol admin se setea via Supabase dashboard en `user_metadata.role = 'admin'`.

5. **`public.is_admin()`:** función PostgreSQL que inspecciona el JWT para RLS. Usada en las policies de `law_reforms`, `reform_draft_articles` y `user_profiles`. Definida en `public` (no `auth`) porque Supabase SQL Editor no permite CREATE en el schema `auth`.

6. **`admin_find_user_by_email()`:** función `security definer` que permite al admin buscar usuarios en `auth.users` sin necesitar la service role key. Verifica internamente que el llamador sea admin.

7. **`getUserTier(supabase)`:** server-only (`import 'server-only'`). Recibe el cliente Supabase existente para reutilizarlo. Verifica expiración de tier. Se llama en paralelo con `getUser()` en `leyes/page.tsx` para no añadir latencia.

8. **Ventana de reformas por tier:** anónimo = 7 días, free = 1 mes, pro = 6 meses. Se aplica en `/leyes/page.tsx` como filtro de `published_at`.

9. **`migrateAnnotations` acción:** action en `leyes/actions.ts`. `delete` borra las annotations del artículo viejo. `migrate` crea nuevas annotations en el artículo nuevo con `char_start=0, char_end=0` y el texto original como blockquote en la nota. Usa join `paragraphs(text)` para recuperar el texto highlightado.

10. **`approveReform` no llama `publishReform`:** aunque ambas hacen el mismo trabajo de versioning, `approveReform` usa el `reform_id` ya existente (el borrador) en lugar de crear un row nuevo en `law_reforms`. Si se llamara `publishReform`, se crearía un duplicado.

11. **Tooltip de highlighting via portal:** `ParagraphHighlighter` renderiza el tooltip con `createPortal(…, document.body)` para evitar que un `<div>` sea hijo de `<p>`, lo que causaría hydration errors en Next.js.

12. **`case_annotations` many-to-many:** una annotation puede pertenecer a múltiples casos. Colaboración futura = agregar `case_members` sin refactor.

13. **Jurisprudencias free = session only:** para no saturar la DB con 3,500+ documentos de usuarios no pagos.

14. **`case_annotations` many-to-many:** `unique(case_id, annotation_id)` previene duplicados. FK cascade en `case_id → cases` y `annotation_id → annotations` — borrar caso o annotation limpia case_annotations automáticamente. Colaboración futura: agregar `case_members(case_id, user_id, role)` sin refactorizar nada.

15. **"Guardar en caso" en ParagraphHighlighter:** fetch de casos del usuario vía browser Supabase client (`createClient()`) al primer click — lazy load, cache en-memoria mientras el tooltip está abierto. El dropdown aparece inline dentro del tooltip (no un portal adicional).
