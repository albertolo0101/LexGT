import Link from 'next/link'
import { Ico } from '@/components/icons'
import { sectionLabel } from '@/lib/section-kind'
import type { Law, Section, LawReform } from '@/lib/types'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function DocHeader({
  law,
  section,
  parentSection,
  latestReform,
}: {
  law: Law
  section: Section
  parentSection: Section | null
  latestReform: LawReform | null
}) {
  return (
    <header className="border-b border-rule pb-6 mb-8">
      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-4">
        <Link href="/leyes" className="hover:text-navy-700 transition-colors">Biblioteca</Link>
        <Ico.chev className="w-3 h-3" />
        <Link href="/leyes" className="hover:text-navy-700 transition-colors">Leyes</Link>
        <Ico.chev className="w-3 h-3" />
        <Link href={`/leyes/${law.slug}`} className="hover:text-navy-700 transition-colors truncate max-w-[200px]">
          {law.short_name}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-700 mb-1">
            {law.decree ? `${law.decree} · ` : ''}{sectionLabel(section)}
          </p>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink-900 leading-snug">{section.heading}</h1>
          {parentSection && (
            <p className="mt-1 font-serif italic text-ink-500 text-sm">{parentSection.heading}</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-ink-400">
          <button title="Guardar" className="p-2 hover:text-navy-700 transition-colors">
            <Ico.bookmark className="w-4 h-4" />
          </button>
          <button title="Compartir" className="p-2 hover:text-navy-700 transition-colors">
            <Ico.share className="w-4 h-4" />
          </button>
          <button title="Imprimir" className="p-2 hover:text-navy-700 transition-colors">
            <Ico.print className="w-4 h-4" />
          </button>
          <button title="Más" className="p-2 hover:text-navy-700 transition-colors">
            <Ico.more className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
        {law.enacted_on && <span>Emitido: {formatDate(law.enacted_on)}</span>}
        {latestReform && <span>Última reforma: {formatDate(latestReform.published_at)}</span>}
        <span>Congreso de la República de Guatemala</span>
      </div>
    </header>
  )
}
