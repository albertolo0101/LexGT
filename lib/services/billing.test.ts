import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { makeBuilder, makeDb } from "@/lib/test/mock-supabase";
import { adminSetTier, applyWebhookPayment, startCheckout } from "./billing";
import type { PaymentEvent } from "@/lib/billing/provider";

const freeActor: Actor = { userId: "user-1", tier: "free", isAdmin: false };
const adminActor: Actor = { userId: "admin-1", tier: "pro", isAdmin: true };
const anonActor: Actor = { userId: null, tier: "anonymous", isAdmin: false };

const plan = {
  key: "pro_6m",
  name: "Pro semestral",
  description: null,
  tier: "pro",
  months: 6,
  price_cents: 39_000,
  currency: "GTQ",
  is_active: true,
  position: 2,
};

const event = (overrides: Partial<PaymentEvent> = {}): PaymentEvent => ({
  providerPaymentId: "pay_123",
  reference: "user-1:pro_6m:abc",
  status: "paid",
  amountCents: 39_000,
  currency: "GTQ",
  raw: { ok: true },
  ...overrides,
});

/** Cliente de service role: `from(...)` para planes, `rpc(...)` para escribir. */
function serviceDb(planRow: unknown, rpcResult = { data: null, error: null }) {
  return makeDb([makeBuilder({ data: planRow, error: null })], rpcResult);
}

describe("startCheckout", () => {
  const originalProvider = process.env.PAYMENT_PROVIDER;

  beforeEach(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = originalProvider;
  });

  it("rechaza a un usuario sin sesión", async () => {
    const db = makeDb([]);
    await expect(
      startCheckout(db, anonActor, { planKey: "pro_6m", returnUrl: "https://lexgt.gt/cuenta" })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("dice que los pagos no están habilitados cuando no hay proveedor configurado", async () => {
    const db = makeDb([]);
    await expect(
      startCheckout(db, freeActor, { planKey: "pro_6m", returnUrl: "https://lexgt.gt/cuenta" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("applyWebhookPayment", () => {
  it("registra el pago y otorga el tier cuando el monto cuadra", async () => {
    const db = serviceDb(plan);
    const result = await applyWebhookPayment(db, "visanet", event());

    expect(result.applied).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith(
      "record_payment",
      expect.objectContaining({
        p_user_id: "user-1",
        p_plan_key: "pro_6m",
        p_status: "paid",
        p_provider_payment_id: "pay_123",
      })
    );
  });

  it("no otorga nada si el monto no coincide con el precio del plan", async () => {
    const db = serviceDb(plan);
    const result = await applyWebhookPayment(db, "visanet", event({ amountCents: 100 }));

    expect(result.applied).toBe(false);
    expect(result.reason).toContain("39000");
    // El pago igual queda registrado, pero como fallido.
    expect(db.rpc).toHaveBeenCalledWith(
      "record_payment",
      expect.objectContaining({ p_status: "failed" })
    );
  });

  it("ignora un webhook con referencia ilegible", async () => {
    const db = serviceDb(plan);
    const result = await applyWebhookPayment(db, "visanet", event({ reference: null }));

    expect(result).toEqual({ applied: false, reason: "referencia ilegible" });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("ignora un plan que no existe", async () => {
    const db = serviceDb(null);
    const result = await applyWebhookPayment(db, "visanet", event({ reference: "user-1:fantasma:x" }));

    expect(result.applied).toBe(false);
    expect(result.reason).toContain("fantasma");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("un pago pendiente se registra sin otorgar el tier", async () => {
    const db = serviceDb(plan);
    const result = await applyWebhookPayment(db, "paggo", event({ status: "pending" }));

    expect(result.applied).toBe(false);
    expect(db.rpc).toHaveBeenCalledWith(
      "record_payment",
      expect.objectContaining({ p_status: "pending" })
    );
  });
});

describe("adminSetTier", () => {
  it("rechaza a quien no es admin", async () => {
    const db = makeDb([]);
    await expect(
      adminSetTier(db, freeActor, { userId: "11111111-1111-1111-1111-111111111111", tier: "pro" })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("pasa por apply_tier, igual que el webhook", async () => {
    const db = makeDb([], { data: null, error: null });
    await adminSetTier(db, adminActor, {
      userId: "11111111-1111-1111-1111-111111111111",
      tier: "pro",
      lifetime: true,
      note: "cortesía",
    });

    expect(db.rpc).toHaveBeenCalledWith(
      "apply_tier",
      expect.objectContaining({
        p_tier: "pro",
        p_lifetime: true,
        p_source: "admin",
        p_note: "cortesía",
      })
    );
  });

  it("propaga el error de la base", async () => {
    const db = makeDb([], { data: null, error: { message: "boom" } });
    await expect(
      adminSetTier(db, adminActor, {
        userId: "11111111-1111-1111-1111-111111111111",
        tier: "pro",
      })
    ).rejects.toBeTruthy();
  });
});

describe("ActionError de plan inexistente", () => {
  it("startCheckout con proveedor configurado pero plan inválido", async () => {
    process.env.PAYMENT_PROVIDER = "visanet";
    process.env.VISANET_MERCHANT_ID = "m";
    process.env.VISANET_API_KEY = "k";
    process.env.VISANET_WEBHOOK_SECRET = "s";

    const db = makeDb([makeBuilder({ data: null, error: { message: "no rows" } })]);
    await expect(
      startCheckout(db, freeActor, { planKey: "fantasma", returnUrl: "https://lexgt.gt/cuenta" })
    ).rejects.toBeInstanceOf(ActionError);

    delete process.env.PAYMENT_PROVIDER;
    delete process.env.VISANET_MERCHANT_ID;
    delete process.env.VISANET_API_KEY;
    delete process.env.VISANET_WEBHOOK_SECRET;
    vi.restoreAllMocks();
  });
});
