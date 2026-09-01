/**
 * Tipos de facturación. Aislados del proveedor a propósito: cambiar de
 * Visanet a VanaPay o Paggo debe ser cambiar una variable de entorno y
 * escribir un adaptador, no tocar la app.
 */

export type Plan = {
  key: string
  name: string
  description: string | null
  tier: string
  /** NULL = vitalicio. */
  months: number | null
  price_cents: number
  currency: string
  is_active: boolean
  position: number
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled'

export type Payment = {
  id: string
  user_id: string
  plan_key: string | null
  provider: string
  provider_payment_id: string | null
  amount_cents: number
  currency: string
  status: PaymentStatus
  tier_granted: string | null
  months_granted: number | null
  paid_at: string | null
  created_at: string
}

export type InvoiceStatus = 'pending' | 'issued' | 'failed' | 'voided'

export type Invoice = {
  id: string
  payment_id: string
  provider: string
  status: InvoiceStatus
  serie: string | null
  numero: string | null
  uuid_fel: string | null
  authorized_at: string | null
  pdf_url: string | null
  nit: string | null
  nombre: string | null
  error: string | null
  created_at: string
}

export type TierEvent = {
  id: string
  user_id: string
  from_tier: string | null
  to_tier: string
  from_expires_at: string | null
  to_expires_at: string | null
  source: string
  note: string | null
  created_at: string
}

/** Datos del receptor de la factura electrónica (FEL). */
export type BillingDetails = {
  nit: string | null
  nombre: string | null
}

export function formatPrice(cents: number, currency = 'GTQ'): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function planPeriodLabel(plan: Plan): string {
  if (plan.months === null) return 'sin vencimiento'
  if (plan.months === 1) return 'por 1 mes'
  if (plan.months === 12) return 'por 1 año'
  return `por ${plan.months} meses`
}
