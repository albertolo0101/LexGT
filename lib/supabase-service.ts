import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con la **service-role key**. Salta RLS por completo.
 *
 * Regla, y no es negociable: este módulo lo importa **solo** el webhook de
 * pagos (`app/api/webhooks/[provider]/route.ts`). Ningún componente, ninguna
 * Server Action, ninguna página. El resto de la app usa las cuatro factories
 * de siempre y vive dentro de RLS.
 *
 * Existe porque el webhook no tiene sesión de usuario: lo llama el proveedor
 * de pagos desde su servidor, y tiene que poder escribir un pago y otorgar un
 * tier. Es exactamente el caso que la fase 1 dejó previsto al hacer
 * `user_profiles.tier` escribible solo por admin o service role.
 *
 * Si `SUPABASE_SERVICE_ROLE_KEY` no está en el entorno, el webhook responde
 * 503 y no se otorga nada: preferimos no cobrar a cobrar sin poder registrar.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
