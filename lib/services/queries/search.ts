import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SearchResult = {
  article_id: string
  article_number: string
  article_heading: string | null
  snippet: string
  law_slug: string
  law_short_name: string
  section_id: string
}

type ArticleRow = {
  id: string
  number: string
  heading: string | null
  section_id: string | null
  law_id: string
  laws: { slug: string; short_name: string }
  paragraphs: { text: string; position: number }[]
}

type ParagraphRow = {
  text: string
  article_id: string
  articles: {
    id: string
    number: string
    heading: string | null
    section_id: string | null
    law_id: string
    is_current: boolean
    laws: { slug: string; short_name: string }
  }
}

export type SearchArticlesInput = {
  q: string
  lawSlug: string | null
  limit: number
}

export type SearchArticlesResult = {
  results: SearchResult[]
  total: number
}

// Búsqueda full-text sobre artículos y párrafos (search_vector, config 'spanish'),
// deduplicada por artículo. Coincidencias de artículo tienen prioridad sobre las de párrafo.
export async function searchArticles(db: SupabaseClient, input: SearchArticlesInput): Promise<SearchArticlesResult> {
  const { q, lawSlug, limit } = input

  let lawId: string | null = null
  if (lawSlug) {
    const { data: lawData } = await db.from('laws').select('id').eq('slug', lawSlug).single()
    if (!lawData) return { results: [], total: 0 }
    lawId = lawData.id as string
  }

  let articleQuery = db
    .from('articles')
    .select('id, number, heading, section_id, law_id, laws(slug, short_name), paragraphs(text, position)')
    .textSearch('search_vector', q, { type: 'plain', config: 'spanish' })
    .eq('is_current', true)
    .limit(limit)

  if (lawId) articleQuery = articleQuery.eq('law_id', lawId)

  const paragraphQuery = db
    .from('paragraphs')
    .select('text, article_id, articles(id, number, heading, section_id, law_id, is_current, laws(slug, short_name))')
    .textSearch('search_vector', q, { type: 'plain', config: 'spanish' })
    .limit(limit * 2)

  const [{ data: articleRows }, { data: paragraphRows }] = await Promise.all([articleQuery, paragraphQuery])

  const resultMap = new Map<string, SearchResult>()

  for (const raw of articleRows ?? []) {
    const row = raw as unknown as ArticleRow
    const paras = [...(row.paragraphs ?? [])].sort((a, b) => a.position - b.position).slice(0, 2)
    resultMap.set(row.id, {
      article_id: row.id,
      article_number: row.number,
      article_heading: row.heading,
      snippet: paras.map((p) => p.text).join(' '),
      law_slug: row.laws.slug,
      law_short_name: row.laws.short_name,
      section_id: row.section_id ?? '',
    })
  }

  for (const raw of paragraphRows ?? []) {
    const row = raw as unknown as ParagraphRow
    const article = row.articles
    if (!article.is_current) continue
    if (lawId && article.law_id !== lawId) continue
    if (resultMap.has(article.id)) continue
    resultMap.set(article.id, {
      article_id: article.id,
      article_number: article.number,
      article_heading: article.heading,
      snippet: row.text,
      law_slug: article.laws.slug,
      law_short_name: article.laws.short_name,
      section_id: article.section_id ?? '',
    })
    if (resultMap.size >= limit) break
  }

  const results = Array.from(resultMap.values())
  return { results, total: results.length }
}
