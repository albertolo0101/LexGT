# LexGT

Biblioteca legal guatemalteca. Los usuarios leen legislación estructurada
(constitución, códigos, leyes, decretos), buscan texto completo, resaltan
fragmentos, agregan notas y organizan trabajo en "casos".

**Stack:** Next.js 15 (App Router, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 · Supabase (PostgreSQL + Auth + RLS) · Vitest · Playwright.

**Tiers:** anónimo (lectura + búsqueda) · Free (+ highlights amarillos) ·
Pro (+ 4 colores, notas, casos, ventana de reformas de 6 meses).

Estado: **pre-lanzamiento**. La app compila, los tests pasan y la seguridad
(RLS) está endurecida; el siguiente paso es un deploy de prueba a Vercel
(ver [docs/DEPLOY.md](docs/DEPLOY.md)). Estado detallado y trabajo pendiente
en [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Setup local

Requisitos: Node 22+, npm. Opcional para tests de base de datos: Docker +
[Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
git clone https://github.com/albertolo0101/LexGT.git
cd LexGT
npm install
cp .env.example .env.local     # y llenar los valores (ver abajo)
npm run dev                    # http://localhost:3000
```

### Variables de entorno

| Variable | Requerida | Qué es |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sí | anon/publishable key (pública por diseño; la seguridad la da RLS) |
| `UPSTASH_REDIS_REST_URL` | no | Rate limiting; si falta, se desactiva (fail-open con warning) |
| `UPSTASH_REDIS_REST_TOKEN` | no | idem |

La app **nunca** usa la `service_role` key. Ver [docs/SECURITY.md](docs/SECURITY.md).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest, 67 tests) |
| `npm run test:e2e` | Smoke tests Playwright (requiere `npm run dev` o webServer) |
| `npm run test:rls` | Suite pgTAP de RLS — requiere `supabase start` (Docker) |
| `npx tsc --noEmit` | Type check |

CI (`.github/workflows/ci.yml`) corre tsc → lint → vitest → build en cada
push/PR a `main`.

## Estructura

```
app/          rutas (App Router): /leyes, /buscar, /casos, /admin, /auth, /api
components/   UI compartida (AppShell, reader, search, paywall)
lib/          lógica: authz, servicios, queries, anclaje de anotaciones, API v1
lib/modules/  herramientas Pro aisladas del core (ver docs/MODULES.md)
supabase/     migraciones SQL, seeds, tests pgTAP, snapshot del schema
tests/e2e/    Playwright
docs/         documentación (ver abajo)
```

Mapa de archivos detallado: [CLAUDE.md](CLAUDE.md).

## Base de datos

Postgres gestionado por Supabase. Todo el acceso pasa por **RLS** — la app
usa la anon key tanto en el navegador como en el servidor, así que las
políticas de la base son la única frontera de seguridad real.

- Migraciones: `supabase/migrations/000N_descripcion.sql`, aplicadas en orden.
  Prod está en `0019`; `0020` espera la recarga de contenido (ver ROADMAP).
- Schema vigente documentado en [supabase/SCHEMA_SNAPSHOT.md](supabase/SCHEMA_SNAPSHOT.md).
- Local: `supabase start` + `supabase db reset` reconstruye todo desde
  migraciones + `supabase/seed.sql`.

El contenido legal (leyes, secciones, artículos, párrafos) **no se edita a
mano**: lo produce el repo hermano `lex-extractor`
(`PDFtoSQLapp/pdf-sql-LEX/lex-extractor`), que es el plano de control
editorial. Ver [docs/CONTENT.md](docs/CONTENT.md).

## Documentación

| Documento | Contenido |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Contexto completo del proyecto para agentes/colaboradores: estado, decisiones, mapa de archivos |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Qué está hecho, qué falta, en qué orden |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Runbook de deploy a Vercel + checklist de lanzamiento |
| [docs/SECURITY.md](docs/SECURITY.md) | Matriz RLS tabla × operación × política; reglas de tier y admin |
| [docs/API.md](docs/API.md) | API v1 (`/api/v1/*`) para el cliente móvil |
| [docs/MODULES.md](docs/MODULES.md) | Convención para módulos Pro aislados del core |
| [docs/CONTENT.md](docs/CONTENT.md) | Checklist de leyes por cargar + estado de calidad de datos |
| [supabase/SCHEMA_SNAPSHOT.md](supabase/SCHEMA_SNAPSHOT.md) | Snapshot del schema de producción |
