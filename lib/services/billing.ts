import 'server-only'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import { requireUser, requireAdmin } from '@/lib/authz'
import { ActionError } from '@/lib/action-result'
import {
  buildReference,
  getPaymentProvider,
  parseReference,
  type PaymentEvent,
} from '@/lib/billing/provider'
import type { Plan } from '@/lib/billing/types'

export const StartCheckoutInput = z.object({
  planKey: z.string().min(1),
  /** Dominio al que vuelve el usuario; lo pasa la Server Action. */
  returnUrl: z.string().url(),
  nit: z.string().max(20).nullable().optional(),
  nombre: z.string().max(200).nullable().optional(),
})
export type StartCheckoutInput = z.infer<typeof StartCheckoutInput>

/**
 * Arranca un cobro: crea la sesión de checkout en el proveedor y devuelve la
 * URL a la que hay que mandar al usuario. **No** otorga el tier — eso solo
 * ocurre cuando llega el webhook confirmando el pago.
 */
export async function startCheckout(
  db: SupabaseClient,
  actor: Actor,
  input: StartCheckoutInput
): Promise<{ url: string }> {
  requireUser(actor)

  const provider = getPaymentProvider()
  if (!provider || !provider.isConfigured()) {
    throw new ActionError(
      'CONFLICT',
      'Los pagos en línea todavía no están habilitados. Escríbenos para activar tu plan.'
    )
  }

  const { data, error } = await db
    .from('plans')
    .select('*')
    .eq('key', input.planKey)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new ActionError('NOT_FOUND', 'Ese plan no está disponible.')
  const plan = data as Plan

  const session = await provider.createCheckout({
    plan,
    userId: actor.userId,
    userEmail: null,
    returnUrl: input.returnUrl,
    reference: buildReference(actor.userId, plan.key),
  })

  return { url: session.url }
}

export const AdminSetTierInput = z.object({
  userId: z.string().uuid(),
  tier: z.string().min(1),
  /** Meses a sumar; `null` deja el vencimiento como está. */
  months: z.number().int().min(0).max(120).nullable().optional(),
  lifetime: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
})
export type AdminSetTierInput = z.infer<typeof AdminSetTierInput>

/**
 * Cambia el tier de un usuario desde el panel. Pasa por `apply_tier`, la
 * misma función que usa el webhook, así que la bitácora (`tier_events`) queda
 * igual venga de un pago o de la mano de un admin.
 */
export async function adminSetTier(
  db: SupabaseClient,
  actor: Actor,
  input: AdminSetTierInput
): Promise<void> {
  requireAdmin(actor)

  const { error } = await db.rpc('apply_tier', {
    p_user_id: input.userId,
    p_tier: input.tier,
    p_months: input.months ?? null,
    p_source: 'admin',
    p_payment_id: null,
    p_note: input.note ?? null,
    p_lifetime: input.lifetime ?? false,
  })
  if (error) throw error
}

/**
 * Registra el pago que reporta un webhook y otorga el tier si corresponde.
 * Corre con la service-role key: `db` acá NO es un cliente de sesión.
 */
export async function applyWebhookPayment(
  db: SupabaseClient,
  providerName: string,
  event: PaymentEvent
): Promise<{ applied: boolean; reason?: string }> {
  const reference = parseReference(event.reference)
  if (!reference) return { applied: false, reason: 'referencia ilegible' }

  const { data: plan } = await db
    .from('plans')
    .select('*')
    .eq('key', reference.planKey)
    .single()
  if (!plan) return { applied: false, reason: `plan desconocido: ${reference.planKey}` }

  // El monto lo manda el proveedor; si no cuadra con el plan, se registra el
  // pago pero no se otorga nada. Cobrar Q1 y llevarse un año de Pro no.
  const expected = (plan as Plan).price_cents
  const amountMatches = event.amountCents === expected
  const status = amountMatches ? event.status : 'failed'

  const { error } = await db.rpc('record_payment', {
    p_user_id: reference.userId,
    p_provider: providerName,
    p_provider_payment_id: event.providerPaymentId,
    p_plan_key: reference.planKey,
    p_amount_cents: event.amountCents,
    p_currency: event.currency,
    p_status: status,
    p_raw: event.raw ?? null,
  })
  if (error) throw error

  if (!amountMatches) {
    return {
      applied: false,
      reason: `monto ${event.amountCents} ≠ precio del plan ${expected}`,
    }
  }
  return { applied: event.status === 'paid' }
}
