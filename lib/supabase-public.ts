import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente sin sesión, solo para **contenido público** (leyes, secciones,
 * artículos, párrafos) que se lee con la anon key y se cachea igual para todos
 * los usuarios.
 *
 * Es la cuarta factory (ver CLAUDE.md): `supabase.ts` navegador,
 * `supabase-server.ts` cookies, `supabase-bearer.ts` API v1, y esta.
 * Existe porque `unstable_cache` no puede leer cookies: cualquier consulta
 * cacheada debe ser idéntica para todo el mundo, y por lo tanto no puede
 * depender del JWT del usuario. **Nunca usarla para datos de usuario** — no
 * lleva identidad, así que RLS la trata como `anon`.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
