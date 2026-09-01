import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import { requireUser } from '@/lib/authz'
import type { Invoice, Payment, Plan, TierEvent } from '@/lib/billing/types'

/**
 * Las tablas de cobros llegan con la migración `0021`. Mientras no esté
 * aplicada, la cuenta debe seguir abriendo —con el plan del usuario y sin
 * pagos— en vez de tronar con "relation does not exist". Por eso cada lectura
 * de facturación cae a vacío en vez de propagar el error.
 */
async function softSelect<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await run()
    if (error) return []
    return (data ?? []) as T[]
  } catch {
    return []
  }
}

/** Planes que se pueden comprar hoy (el vitalicio no se vende en línea). */
export async function listPlans(db: SupabaseClient): Promise<Plan[]> {
  return softSelect<Plan>(() =>
    db.from('plans').select('*').eq('is_active', true).order('position')
  )
}

export type AccountSummary = {
  email: string | null
  tier: string
  tierExpiresAt: string | null
  tierSource: string
  /** Vitalicio: tier pagado sin fecha de vencimiento. */
  isLifetime: boolean
  payments: Payment[]
  invoicesByPayment: Record<string, Invoice>
  history: TierEvent[]
}

/**
 * Todo lo que la ventana "Mi cuenta" necesita, en una sola pasada. Sale de
 * las tablas del usuario (RLS lo limita a sus propias filas), nunca de la
 * pasarela: aquí no hay ni un dato de tarjeta que consultar.
 */
export async function getAccountSummary(
  db: SupabaseClient,
  actor: Actor
): Promise<AccountSummary> {
  requireUser(actor)

  const [{ data: userData }, { data: profile }, paymentRows, history] = await Promise.all([
    db.auth.getUser(),
    db
      .from('user_profiles')
      .select('tier, tier_expires_at, tier_source')
      .eq('user_id', actor.userId)
      .single(),
    softSelect<Payment>(() =>
      db
        .from('payments')
        .select('*')
        .eq('user_id', actor.userId)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    softSelect<TierEvent>(() =>
      db
        .from('tier_events')
        .select('*')
        .eq('user_id', actor.userId)
        .order('created_at', { ascending: false })
        .limit(20)
    ),
  ])

  let invoicesByPayment: Record<string, Invoice> = {}
  if (paymentRows.length > 0) {
    const invoices = await softSelect<Invoice>(() =>
      db
        .from('invoices')
        .select('*')
        .in(
          'payment_id',
          paymentRows.map((p) => p.id)
        )
    )
    invoicesByPayment = Object.fromEntries(
      invoices.map((invoice) => [invoice.payment_id, invoice])
    )
  }

  const tier = (profile?.tier as string) ?? 'free'
  const tierExpiresAt = (profile?.tier_expires_at as string | null) ?? null

  return {
    email: userData?.user?.email ?? null,
    tier,
    tierExpiresAt,
    tierSource: (profile?.tier_source as string) ?? 'manual',
    isLifetime: tier !== 'free' && tierExpiresAt === null,
    payments: paymentRows,
    invoicesByPayment,
    history,
  }
}
