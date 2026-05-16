import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Metadata } from "next"
import type { Law, LawReform } from "@/lib/types"
import { getUserTier } from "@/lib/get-user-tier"
import LawCard from "@/components/LawCard"

export const metadata: Metadata = {
  title: "Leyes — LexGT",
  description: "Legislación de Guatemala",
}

type UserTier = "anonymous" | "free" | "pro"

function cutoffDate(tier: UserTier): string {
  const d = new Date()
  if (tier === "anonymous") d.setDate(d.getDate() - 7)
  else if (tier === "free") d.setMonth(d.getMonth() - 1)
  else d.setMonth(d.getMonth() - 6)
  return d.toISOString()
}

export default async function LeyesPage() {
  const supabase = await createServerSupabaseClient()
  const [{ data: { user } }, dbTier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ])
  const tier: UserTier = user ? dbTier : "anonymous"

  // Round 1: laws, reforms, and (if authed) seen ids + annotated article ids — all parallel
  const [{ data: laws, error: lawsError }, { data: reforms }, seenReformIds, annotatedArticleIds] =
    await Promise.all([
      supabase.from("laws").select("*").eq("is_active", true).order("short_name"),
      supabase.from("law_reforms").select("*").gte("published_at", cutoffDate(tier)),
      user
        ? supabase
            .from("reform_notifications")
            .select("reform_id")
            .eq("user_id", user.id)
            .then(({ data }) => new Set((data ?? []).map((r) => r.reform_id as string)))
        : Promise.resolve(new Set<string>()),
      user
        ? supabase
            .from("annotations")
            .select("article_id")
            .eq("user_id", user.id)
            .then(({ data }) => new Set((data ?? []).map((a) => a.article_id as string)))
        : Promise.resolve(new Set<string>()),
    ])

  if (lawsError) throw new Error(lawsError.message)

  const reformsByLaw = new Map<string, LawReform[]>()
  for (const reform of reforms ?? []) {
    if (!seenReformIds.has(reform.id)) {
      const arr = reformsByLaw.get(reform.law_id) ?? []
      arr.push(reform as LawReform)
      reformsByLaw.set(reform.law_id, arr)
    }
  }

  const allPendingReformIds = [...reformsByLaw.values()].flat().map((r) => r.id)

  // Round 2: find old articles with user annotations + new article versions — parallel
  let articlePairsByReform: Record<string, { oldArticleId: string; newArticleId: string }[]> = {}

  if (user && annotatedArticleIds.size && allPendingReformIds.length) {
    const [{ data: oldArticleData }, { data: newArticleData }] = await Promise.all([
      supabase
        .from("articles")
        .select("id, law_id")
        .in("id", [...annotatedArticleIds])
        .eq("is_current", false),
      supabase
        .from("articles")
        .select("id, previous_version_id, reform_id")
        .in("reform_id", allPendingReformIds)
        .not("previous_version_id", "is", null),
    ])

    const oldArticleIdSet = new Set((oldArticleData ?? []).map((a) => a.id))

    for (const art of newArticleData ?? []) {
      if (art.previous_version_id && oldArticleIdSet.has(art.previous_version_id)) {
        const pairs = articlePairsByReform[art.reform_id] ?? []
        pairs.push({ oldArticleId: art.previous_version_id, newArticleId: art.id })
        articlePairsByReform[art.reform_id] = pairs
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
          Leyes disponibles
        </h2>

        <div className="divide-y divide-gray-100">
          {(laws as Law[]).map((law) => (
            <LawCard
              key={law.id}
              law={law}
              pendingReforms={reformsByLaw.get(law.id) ?? []}
              userTier={tier}
              articlePairsByReform={articlePairsByReform}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
