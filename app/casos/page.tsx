import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor } from "@/lib/authz";
import Link from "next/link";
import { listCases } from "@/lib/services/queries/cases";
import CasesClient from "./CasesClient";

export default async function CasosPage() {
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);

  if (!actor.userId || actor.tier !== "pro") {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper-2">
        <div className="space-y-3 text-center">
          <p className="text-sm text-ink-700">Esta función es exclusiva del tier Pro.</p>
          <Link href="/leyes" className="text-xs text-ink-500 transition-colors hover:text-navy-800">
            ← Volver a leyes
          </Link>
        </div>
      </div>
    );
  }

  const cases = await listCases(supabase, actor);

  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-ink-900">Mis casos</h1>
        </div>
        <CasesClient cases={cases} />
      </main>
    </div>
  );
}
