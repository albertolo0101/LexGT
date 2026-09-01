import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor } from "@/lib/authz";
import { getAccountSummary, listPlans } from "@/lib/services/queries/billing";
import { checkoutEnabled } from "@/lib/billing/provider";
import AccountClient from "./AccountClient";

export const metadata: Metadata = { title: "Mi cuenta — LexGT" };

export default async function CuentaPage() {
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);

  if (!actor.userId) redirect("/auth/login?next=/cuenta");

  const [summary, plans] = await Promise.all([
    getAccountSummary(supabase, actor),
    listPlans(supabase).catch(() => []),
  ]);

  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-center gap-1.5 text-xs text-ink-500">
          <Link href="/leyes" className="transition-colors hover:text-navy-700">
            Biblioteca
          </Link>
          <span>›</span>
          <span className="text-ink-900">Mi cuenta</span>
        </div>

        <h1 className="font-serif text-3xl text-ink-900">Mi cuenta</h1>
        <p className="mt-2 text-sm text-ink-700">
          Tu plan, tus pagos y tus facturas. LexGT no guarda datos de tu tarjeta: el cobro se hace en
          el sitio del proveedor de pagos.
        </p>

        <div className="mt-8">
          <AccountClient summary={summary} plans={plans} checkoutEnabled={checkoutEnabled()} />
        </div>
      </main>
    </div>
  );
}
