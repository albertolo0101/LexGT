'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Ico } from '@/components/icons'
import type { SiblingSection } from './types'

type ArticleStub = { id: string; number: string; heading: string | null }

export default function ChapterRail({
  lawSlug,
  sectionLabel,
  parentLabel,
  articles,
  nextSection,
}: {
  lawSlug: string
  sectionLabel: string
  parentLabel: string | null
  articles: ArticleStub[]
  nextSection: SiblingSection | null
}) {
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex w-10 flex-shrink-0 items-start justify-center pt-1 text-ink-400 hover:text-navy-700 transition-colors"
        aria-label="Mostrar tabla de contenidos"
      >
        <Ico.layers className="w-4 h-4" />
      </button>
    )
  }

  return (
    <aside className="hidden lg:block w-[220px] flex-shrink-0 pr-2">
      <div className="sticky top-6">
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/leyes/${lawSlug}`}
            className="text-xs font-semibold uppercase tracking-widest text-ink-400 hover:text-navy-700 transition-colors"
          >
            Tabla de contenidos
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-400 hover:text-navy-700 transition-colors"
            aria-label="Ocultar tabla de contenidos"
          >
            <Ico.x className="w-3.5 h-3.5" />
          </button>
        </div>

        {parentLabel && <p className="text-xs text-ink-400 mb-0.5">{parentLabel}</p>}
        <p className="font-serif text-sm text-ink-900 mb-3">{sectionLabel}</p>

        {articles.length > 0 && (
          <ul className="space-y-1 mb-6 border-l border-rule pl-3">
            {articles.map((a) => (
              <li key={a.id}>
                <a
                  href={`#articulo-${a.number}`}
                  className="block text-xs text-ink-500 hover:text-navy-700 transition-colors py-0.5 truncate"
                >
                  Art. {a.number}{a.heading ? ` — ${a.heading}` : ''}
                </a>
              </li>
            ))}
          </ul>
        )}

        {nextSection && (
          <Link
            href={`/leyes/${lawSlug}/${nextSection.id}`}
            className="block rounded-lg border border-rule bg-white p-3 hover:border-gold-400 transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1">Siguiente</p>
            <p className="text-sm text-ink-900 leading-snug">{nextSection.heading}</p>
          </Link>
        )}
      </div>
    </aside>
  )
}
