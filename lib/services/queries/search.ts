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

export type LawResult = {
  law_id: string
  slug: string
  short_name: string
  full_name: string
  decree: string | null
}

// Sin acentos y en minúsculas: nadie escribe "Ley Orgánica" con tilde en un
// buscador, y `to_tsvector('spanish')` tampoco resuelve esto porque el nombre
// de la ley no vive en ningún search_vector.
const COMBINING_MARKS = /[̀-ͯ]/g

function fold(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
}

// Palabras que aparecen en casi todos los nombres de ley y no discriminan.
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'para', 'a'])

/**
 * Busca LEYES por su nombre.
 *
 * Va aparte de `searchArticles` porque el nombre de una ley no está en ningún
 * `search_vector`: `articles.search_vector` solo indexa número y epígrafe, y
 * `paragraphs.search_vector` el texto. Por eso "ley orgánica del instituto…"
 * devolvía artículos sueltos y nunca la ley.
 *
 * El filtrado es en memoria a propósito: `laws` son decenas de filas (121 en
 * el catálogo objetivo), traerlas es más barato que un índice nuevo, y así el
 * cotejo puede ignorar acentos y orden de palabras sin depender de la
 * extensión `unaccent`.
 */
export async function searchLaws(
  db: SupabaseClient,
  q: string,
  limit = 5
): Promise<LawResult[]> {
  const tokens = fold(q).split(/\s+/).filter((t) => t.length > 1 && !STOPWORDS.has(t))
  if (tokens.length === 0) return []

  const { data, error } = await db
    .from('laws')
    .select('id, slug, short_name, full_name, decree')
    .eq('is_active', true)
  if (error) throw error

  type Row = { id: string; slug: string; short_name: string; full_name: string; decree: string | null }

  const scored = ((data ?? []) as Row[])
    .map((law) => {
      const short = fold(law.short_name)
      const full = fold(law.full_name ?? '')
      const decree = fold(law.decree ?? '')
      const haystack = `${short} ${full} ${decree}`

      // Todos los términos deben aparecer; si no, no es esta ley.
      if (!tokens.every((t) => haystack.includes(t))) return null

      // El nombre corto pesa más que el largo, y el decreto exacto más que
      // ambos: quien escribe "114-97" quiere el Código Civil, no una mención.
      let score = 0
      for (const token of tokens) {
        if (decree && decree.includes(token)) score += 6
        if (short.includes(token)) score += 3
        if (full.includes(token)) score += 1
      }
      if (short.startsWith(tokens[0]) || full.startsWith(tokens[0])) score += 2

      return { law, score }
    })
    .filter((x): x is { law: Row; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.law.short_name.localeCompare(b.law.short_name, 'es'))
    .slice(0, limit)

  return scored.map(({ law }) => ({
    law_id: law.id,
    slug: law.slug,
    short_name: law.short_name,
    full_name: law.full_name,
    decree: law.decree,
  }))
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
