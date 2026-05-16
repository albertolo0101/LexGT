# LexGT — Contexto del proyecto

Última actualización: 2026-05-15

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

### Tablas actuales

| Tabla | Filas | Notas |
|---|---|---|
| `laws` | 1 | Código Civil (Decreto Ley 106, slug: `codigo-civil`) |
| `sections` | ~100+ | Jerarquía: libro → titulo → capitulo |
| `articles` | 1,996 | Todos `is_current=true`, versioning preparado |
| `paragraphs` | miles | Texto por artículo, ordenado por `position` |
| `annotations` | 0 | Schema listo, UI implementada (Phase 5) |

**Constraint importante:** `sections.kind` usa valores en español: `libro`, `titulo`, `capitulo`, `seccion`, `parte`.

### Tablas pendientes de diseñar/migrar

#### `cases` (Pro)
Carpetas de trabajo personales. Diseñadas para soportar colaboración futura sin necesidad de refactor.
```sql
cases
  id            uuid PK
  user_id       uuid FK → auth.users
  title         text
  description   text nullable
  color         text nullable        -- para UI
  created_at    timestamptz
  updated_at    timestamptz
```

#### `case_annotations` (relación many-to-many)
Una annotation puede pertenecer a múltiples casos.
```sql
case_annotations
  id              uuid PK
  case_id         uuid FK → cases
  annotation_id   uuid FK → annotations
  created_at      timestamptz
```

> **Nota para colaboración futura:** agregar `case_members (case_id, user_id, role)` sin tocar el resto del schema.

#### `saved_jurisprudences` (Pro)
Jurisprudencias guardadas por el usuario. Los free solo pueden leer en sesión.
```sql
saved_jurisprudences
  id              uuid PK
  user_id         uuid FK → auth.users
  source          text        -- 'CC' | 'CSJ'
  external_id     text        -- ID del expediente en el sistema fuente
  title           text
  full_text       text
  url             text        -- URL original en el sistema fuente
  saved_at        timestamptz
```

### RLS
- `laws`, `sections`, `articles`, `paragraphs`: lectura pública (`for select using (true)`)
- `annotations`: solo el dueño puede leer/escribir/editar/borrar
- `cases`, `case_annotations`, `saved_jurisprudences`: solo el dueño (pendiente de implementar)

---

## Jurisprudencias — integración

**Fuentes:** Corte de Constitucionalidad (CC) y Corte Suprema de Justicia (CSJ). No tienen API pública — la integración es vía web scraping o similar.

**Flujo:**
- El usuario busca desde dentro de LexGT
- Los resultados se muestran en un panel integrado dentro de la app (no redirige al sitio oficial)
- Free: puede buscar y leer durante la sesión. Nada se persiste en DB.
- Pro: puede guardar el documento completo en `saved_jurisprudences`. Puede hacer annotations sobre jurisprudencias guardadas.

**Implementación pendiente de diseñar.** Evaluar si el scraping corre en un backend separado (Railway/Render) o como Route Handler de Next.js.

---

## Versioning de artículos

- Cada artículo tiene `is_current` — las versiones antiguas se marcan como superseded, nunca se borran.
- Cuando un artículo cambia, se inserta una nueva versión.
- Si el usuario tiene annotations sobre la versión antigua:
  - Se le notifica.
  - Puede: mantener las annotations ancladas a la versión antigua (modo lectura) o migrarlas manualmente a la nueva versión.
- Solo el artículo/sección cambiado se reemplaza, nunca la ley completa.

**Implementación pendiente.**

---

## Estructura de archivos

```
app/
  page.tsx                              → redirect a /leyes
  layout.tsx                            → root layout con <Header /> global
  globals.css
  leyes/
    page.tsx                            → lista de leyes (server component)
    actions.ts                          → server actions: saveAnnotation(), deleteAnnotation()
    [slug]/
      page.tsx                          → tabla de contenidos con árbol de secciones
      [section_id]/
        page.tsx                        → vista de lectura: artículos + párrafos + highlights
  auth/
    actions.ts                          → server action: signOut()
    login/
      page.tsx                          → formulario login (client component)
    register/
      page.tsx                          → formulario registro (client component)

components/
  Header.tsx                            → header global con estado de auth (server component)
  ParagraphHighlighter.tsx              → client component: selección de texto, tooltip, highlights amarillos

lib/
  supabase.ts                           → createClient() — browser client ONLY
  supabase-server.ts                    → createServerSupabaseClient() — server only (usa next/headers)
  types.ts                              → tipos: Law, Section, Article, Paragraph, ArticleWithParagraphs, SectionNode, Annotation

middleware.ts                           → refresca la cookie de sesión en cada request

supabase/
  migrations/0001_initial_schema.sql    → schema completo (ya aplicado en prod)
  seed.sql                              → Código Civil completo (ya aplicado en prod)
```

