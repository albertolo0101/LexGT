import { createServerSupabaseClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"
import { approveReform } from "@/app/admin/actions"

type Para = { text: string; position: number }

type ReformDetail = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  laws: { short_name: string } | null
  reform_draft_articles: Array<{
    id: string
    new_text: string
    articles: {
      number: string
      heading: string | null
      paragraphs: Para[]
    } | null
  }>
}

type Props = { params: Promise<{ id: string }> }

export default async function ReformDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from("law_reforms")
    .select(`
      id, title, description, status, created_at,
      laws(short_name),
      reform_draft_articles(
        id, new_text,
        articles(number, heading, paragraphs(text, position))
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) notFound()

  const reform = data as unknown as ReformDetail
  const publishAction = approveReform.bind(null, reform.id)

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 mb-1">{reform.laws?.short_name ?? "—"}</p>
          <h1 className="text-lg font-semibold text-gray-900">{reform.title}</h1>
          {reform.description && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{reform.description}</p>
          )}
        </div>
        {reform.status === "draft" && (
          <form action={publishAction}>
            <button
              type="submit"
              className="shrink-0 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Publicar reforma
            </button>
          </form>
        )}
        {reform.status === "published" && (
          <span className="shrink-0 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Publicada
          </span>
        )}
      </div>

      {reform.reform_draft_articles.length === 0 ? (
        <p className="text-sm text-gray-400">Esta reforma no tiene artículos afectados.</p>
      ) : (
        <div className="space-y-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Artículos afectados
          </h2>
          {reform.reform_draft_articles.map((draft) => {
            const art = draft.articles
            const currentText =
              art?.paragraphs
                ?.slice()
                .sort((a, b) => a.position - b.position)
                .map((p) => p.text)
                .join("\n\n") ?? ""

            return (
              <div key={draft.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Artículo {art?.number}
                  {art?.heading ? ` — ${art.heading}` : ""}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Texto vigente</p>
                    <div className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {currentText || "—"}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-500 mb-1">Texto nuevo</p>
                    <div className="rounded-lg bg-blue-50 px-3 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {draft.new_text}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
