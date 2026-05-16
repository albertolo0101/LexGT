import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserTier } from "@/lib/get-user-tier";
import Link from "next/link";
import type { Case } from "@/lib/types";
import CasesClient from "./CasesClient";

type CaseWithCount = Case & { case_annotations: { id: string }[] };

export default async function CasosPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: { user } }, tier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ]);

  if (!user || tier !== "pro") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">Esta función es exclusiva del tier Pro.</p>
          <Link href="/leyes" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← Volver a leyes
          </Link>
        </div>
      </div>
    );
  }

  const { data: casesRaw } = await supabase
    .from("cases")
    .select("id, user_id, title, description, color, created_at, updated_at, case_annotations(id)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const cases = (casesRaw ?? []) as CaseWithCount[];

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-xl font-semibold text-gray-900">Mis casos</h1>
        </div>
        <CasesClient cases={cases} />
      </main>
    </div>
  );
}