**Importante:** `lib/supabase.ts` y `lib/supabase-server.ts` están separados intencionalmente. Si se juntan en un solo archivo, el `import { cookies } from "next/headers"` rompe los Client Components que importan `createClient()`.

---

## Páginas implementadas

### `/leyes`
Lista todas las leyes activas. Cards con `short_name`, `full_name`, `decree`. Link a `/leyes/[slug]`.

### `/leyes/[slug]`
Tabla de contenidos. Árbol recursivo (libro → titulo → capitulo). Las secciones hoja son links a `/leyes/[slug]/[section_id]`.

### `/leyes/[slug]/[section_id]`
Vista de lectura. Artículos + párrafos. Sticky breadcrumb. `max-w-2xl`. Highlighting amarillo para usuarios autenticados — selección de texto muestra tooltip "Destacar"; click en mark amarillo muestra tooltip "Eliminar". Annotations se fetchean server-side y se renderizan con `ParagraphHighlighter`.

### `/auth/login`
Client Component. Llama `supabase.auth.signInWithPassword()`. Error inline en caso de fallo. Redirige a `/leyes` y hace `router.refresh()` en éxito.

### `/auth/register`
Client Component. Llama `supabase.auth.signUp()`. Maneja dos casos: si Supabase devuelve sesión inmediata → redirect a `/leyes`; si requiere confirmación de email → muestra pantalla de éxito con instrucciones.

### Header global (en layout)
Server Component. Lee `supabase.auth.getUser()` en el servidor. Muestra: email del usuario + botón "Cerrar sesión" (server action) cuando está autenticado; link "Iniciar sesión" cuando no lo está.

---

## Middleware

`middleware.ts` llama `supabase.auth.getUser()` en cada request para refrescar cookies. No redirige — las páginas de lectura son públicas por diseño. Las features Pro/auth sí requieren protección (pendiente).

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
- [ ] Phase 6: Versioning logic
- [ ] Phase 7: Pro tier (multi-color highlights + notas)
- [ ] Phase 8: Casos (Pro)
- [ ] Phase 9: Jurisprudencias (scraping + panel integrado)
- [ ] Phase 10: Más contenido (500+ leyes, decretos)
- [ ] Phase 11: Web polish + landing page
- [ ] Phase 12: Mobile (React Native / Expo)

---

## Lo que falta construir

- **Versioning UI:** notificaciones cuando un artículo cambia, flujo de migración de annotations.
- **Pro tier enforcement:** lógica de negocio para restringir features por tier.
- **Casos:** schema pendiente de migrar, UI pendiente de construir.
- **Jurisprudencias:** scraping + panel de búsqueda integrado.
- **Más contenido:** agregar leyes, códigos y decretos al seed.
- **Password reset:** Supabase lo soporta, no está en la UI.
- **OAuth:** no implementado, solo email/password.
- **Mobile nav:** responsive básico, sin nav mobile.
- **Deploy:** no hay CI/CD ni configuración de Vercel.
- **Landing page:** mock ya existe (stats: 500+ leyes, 12 códigos, 1,200+ decretos, 3,500+ jurisprudencias; features: búsqueda avanzada, biblioteca organizada, siempre actualizado).

---

## Decisiones técnicas relevantes

1. **`supabase.ts` vs `supabase-server.ts` separados:** obligatorio — `next/headers` no se puede importar en Client Components. Si alguien los junta, todos los formularios de auth se rompen.

2. **`sections.kind` en español:** el seed usa `libro/titulo/capitulo`. El schema fue migrado de inglés a español durante el setup inicial. Los `KIND_LABEL` maps en los pages usan estas mismas claves.

3. **Server Actions para sign out:** `signOut()` en `app/auth/actions.ts` es un Server Action porque necesita acceso a cookies del servidor para limpiar la sesión. Los formularios de login/register son Client Components porque necesitan estado React para errores.

4. **No hay rutas protegidas todavía:** el middleware solo refresca la sesión, no redirige. Las páginas de lectura son públicas por diseño (RLS permite lectura pública). Pro features requerirán protección.

5. **`case_annotations` many-to-many:** una annotation puede pertenecer a múltiples casos. Schema diseñado para agregar colaboración futura con solo una tabla nueva (`case_members`) sin refactor.

6. **Jurisprudencias free = session only:** para no saturar la DB con 3,500+ documentos de usuarios no pagos. Guardado local en el cliente queda a criterio del usuario.

7. **Tooltip de highlighting via portal:** `ParagraphHighlighter` renderiza el tooltip con `createPortal(…, document.body)` para evitar que un `<div>` sea hijo de `<p>`, lo que causaría hydration errors en Next.js.
