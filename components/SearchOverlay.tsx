'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Ico } from './icons'
import type { EffectiveTier } from './ShellClient'
import { articleAnchor } from '@/lib/anchors'

type SearchResult = {
  article_id: string
  article_number: string
  article_heading: string | null
  snippet: string
  law_slug: string
  law_short_name: string
  section_id: string
}

export default function SearchOverlay({
  tier,
  onClose,
  onLockedClick,
}: {
  tier: EffectiveTier
  onClose: () => void
  onLockedClick: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function goToResult(r: SearchResult) {
    onClose()
    router.push(`/leyes/${r.law_slug}#${articleAnchor(r.article_number)}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    onClose()
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-rule overflow-hidden lex-fade">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-rule">
          <Ico.search className="w-4 h-4 text-ink-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar leyes, artículos, palabras clave…"
            className="flex-1 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-ink-400 border border-rule rounded px-1.5 py-0.5">ESC</kbd>
        </form>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-rule">
          <span className="text-xs font-medium text-navy-800 bg-navy-50 rounded-full px-3 py-1">Todo</span>
          <button
            onClick={onLockedClick}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-ink-700 rounded-full px-3 py-1 border border-rule transition-colors"
          >
            Jurisprudencias
            {tier !== 'pro' && (
              <span className="text-[9px] font-semibold text-gold-700 bg-gold-200 rounded px-1 leading-none">PRO</span>
            )}
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-400">
              Escribe al menos 2 caracteres para buscar.
            </div>
          ) : loading ? (
            <div className="px-4 py-6 text-center text-sm text-ink-400">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-400">Sin resultados para “{query}”.</div>
          ) : (
            <ul className="divide-y divide-rule">
              {results.map((r) => (
                <li key={r.article_id}>
                  <button
                    onClick={() => goToResult(r)}
                    className="w-full text-left px-4 py-3 hover:bg-paper-2 transition-colors"
                  >
                    <p className="text-xs font-semibold text-navy-700 mb-0.5">
                      {r.law_short_name} · Art. {r.article_number}
                      {r.article_heading ? ` — ${r.article_heading}` : ''}
                    </p>
                    <p className="text-sm text-ink-700 line-clamp-2">{r.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
