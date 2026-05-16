import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Metadata } from 'next'

type Props = { searchParams: Promise<{ q?: string; law?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  return {
    title: query ? `"${query}" — Buscar en LexGT` : 'Buscar — LexGT',
  }
}

type SearchResult = {
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

async function search(q: string, law: string | null): Promise<SearchResult[]> {
  const limit = 20
  const supabase = await createServerSupabaseClient()

  let lawId: string | null = null
  if (law) {
    const { data } = await supabase.from('laws').select('id').eq('slug', law).single()
    if (!data) return []
    lawId = data.id as string
  }

  let articleQuery = supabase
    .from('articles')
    .select('id, number, heading, section_id, law_id, laws(slug, short_name), paragraphs(text, position)')
    .textSearch('search_vector', q, { type: 'plain', config: 'spanish' })
    .eq('is_current', true)
    .limit(limit)

  if (lawId) articleQuery = articleQuery.eq('law_id', lawId)

  const paragraphQuery = supabase
    .from('paragraphs')
    .select('text, article_id, articles(id, number, heading, section_id, law_id, is_current, laws(slug, short_name))')
    .textSearch('search_vector', q, { type: 'plain', config: 'spanish' })
    .limit(limit * 2)

  const [{ data: articleRows }, { data: paragraphRows }] = await Promise.all([
    articleQuery,
    paragraphQuery,
  ])

  const resultMap = new Map<string, SearchResult>()

  for (const raw of (articleRows ?? [])) {
    const row = raw as unknown as ArticleRow
    const paras = [...(row.paragraphs ?? [])]
      .sort((a, b) => a.position - b.position)
      .slice(0, 2)
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

  for (const raw of (paragraphRows ?? [])) {
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

  return Array.from(resultMap.values())
}

export default async function BuscarPage({ searchParams }: Props) {
  const { q, law } = await searchParams
  const query = (q ?? '').trim()

  if (query.length < 2) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="max-w-lg w-full px-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Buscar en LexGT</h1>
          <p className="text-sm text-gray-500">
            Escribe un término en la barra de búsqueda para comenzar.
          </p>
        </div>
      </div>
    )
  }

  const results = await search(query, law ?? null)

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs text-gray-400 mb-6">
          {results.length > 0
            ? `${results.length} resultado${results.length === 1 ? '' : 's'} para "${query}"`
            : `Sin resultados para "${query}"`}
        </p>

        {results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500 mb-1">No se encontraron artículos.</p>
            <p className="text-xs text-gray-400">Intenta con otras palabras o un término más general.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((r) => (
              <li key={r.article_id}>
                <Link
                  href={`/leyes/${r.law_slug}/${r.section_id}#articulo-${r.article_number}`}
                  className="block py-5 hover:bg-gray-50 -mx-3 px-3 rounded transition-colors group"
                >
                  <p className="text-[13px] font-semibold text-gray-900 mb-1 group-hover:text-gray-700">
                    Artículo {r.article_number}
                    {r.article_heading && (
                      <span className="font-normal italic text-gray-600 ml-1">
                        — {r.article_heading}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                    {r.snippet}
                  </p>
                  <span className="text-[11px] text-gray-400">{r.law_short_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link
            href="/leyes"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Volver a leyes
          </Link>
        </div>
      </main>
    </div>
  )
}
