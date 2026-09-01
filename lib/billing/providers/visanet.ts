import 'server-only'
import {
  ProviderNotConfiguredError,
  type CheckoutRequest,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentProvider,
} from '../provider'

/**
 * Visanet Guatemala (Credomatic / "VisaLink"): checkout alojado.
 *
 * Estado: **adaptador vacío**. La forma está lista; falta el contrato real,
 * que Visanet entrega al abrir el comercio. Para completarlo hacen falta tres
 * cosas y ninguna se puede inventar desde acá:
 *
 *   1. `VISANET_MERCHANT_ID` y `VISANET_API_KEY` (o el par usuario/clave del
 *      comercio) y la URL del ambiente (sandbox y producción son distintas).
 *   2. El endpoint de creación de la orden: qué campos pide y qué devuelve
 *      (normalmente una URL de pago y un id de orden).
 *   3. Cómo firma sus webhooks (HMAC del cuerpo con la llave secreta, casi
 *      siempre) para poder verificarlos en `parseWebhook`.
 *
 * Mientras `isConfigured()` sea falso, la app muestra "pagos en línea
 * próximamente" y el tier se otorga a mano desde lex-extractor.
 */
const REQUIRED = ['VISANET_MERCHANT_ID', 'VISANET_API_KEY', 'VISANET_WEBHOOK_SECRET'] as const

function missingEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key])
}

export const visanet: PaymentProvider = {
  name: 'visanet',

  isConfigured() {
    return missingEnv().length === 0
  },

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    void _request
    throw new ProviderNotConfiguredError('visanet', missingEnv())
  },

  async parseWebhook(_rawBody: string, _headers: Headers): Promise<PaymentEvent> {
    void _rawBody
    void _headers
    throw new ProviderNotConfiguredError('visanet', missingEnv())
  },
}
