import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import type { Law, LawReform } from '@/lib/types'
import { getPendingReforms } from '@/lib/get-pending-reforms'
import { getArticleCounts } from '@/lib/get-article-counts'

export type ArticlePair = { oldArticleId: string; newArticleId: string }

export type LawCatalog = {
  laws: Law[]
  reformsByLaw: Record<string, LawReform[]>
  articleCounts: Record<string, number>
  articlePairsByReform: Record<string, ArticlePair[]>
  totalPending: number
}

// Listado de leyes activas + reformas pendientes (según ventana del tier) +
// pares de artículos viejo/nuevo para las reformas que afectan artículos anotados por el usuario.
export async function getLawCatalog(db: SupabaseClient, actor: Actor): Promise<LawCatalog> {
  const [{ data: laws, error: lawsError }, { reformsByLaw, totalPending }, annotatedArticleIds] =
    await Promise.all([
      db.from('laws').select('*').eq('is_active', true).order('short_name'),
      getPendingReforms(db, actor.tier, actor.userId),
      actor.userId
        ? db
            .from('annotations')
            .select('article_id')
            .eq('user_id', actor.userId)
            .then(({ data }: { data: { article_id: string }[] | null }) => new Set((data ?? []).map((a) => a.article_id)))
        : Promise.resolve(new Set<string>()),
    ])

  if (lawsError) throw lawsError

  const lawList = (laws ?? []) as Law[]
  const allPendingReformIds = [...reformsByLaw.values()].flat().map((r) => r.id)

  const articlePairsByReform: Record<string, ArticlePair[]> = {}

  if (actor.userId && annotatedArticleIds.size && allPendingReformIds.length) {
    const [{ data: oldArticleData }, { data: newArticleData }] = await Promise.all([
      db
        .from('articles')
        .select('id, law_id')
        .in('id', [...annotatedArticleIds])
        .eq('is_current', false),
      db
        .from('articles')
        .select('id, previous_version_id, reform_id')
        .in('reform_id', allPendingReformIds)
        .not('previous_version_id', 'is', null),
    ])

    const oldArticleIdSet = new Set((oldArticleData ?? []).map((a: { id: string }) => a.id))

    for (const art of (newArticleData ?? []) as { id: string; previous_version_id: string | null; reform_id: string }[]) {
      if (art.previous_version_id && oldArticleIdSet.has(art.previous_version_id)) {
        const pairs = articlePairsByReform[art.reform_id] ?? []
        pairs.push({ oldArticleId: art.previous_version_id, newArticleId: art.id })
        articlePairsByReform[art.reform_id] = pairs
      }
    }
  }

  const articleCounts = await getArticleCounts(db, lawList.map((l) => l.id))

  const reformsByLawObj: Record<string, LawReform[]> = {}
  for (const [lawId, reforms] of reformsByLaw) reformsByLawObj[lawId] = reforms

  const articleCountsObj: Record<string, number> = {}
  for (const [lawId, count] of articleCounts) articleCountsObj[lawId] = count

  return {
    laws: lawList,
    reformsByLaw: reformsByLawObj,
    articleCounts: articleCountsObj,
    articlePairsByReform,
    totalPending,
  }
}
