import Link from 'next/link'
import { Ico } from '@/components/icons'
import type { SiblingSection } from './types'

export default function SectionNav({
  lawSlug,
  prev,
  next,
}: {
  lawSlug: string
  prev: SiblingSection | null
  next: SiblingSection | null
}) {
  if (!prev && !next) return null

  return (
    <nav className="mt-12 pt-6 border-t border-rule grid grid-cols-2 gap-4">
      {prev ? (
        <Link
          href={`/leyes/${lawSlug}/${prev.id}`}
          className="flex items-center gap-2 text-left rounded-lg border border-rule bg-white p-3 hover:border-gold-400 transition-colors"
        >
          <Ico.chev className="w-4 h-4 rotate-180 text-ink-400 flex-shrink-0" />
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-ink-400">Anterior</span>
            <span className="block text-sm text-ink-900 truncate">{prev.heading}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/leyes/${lawSlug}/${next.id}`}
          className="flex items-center justify-end gap-2 text-right rounded-lg border border-rule bg-white p-3 hover:border-gold-400 transition-colors"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-ink-400">Siguiente</span>
            <span className="block text-sm text-ink-900 truncate">{next.heading}</span>
          </span>
          <Ico.chev className="w-4 h-4 text-ink-400 flex-shrink-0" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
