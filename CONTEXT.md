# LexGT — Contexto del proyecto

Última actualización: 2026-05-15

---

## Qué es este proyecto

**LexGT** es un lector de legislación guatemalteca. El objetivo es construir una app donde los usuarios puedan navegar y leer leyes (por ahora solo el Código Civil), marcar fragmentos y agregar notas (aún no implementado). Hay una visión de tiers free/pro, pero todavía no se ha diseñado.

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

## Base de datos (Supabase — live, ya seeded)

**Conexión:** Session Pooler en `aws-1-us-east-1.pooler.supabase.com:5432`
Usuario: `postgres.enrykddxhqsibbokrood`
Las credenciales están en `.env.local` (no commiteado, en gitignore).

### Tablas

| Tabla | Filas | Notas |
|---|---|---|
| `laws` | 1 | Código Civil (Decreto Ley 106, slug: `codigo-civil`) |
| `sections` | ~100+ | Jerarquía: libro → titulo → capitulo |
| `articles` | 1,996 | Todos `is_current=true`, versioning preparado |
| `paragraphs` | miles | Texto por artículo, ordenado por `position` |
| `annotations` | 0 | Schema listo, feature aún no construida |

**Constraint importante:** `sections.kind` usa valores en español: `libro`, `titulo`, `capitulo`, `seccion`, `parte` (fue corregido de inglés a español durante el setup).

### RLS
- `laws`, `sections`, `articles`, `paragraphs`: lectura pública (`for select using (true)`)
- `annotations`: solo el dueño puede leer/escribir/editar/borrar

---

## Estructura de archivos

```
app/
  page.tsx                              → redirect a /leyes
  layout.tsx                            → root layout con <Header /> global
  globals.css
  leyes/
    page.tsx                            → lista de leyes (server component)
    [slug]/
      page.tsx                          → tabla de contenidos con árbol de secciones
      [section_id]/
        page.tsx                        → vista de lectura: artículos + párrafos
  auth/
    actions.ts                          → server action: signOut()
    login/
      page.tsx                          → formulario login (client component)
    register/
      page.tsx                          → formulario registro (client component)

components/
  Header.tsx                            → header global con estado de auth (server component)

lib/
  supabase.ts                           → createClient() — browser client ONLY
  supabase-server.ts                    → createServerSupabaseClient() — server only (usa next/headers)
  types.ts                              → tipos: Law, Section, Article, Paragraph, ArticleWithParagraphs, SectionNode

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
Tabla de contenidos. Fetch de todas las secciones de la ley, construye árbol recursivo (libro → titulo → capitulo). Las secciones hoja (sin hijos) son links a `/leyes/[slug]/[section_id]`. Las secciones padre son headers visuales con indentación progresiva.

### `/leyes/[slug]/[section_id]`
Vista de lectura. Fetch de `articles` y `paragraphs` para esa sección. Sticky breadcrumb header. Artículos con `number`, `heading` y párrafos en orden. Ancho máximo `max-w-2xl` para legibilidad.

### `/auth/login`
Client Component. Llama `supabase.auth.signInWithPassword()`. Error inline en caso de fallo. Redirige a `/leyes` y hace `router.refresh()` en éxito.

### `/auth/register`
Client Component. Llama `supabase.auth.signUp()`. Maneja dos casos: si Supabase devuelve sesión inmediata → redirect a `/leyes`; si requiere confirmación de email → muestra pantalla de éxito con instrucciones.

### Header global (en layout)
Server Component. Lee `supabase.auth.getUser()` en el servidor. Muestra: email del usuario + botón "Cerrar sesión" (server action) cuando está autenticado; link "Iniciar sesión" cuando no lo está.

---

## Middleware

`middleware.ts` en la raíz llama `supabase.auth.getUser()` en cada request para refrescar la cookie de sesión. Excluye archivos estáticos. Es requerido por `@supabase/ssr` para que la sesión persista correctamente.

---

## Variables de entorno

`.env.local` (no commiteado):
```
NEXT_PUBLIC_SUPABASE_URL=https://enrykddxhqsibbokrood.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

`.env.local.example` está commiteado con las keys vacías como referencia.

---

## Git

- Branch: `main`
- Commits:
  - `6f2daf9` — Initial commit: scaffold + schema + seed + law browser
  - `dfc9ecb` — Add Supabase Auth: login, register, global header, middleware

---

## Lo que falta construir (próximos pasos posibles)

- **Annotations / highlights:** el schema ya existe, falta la UI. Las annotations apuntan a `paragraph_id` + offsets de caracteres (`char_start`, `char_end`). Requiere auth (ya lista).
- **Búsqueda:** full-text search sobre artículos y párrafos.
- **Más leyes:** solo hay un seed (Código Civil). El schema soporta múltiples leyes.
- **Password reset:** Supabase lo soporta, no está implementado en la UI.
- **OAuth:** no implementado, solo email/password.
- **Mobile nav:** las páginas son responsive básico pero no hay nav mobile.
- **Tiers free/pro:** lógica de negocio aún no diseñada.
- **Vercel / deploy:** no se ha configurado CI/CD ni deploy.

---

## Decisiones técnicas relevantes

1. **`supabase.ts` vs `supabase-server.ts` separados:** obligatorio por Next.js — `next/headers` no se puede importar en Client Components. Si alguien los junta, todos los formularios de auth se rompen.

2. **`sections.kind` en español:** el seed usa `libro/titulo/capitulo`. El schema fue migrado de inglés a español durante el setup inicial. Los `KIND_LABEL` maps en los pages usan estas mismas claves.

3. **Server Actions para sign out:** `signOut()` en `app/auth/actions.ts` es un Server Action porque necesita acceso a cookies del servidor para limpiar la sesión. Los formularios de login/register son Client Components porque necesitan estado React para errores.

4. **No hay rutas protegidas todavía:** el middleware solo refresca la sesión, no redirige. Las páginas de lectura son públicas por diseño (RLS permite lectura pública). Las annotations (cuando se implementen) sí requerirán protección.
