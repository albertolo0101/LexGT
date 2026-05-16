import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import type { Metadata } from "next";
import type { Law } from "@/lib/types";

export const metadata: Metadata = {
  title: "Leyes — LexGT",
  description: "Legislación de Guatemala",
};

export default async function LeyesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: laws, error } = await supabase
    .from("laws")
    .select("*")
    .eq("is_active", true)
    .order("short_name");

  if (error) throw new Error(error.message);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
          Leyes disponibles
        </h2>

        <div className="divide-y divide-gray-100">
          {(laws as Law[]).map((law) => (
            <Link
              key={law.id}
              href={`/leyes/${law.slug}`}
              className="group flex items-start justify-between gap-6 py-5 -mx-2 px-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-base font-medium text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                  {law.short_name}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                  {law.full_name}
                </p>
              </div>
              {law.decree && (
                <span className="shrink-0 mt-0.5 text-xs text-gray-400 font-mono whitespace-nowrap">
                  {law.decree}
                </span>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
