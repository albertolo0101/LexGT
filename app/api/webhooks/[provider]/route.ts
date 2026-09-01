import { NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/billing/provider";
import { createServiceClient } from "@/lib/supabase-service";
import { applyWebhookPayment } from "@/lib/services/billing";

/**
 * Webhook de la pasarela de pagos: `POST /api/webhooks/visanet|vanapay|paggo`.
 *
 * Es el ÚNICO lugar de la app que usa la service-role key, porque es el único
 * que escribe sin sesión de usuario. Tres reglas:
 *
 *   1. **La firma manda.** `parseWebhook` verifica el HMAC del proveedor y
 *      lanza si no cuadra; sin eso, cualquiera podría regalarse Pro con un
 *      `curl` a esta ruta.
 *   2. **El monto se compara con el plan** antes de otorgar nada
 *      (`applyWebhookPayment`).
 *   3. **Idempotente**: `record_payment` deduplica por
 *      `(provider, provider_payment_id)`, así que reintentos del proveedor no
 *      otorgan el tier dos veces.
 *
 * No usa `apiHandler`: ese wrapper resuelve un `Actor` a partir del Bearer del
 * usuario, y aquí no hay usuario.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return NextResponse.json({ ok: false, error: "unknown provider" }, { status: 404 });
  }
  if (!provider.isConfigured()) {
    return NextResponse.json({ ok: false, error: "provider not configured" }, { status: 503 });
  }

  const db = createServiceClient();
  if (!db) {
    // Sin service-role key no se puede registrar el pago. Devolver 503 hace
    // que el proveedor reintente en vez de dar el cobro por avisado.
    return NextResponse.json({ ok: false, error: "billing not configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, req.headers);
  } catch (error) {
    console.error(`[webhook:${providerName}] firma inválida o cuerpo ilegible`, error);
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  try {
    const result = await applyWebhookPayment(db, providerName, event);
    if (!result.applied && result.reason) {
      console.warn(`[webhook:${providerName}] pago registrado sin otorgar tier: ${result.reason}`);
    }
    return NextResponse.json({ ok: true, applied: result.applied });
  } catch (error) {
    // 500 para que el proveedor reintente: el pago ya se hizo y el usuario
    // tiene que terminar con su tier.
    console.error(`[webhook:${providerName}] no se pudo registrar el pago`, error);
    return NextResponse.json({ ok: false, error: "could not record payment" }, { status: 500 });
  }
}
