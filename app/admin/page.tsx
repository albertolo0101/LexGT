import { createServerSupabaseClient } from "@/lib/supabase-server"
import Link from "next/link"
import TierForm from "./TierForm"

type DraftReform = {
  id: string
  title: string
  created_at: string
  laws: { short_name: string } | null
  reform_draft_articles: { id: string }[]
}

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()

  const { data: reforms, error } = await supabase
    .from("law_reforms")
    .select("id, title, created_at, laws(short_name), reform_draft_articles(id)")
    .eq("status", "draft")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-lg font-semibold text-gray-900">Reformas en borrador</h1>
        <Link
          href="/admin/reformas/nueva"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Nueva reforma
        </Link>
      </div>

      {reforms?.length === 0 ? (
        <p className="text-sm text-gray-400">No hay reformas en borrador.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {(reforms as unknown as DraftReform[]).map((reform) => (
            <Link
              key={reform.id}
              href={`/admin/reformas/${reform.id}`}
              className="group flex items-start justify-between gap-6 py-4 -mx-2 px-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                  {reform.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {reform.laws?.short_name ?? "—"} ·{" "}
                  {new Date(reform.created_at).toLocaleDateString("es-GT")}
                </p>
              </div>
              <span className="shrink-0 text-xs text-gray-500 mt-0.5">
                {reform.reform_draft_articles?.length ?? 0} artículos
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Gestión de tiers</h2>
        <TierForm />
      </div>
    </div>
  )
}
