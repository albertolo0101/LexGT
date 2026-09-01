import 'server-only'
import {
  ProviderNotConfiguredError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentProvider,
} from '../provider'

/**
 * Paggo: fintech guatemalteca, cobros por enlace y transferencia.
 *
 * Estado: **adaptador vacío**, misma forma que los otros. Para completarlo:
 *
 *   1. credenciales de la cuenta (`PAGGO_MERCHANT_ID`, `PAGGO_API_KEY`);
 *   2. el endpoint que genera el cobro y la URL a la que se manda al usuario;
 *   3. la verificación de firma del webhook (`PAGGO_WEBHOOK_SECRET`).
 *
 * Ojo con el flujo por transferencia: el pago puede confirmarse horas después,
 * así que el webhook es el único momento fiable para otorgar el tier — nunca
 * la vuelta del usuario a la app.
 */
const REQUIRED = ['PAGGO_MERCHANT_ID', 'PAGGO_API_KEY', 'PAGGO_WEBHOOK_SECRET'] as const

function missingEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key])
}

export const paggo: PaymentProvider = {
  name: 'paggo',

  isConfigured() {
    return missingEnv().length === 0
  },

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    void _request
    throw new ProviderNotConfiguredError('paggo', missingEnv())
  },

  async parseWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    void _rawBody
    void _headers
    throw new ProviderNotConfiguredError('paggo', missingEnv())
  },
}
