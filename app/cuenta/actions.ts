"use server"

import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor } from "@/lib/authz";
import { runAction, type ActionResult } from "@/lib/action-result";
import * as billingService from "@/lib/services/billing";

/**
 * Arranca el cobro de un plan y devuelve la URL del checkout del proveedor.
 * El tier NO se otorga aquí: eso lo hace el webhook cuando el pago se
 * confirma. Si el usuario cierra la pestaña a medio pagar, no pasa nada.
 */
export async function startCheckout(planKey: string): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);

    const headerList = await headers();
    const host = headerList.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";

    const input = billingService.StartCheckoutInput.parse({
      planKey,
      returnUrl: `${protocol}://${host}/cuenta`,
    });
    return billingService.startCheckout(supabase, actor, input);
  });
}
