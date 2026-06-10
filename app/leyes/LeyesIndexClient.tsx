'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Law, LawReform } from '@/lib/types'
import LawCard from '@/components/LawCard'
import PaywallModal from '@/components/PaywallModal'
import { Ico } from '@/components/icons'

type ArticlePair = { oldArticleId: string; newArticleId: string }
type Tier = 'anonymous' | 'free' | 'pro'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function LeyesIndexClient({
  laws,
  reformsByLaw,
  articleCounts,
  articlePairsByReform,
  tier,
  totalPending,
}: {
  laws: Law[]
  reformsByLaw: Record<string, LawReform[]>
  articleCounts: Record<string, number>
  articlePairsByReform: Record<string, ArticlePair[]>
  tier: Tier
  totalPending: number
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<'todas' | 'reformas' | 'az'>('todas')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [paywallOpen, setPaywallOpen] = useState(false)

  const totalArticles = Object.values(articleCounts).reduce((a, b) => a + b, 0)

  const recentReformLaws = laws.filter((l) => (reformsByLaw[l.id] ?? []).length > 0)

  const filteredLaws = useMemo(() => {
    let list = laws
    if (filter === 'reformas') list = list.filter((l) => (reformsByLaw[l.id] ?? []).length > 0)
    if (filter === 'az') list = [...list].sort((a, b) => a.short_name.localeCompare(b.short_name, 'es'))
    return list
  }, [laws, filter, reformsByLaw])

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="bg-paper min-h-full">
      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-300 mb-3">
            Biblioteca legal de Guatemala
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl leading-tight max-w-2xl">
            Legislación guatemalteca, siempre <span className="italic text-gold-400">al día.</span>
          </h1>
          <p className="mt-4 max-w-xl text-navy-100/80 text-sm sm:text-base">
            Consulta leyes, códigos y decretos vigentes, con alertas de reformas y herramientas para organizar tu trabajo legal.
          </p>

          <form onSubmit={handleHeroSearch} className="mt-8 flex max-w-lg">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar leyes, artículos, palabras clave…"
              className="flex-1 rounded-l-full bg-white/10 border border-white/15 px-5 py-3 text-sm placeholder:text-navy-100/50 focus:outline-none focus:bg-white/15"
            />
            <button
              type="submit"
              className="rounded-r-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-sm px-6 transition-colors"
            >
              Buscar
            </button>
          </form>

          <div className="mt-10 flex flex-wrap gap-8 text-sm">
            <div>
              <p className="font-serif text-2xl text-gold-300">{laws.length}</p>
              <p className="text-navy-100/60">leyes disponibles</p>
            </div>
            <div>
              <p className="font-serif text-2xl text-gold-300">{totalArticles}</p>
              <p className="text-navy-100/60">artículos vigentes</p>
            </div>
            <div>
              <p className="font-serif text-2xl text-gold-300">{totalPending}</p>
              <p className="text-navy-100/60">reformas pendientes</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Recent reforms */}
        {recentReformLaws.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-4">
              Reformas recientes
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentReformLaws.map((law) => {
                const reforms = reformsByLaw[law.id] ?? []
                const latest = reforms[0]
                return (
                  <Link
                    key={law.id}
                    href={`/leyes/${law.slug}`}
                    className="block rounded-xl border border-rule bg-white p-4 hover:border-gold-400 transition-colors"
                  >
                    <p className="text-xs font-semibold text-gold-700 uppercase tracking-wide mb-1">
                      {reforms.length} {reforms.length === 1 ? 'reforma' : 'reformas'}
                    </p>
                    <p className="text-sm font-medium text-ink-900">{law.short_name}</p>
                    {latest && (
                      <p className="text-xs text-ink-500 mt-1">
                        {latest.title} · {formatDate(latest.published_at)}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Catalog */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              {(['todas', 'reformas', 'az'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    'text-xs font-medium rounded-full px-3 py-1.5 transition-colors',
                    filter === f ? 'bg-navy-900 text-white' : 'border border-rule text-ink-500 hover:border-navy-300',
                  ].join(' ')}
                >
                  {f === 'todas' ? 'Todas' : f === 'reformas' ? 'Con reformas' : 'A→Z'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'bg-navy-900 text-white' : 'text-ink-400 hover:text-ink-700'}`}
                aria-label="Vista de cuadrícula"
              >
                <Ico.layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded transition-colors ${view === 'list' ? 'bg-navy-900 text-white' : 'text-ink-400 hover:text-ink-700'}`}
                aria-label="Vista de lista"
              >
                <Ico.scroll className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'border-t border-rule'}>
            {filteredLaws.map((law) => (
              <LawCard
                key={law.id}
                law={law}
                pendingReforms={reformsByLaw[law.id] ?? []}
                userTier={tier}
                articlePairsByReform={articlePairsByReform}
                articleCount={articleCounts[law.id] ?? 0}
                view={view}
              />
            ))}
          </div>
        </section>

        {tier !== 'pro' && (
          <section className="rounded-2xl bg-navy-900 text-white px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-300 mb-2">LexGT Pro</p>
              <h3 className="font-serif text-xl sm:text-2xl">Resalta, anota y organiza tu investigación legal.</h3>
            </div>
            <button
              onClick={() => setPaywallOpen(true)}
              className="flex-shrink-0 rounded-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-sm px-6 py-2.5 transition-colors"
            >
              Conocer Pro
            </button>
          </section>
        )}
      </div>

      {paywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}
    </div>
  )
}
