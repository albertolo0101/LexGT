import Link from 'next/link'
import { Ico } from '@/components/icons'
import type { Law, LawReform } from '@/lib/types'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function DocHeader({
  law,
  latestReform,
  articleCount,
}: {
  law: Law
  latestReform: LawReform | null
  articleCount: number
}) {
  return (
    <header className="mb-10 border-b border-rule pb-8 text-center">
      <div className="mb-6 flex items-center justify-center gap-1.5 text-xs text-ink-400">
        <Link href="/leyes" className="transition-colors hover:text-navy-700">
          Biblioteca
        </Link>
        <Ico.chev className="h-3 w-3" />
        <span className="truncate">{law.short_name}</span>
      </div>

      {law.decree && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">{law.decree}</p>
      )}
      <h1 className="font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">{law.short_name}</h1>
      {law.full_name !== law.short_name && (
        <p className="mx-auto mt-3 max-w-2xl font-serif text-base italic leading-snug text-ink-500">
          {law.full_name}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-ink-500">
        {law.enacted_on && <span>Emitido: {formatDate(law.enacted_on)}</span>}
        {latestReform?.published_at && <span>Última reforma: {formatDate(latestReform.published_at)}</span>}
        <span>{articleCount} artículos</span>
        <span>Congreso de la República de Guatemala</span>
      </div>
    </header>
  )
}
