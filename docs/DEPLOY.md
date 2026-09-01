# Deploy — Vercel (lanzamiento de prueba)

Runbook para poner LexGT en internet tal como está hoy, sobre el proyecto
Supabase de producción que ya existe (`enrykddxhqsibbokrood`, región
`aws-1-us-east-1`). No hay pasos de base de datos: el schema y el contenido
ya están cargados; esto solo publica la app Next.js.

> Objetivo de esta primera publicación: **probar la app sobre internet**, no
> abrirla al público. Los riesgos conocidos y aceptados están al final.

---

## 1. Pre-vuelo (local)

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

Los cuatro deben pasar; CI corre exactamente eso. Confirmar también que
`main` está pusheado (`git status` limpio, `git push`).

## 2. Crear el proyecto en Vercel

1. [vercel.com/new](https://vercel.com/new) → importar `albertolo0101/LexGT`.
2. Framework preset: **Next.js** (autodetectado). No cambiar build command
   (`npm run build`) ni output directory.
3. Region: `iad1` / US East — misma zona que el proyecto Supabase, para que
   cada render no pague latencia transatlántica.
4. Environment Variables (marcar Production **y** Preview):

   | Variable | Valor | Notas |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://enrykddxhqsibbokrood.supabase.co` | igual que `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | anon key del proyecto | pública por diseño; la seguridad la da RLS |
   | `UPSTASH_REDIS_REST_URL` | opcional | sin esto el rate limiting queda desactivado |
   | `UPSTASH_REDIS_REST_TOKEN` | opcional | idem |

   **Type: `Config`, no `Secret`, para las dos `NEXT_PUBLIC_*`.** El prefijo
   `NEXT_PUBLIC_` las inyecta en el bundle del navegador — son públicas por
   definición, y Vercel avisa en rojo si las marcas como Secret. Un secret
   guardado **no se puede convertir a Config**: hay que borrar la variable y
   crearla de nuevo. Si más adelante agregas Upstash, `UPSTASH_REDIS_REST_TOKEN`
   sí va como `Secret` (no lleva prefijo público).

   El nombre debe coincidir carácter por carácter con el del código
   (`lib/supabase.ts`, `middleware.ts`): un typo compila igual y revienta en
   runtime con 500 en todas las rutas. El valor de la URL va sin barra final.
   Tras cambiar cualquier variable hay que **redesplegar** — las
   `NEXT_PUBLIC_*` se hornean durante el build.

   **Nunca** agregar la `service_role` key: la app no la usa y en Vercel
   quedaría a un `process.env` de distancia de un bug de RSC.
5. Deploy. Todas las rutas son dinámicas (`ƒ`, server-rendered on demand),
   así que el build no toca la base de datos y no falla por datos.

## 3. Configurar Supabase Auth para el dominio nuevo

Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://<proyecto>.vercel.app` (o el dominio propio cuando
  exista).
- **Redirect URLs**: agregar `https://<proyecto>.vercel.app/**` y, si se van
  a usar los deploys de preview, `https://<proyecto>-*.vercel.app/**`.
  Mantener `http://localhost:3000/**` para desarrollo.

### Confirmación por correo — decidir antes de invitar gente

`app/auth/register/page.tsx` maneja los dos casos, pero **el repo no tiene
una ruta `/auth/callback`** que intercambie el `?code=` del correo por una
sesión. Consecuencia:

- **Con "Confirm email" desactivado** (Authentication → Providers → Email):
  el registro entrega sesión inmediata y todo funciona. **Esta es la opción
  recomendada para la prueba.**
- **Con "Confirm email" activado**: el enlace del correo aterriza en la app
  con `?code=…` y nadie lo canjea → el usuario ve la página pero sigue sin
  sesión. Si se quiere confirmación por correo, primero hay que agregar
  `app/auth/callback/route.ts` con `exchangeCodeForSession`.

## 4. Smoke test post-deploy

En el dominio de Vercel, en este orden:

1. `/` redirige a `/leyes` y el catálogo lista las 16 leyes.
2. Abrir una ley: se ve el documento completo en scroll continuo, con el
   índice a la izquierda marcando el capítulo actual; hacer clic en un
   capítulo del índice salta a ese punto.
3. `⌘K` / `Ctrl+K` → buscar "propiedad" → un resultado salta al artículo
   correcto dentro de la ley (`#articulo-N`).
4. Registrarse con un correo real → sesión activa (ver §3).
5. Seleccionar texto → guardar highlight amarillo → recargar: persiste.
6. Como free: intentar nota o color → se abre el paywall, no una pantalla de
   error de Next.js.
7. `/admin` con un usuario normal → redirige a `/`.
8. `curl https://<dominio>/api/v1/me` sin token → `401 UNAUTHENTICATED`.
9. Vercel → Logs: sin errores 500 durante lo anterior.

## 5. Riesgos conocidos y aceptados en esta prueba

| Riesgo | Estado | Mitigación |
|---|---|---|
| Huecos de contenido (~1,000 artículos sin párrafos, numeración `Bis` colapsada en 3 leyes) | Conocido, extractor-scope | Ver [ROADMAP](ROADMAP.md) §Datos; no bloquea una prueba, sí un lanzamiento público |
| Rate limiting desactivado si no se configura Upstash | Aceptado | La app es de lectura; agregar Upstash antes de difundir el enlace |
| "Leaked password protection" apagado en Supabase Auth | Aceptado | Toggle en Authentication → Policies cuando se abra al público |
| Proyecto Supabase en plan free | Aceptado | Se pausa tras ~1 semana sin actividad; despausar desde el dashboard |
| Migración `0020` no aplicada a prod | Intencional | Los datos legacy la violan; entra con la recarga de contenido |
| Advisors: `SECURITY DEFINER` ejecutables por `anon` | Revisado, benigno | `admin_find_user_by_email` valida `app_metadata.role='admin'` internamente y lanza excepción; `current_user_tier`/`handle_new_user` no filtran datos ajenos |

## 6. Operación

- **Rollback**: Vercel → Deployments → deployment anterior → *Promote to
  Production*. No hay migraciones acopladas a esta versión, así que revertir
  la app es seguro.
- **Deploys automáticos**: cada push a `main` publica producción; cada PR
  genera un preview. Los previews comparten la base de datos de producción —
  no correr experimentos destructivos desde un preview.
- **Cambios de base de datos**: siempre como migración numerada en
  `supabase/migrations/`, aplicada a prod, y con
  [SCHEMA_SNAPSHOT](../supabase/SCHEMA_SNAPSHOT.md) regenerado. Nunca DDL
  ad-hoc desde el dashboard (ya pasó dos veces y rompió la paridad
  migraciones↔prod: ver `0009` y `0019`).
- **Antes de abrir al público**: cerrar los huecos de contenido, activar
  Upstash, activar leaked-password protection, y correr los e2e autenticados
  (requieren una cuenta free de prueba, ver ROADMAP).
