import 'server-only'
import type { Plan } from './types'

/**
 * Contrato de un proveedor de cobro.
 *
 * La regla que ordena todo esto: **LexGT nunca ve un número de tarjeta.** El
 * usuario paga en el checkout alojado del proveedor (su dominio, su PCI-DSS) y
 * el proveedor avisa por webhook. Aquí solo viajan el plan, el monto y un id
 * de referencia.
 *
 * Para agregar un proveedor:
 *   1. crear `providers/<nombre>.ts` que exporte un `PaymentProvider`;
 *   2. registrarlo en `PROVIDERS` (abajo);
 *   3. poner `PAYMENT_PROVIDER=<nombre>` y sus credenciales en el entorno.
 * Nada más de la app cambia.
 */
export type CheckoutRequest = {
  plan: Plan
  userId: string
  userEmail: string | null
  /** A dónde vuelve el usuario al terminar (éxito o cancelación). */
  returnUrl: string
  /** Nuestra referencia interna; el proveedor la devuelve en el webhook. */
  reference: string
}

export type CheckoutSession = {
  /** URL del checkout alojado a la que se manda al usuario. */
  url: string
  /** Id de la sesión/orden en el proveedor, si lo da al crearla. */
  providerReference: string | null
}

/** Evento normalizado a partir del webhook del proveedor. */
export type PaymentEvent = {
  /** Id del cobro en el proveedor: la llave de idempotencia. */
  providerPaymentId: string
  /** La referencia que mandamos al crear el checkout (`userId:planKey:nonce`). */
  reference: string | null
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled'
  amountCents: number
  currency: string
  raw: unknown
}

export type PaymentProvider = {
  readonly name: string
  /** ¿Están las credenciales en el entorno? Si no, el checkout no se ofrece. */
  isConfigured(): boolean
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>
  /**
   * Verifica la firma del webhook y devuelve el evento normalizado.
   * Debe lanzar si la firma no cuadra: es la única defensa contra alguien que
   * mande un "pagado" falso a la ruta pública del webhook.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string, missing: string[]) {
    super(
      `El proveedor de pagos "${provider}" no está configurado. ` +
        `Faltan variables de entorno: ${missing.join(', ')}.`
    )
    this.name = 'ProviderNotConfiguredError'
  }
}

import { visanet } from './providers/visanet'
import { vanapay } from './providers/vanapay'
import { paggo } from './providers/paggo'

export const PROVIDERS: Record<string, PaymentProvider> = {
  visanet,
  vanapay,
  paggo,
}

/** El proveedor activo, o `null` si no hay ninguno configurado todavía. */
export function getPaymentProvider(): PaymentProvider | null {
  const name = process.env.PAYMENT_PROVIDER?.trim().toLowerCase()
  if (!name || name === 'none') return null
  const provider = PROVIDERS[name]
  if (!provider) return null
  return provider
}

/** ¿Se puede cobrar hoy? Lo usa la página de cuenta para decidir qué mostrar. */
export function checkoutEnabled(): boolean {
  const provider = getPaymentProvider()
  return provider !== null && provider.isConfigured()
}

/**
 * Referencia que viaja al proveedor y vuelve en el webhook. Se firma no: es
 * un identificador, no una autorización — el webhook igual verifica firma y
 * monto contra el plan.
 */
export function buildReference(userId: string, planKey: string): string {
  return `${userId}:${planKey}:${Date.now().toString(36)}`
}

export function parseReference(reference: string | null): { userId: string; planKey: string } | null {
  if (!reference) return null
  const [userId, planKey] = reference.split(':')
  if (!userId || !planKey) return null
  return { userId, planKey }
}
