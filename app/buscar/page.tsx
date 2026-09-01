import { createServerSupabaseClient } from '@/lib/supabase-server'
import { searchArticles, searchLaws } from '@/lib/services/queries/search'
import Link from 'next/link'
import type { Metadata } from 'next'
import { articleAnchor } from "@/lib/anchors";

type Props = { searchParams: Promise<{ q?: string; law?: string }> }

// El nombre largo aporta poco cuando ya está contenido en el corto más el
// decreto — y en varias leyes `full_name` es literalmente
// "<short_name> <decree>", lo que se veía como una línea repetida.
function addsDetail(shortName: string, fullName: string, decree: string | null): boolean {
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñ]/gi, '')
  const full = squash(fullName)
  const short = squash(shortName)
  return Boolean(full) && full !== short && full !== short + squash(decree ?? '')
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  return {
    title: query ? `"${query}" — Buscar en LexGT` : 'Buscar — LexGT',
  }
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

  const supabase = await createServerSupabaseClient()
  const [{ results }, laws] = await Promise.all([
    searchArticles(supabase, { q: query, lawSlug: law ?? null, limit: 20 }),
    law ? Promise.resolve([]) : searchLaws(supabase, query),
  ])

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs text-gray-400 mb-6">
          {results.length > 0 || laws.length > 0
            ? `${laws.length + results.length} resultado${laws.length + results.length === 1 ? '' : 's'} para "${query}"`
            : `Sin resultados para "${query}"`}
        </p>

        {laws.length > 0 && (
          <section className="mb-8">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {laws.length === 1 ? 'Ley' : 'Leyes'}
            </p>
            <ul className="divide-y divide-gray-100">
              {laws.map((l) => (
                <li key={l.law_id}>
                  <Link
                    href={`/leyes/${l.slug}`}
                    className="group -mx-3 block rounded px-3 py-4 transition-colors hover:bg-gray-50"
                  >
                    <p className="text-[13px] font-semibold text-gray-900 group-hover:text-gray-700">
                      {l.short_name}
                      {l.decree && <span className="ml-1.5 font-normal text-gray-400">{l.decree}</span>}
                    </p>
                    {addsDetail(l.short_name, l.full_name ?? '', l.decree) && (
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{l.full_name}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.length > 0 && laws.length > 0 && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Artículos
          </p>
        )}

        {results.length === 0 && laws.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-500 mb-1">No se encontraron artículos.</p>
            <p className="text-xs text-gray-400">Intenta con otras palabras o un término más general.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {results.map((r) => (
              <li key={r.article_id}>
                <Link
                  href={`/leyes/${r.law_slug}#${articleAnchor(r.article_number)}`}
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
