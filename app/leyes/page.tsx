import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Metadata } from "next"
import type { Law, LawReform } from "@/lib/types"
import { getUserTier } from "@/lib/get-user-tier"
import { getPendingReforms, type UserTier } from "@/lib/get-pending-reforms"
import { getArticleCounts } from "@/lib/get-article-counts"
import LeyesIndexClient from "./LeyesIndexClient"

export const metadata: Metadata = {
  title: "Leyes — LexGT",
  description: "Legislación de Guatemala",
}

export default async function LeyesPage() {
  const supabase = await createServerSupabaseClient()
  const [{ data: { user } }, dbTier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ])
  const tier: UserTier = user ? dbTier : "anonymous"

  const [{ data: laws, error: lawsError }, { reformsByLaw, totalPending }, annotatedArticleIds] =
    await Promise.all([
      supabase.from("laws").select("*").eq("is_active", true).order("short_name"),
      getPendingReforms(supabase, tier, user?.id ?? null),
      user
        ? supabase
            .from("annotations")
            .select("article_id")
            .eq("user_id", user.id)
            .then(({ data }) => new Set((data ?? []).map((a) => a.article_id as string)))
        : Promise.resolve(new Set<string>()),
    ])

  if (lawsError) throw new Error(lawsError.message)

  const lawList = (laws ?? []) as Law[]
  const allPendingReformIds = [...reformsByLaw.values()].flat().map((r) => r.id)

  const articlePairsByReform: Record<string, { oldArticleId: string; newArticleId: string }[]> = {}

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

  const articleCounts = await getArticleCounts(supabase, lawList.map((l) => l.id))

  const reformsByLawObj: Record<string, LawReform[]> = {}
  for (const [lawId, reforms] of reformsByLaw) reformsByLawObj[lawId] = reforms

  const articleCountsObj: Record<string, number> = {}
  for (const [lawId, count] of articleCounts) articleCountsObj[lawId] = count

  return (
    <LeyesIndexClient
      laws={lawList}
      reformsByLaw={reformsByLawObj}
      articleCounts={articleCountsObj}
      articlePairsByReform={articlePairsByReform}
      tier={tier}
      totalPending={totalPending}
    />
  )
}
