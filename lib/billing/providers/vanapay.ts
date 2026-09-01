import 'server-only'
import {
  ProviderNotConfiguredError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentProvider,
} from '../provider'

/**
 * VanaPay: pasarela guatemalteca, checkout alojado / enlace de pago.
 *
 * Estado: **adaptador vacío**, misma forma que los otros. Para completarlo:
 *
 *   1. credenciales del comercio (`VANAPAY_MERCHANT_ID`, `VANAPAY_API_KEY`) y
 *      la URL del ambiente de pruebas, que es distinta a la de producción;
 *   2. el endpoint que crea el enlace de pago y qué devuelve;
 *   3. el esquema de firma de sus webhooks (`VANAPAY_WEBHOOK_SECRET`) — sin
 *      eso, `parseWebhook` no puede distinguir un aviso real de uno inventado.
 */
const REQUIRED = ['VANAPAY_MERCHANT_ID', 'VANAPAY_API_KEY', 'VANAPAY_WEBHOOK_SECRET'] as const

function missingEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key])
}

export const vanapay: PaymentProvider = {
  name: 'vanapay',

  isConfigured() {
    return missingEnv().length === 0
  },

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    void _request
    throw new ProviderNotConfiguredError('vanapay', missingEnv())
  },

  async parseWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    void _rawBody
    void _headers
    throw new ProviderNotConfiguredError('vanapay', missingEnv())
  },
}
