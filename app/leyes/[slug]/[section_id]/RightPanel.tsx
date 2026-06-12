'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Ico } from '@/components/icons'
import { HL_COLORS } from '@/lib/case-colors'
import PaywallModal from '@/components/PaywallModal'
import type { LawReform } from '@/lib/types'
import type { NoteItem, OrphanedAnnotation } from './types'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

type Tab = 'notas' | 'caso' | 'concordancias' | 'historial'

const TABS: { id: Tab; label: string }[] = [
  { id: 'notas', label: 'Notas' },
  { id: 'caso', label: 'Caso' },
  { id: 'concordancias', label: 'Concordancias' },
  { id: 'historial', label: 'Historial' },
]

export default function RightPanel({
  tier,
  notes,
  orphanedAnnotations,
  reforms,
  lawSlug,
}: {
  tier: 'anonymous' | 'free' | 'pro'
  notes: NoteItem[]
  orphanedAnnotations: OrphanedAnnotation[]
  reforms: LawReform[]
  lawSlug: string
}) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<Tab>(notes.length > 0 || orphanedAnnotations.length > 0 ? 'notas' : 'historial')
  const [paywallOpen, setPaywallOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden xl:flex w-10 flex-shrink-0 items-start justify-center pt-1 text-ink-400 hover:text-navy-700 transition-colors"
        aria-label="Mostrar panel"
      >
        <Ico.note className="w-4 h-4" />
      </button>
    )
  }

  return (
    <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 pl-2">
      <div className="sticky top-6 rounded-xl border border-rule bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-rule px-3">
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'text-xs font-medium px-2.5 py-3 border-b-2 -mb-px transition-colors',
                  tab === t.id ? 'border-gold-500 text-navy-900' : 'border-transparent text-ink-400 hover:text-ink-700',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-400 hover:text-navy-700 transition-colors p-1"
            aria-label="Ocultar panel"
          >
            <Ico.x className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {tab === 'notas' &&
            (tier === 'pro' ? (
              notes.length === 0 && orphanedAnnotations.length === 0 ? (
                <p className="text-sm text-ink-400">Aún no tienes notas en esta ley.</p>
              ) : (
                <div className="space-y-4">
                  {notes.length > 0 && (
                    <ul className="space-y-3">
                      {notes.map((n) => (
                        <li key={n.id}>
                          <a
                            href={n.sectionId ? `/leyes/${lawSlug}/${n.sectionId}#articulo-${n.articleNumber}` : '#'}
                            className="block rounded-lg border border-rule p-3 hover:border-gold-400 transition-colors"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1">
                              Art. {n.articleNumber}{n.articleHeading ? ` — ${n.articleHeading}` : ''}
                            </p>
                            <p
                              className="text-xs text-ink-700 italic mb-2 line-clamp-2 px-1 rounded-sm"
                              style={{ backgroundColor: HL_COLORS[n.color] }}
                            >
                              “{n.quote}”
                            </p>
                            <p className="text-sm text-ink-900">{n.note}</p>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {orphanedAnnotations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-2">
                        Texto modificado
                      </p>
                      <ul className="space-y-3">
                        {orphanedAnnotations.map((o) => (
                          <li key={o.id}>
                            <a
                              href={o.sectionId ? `/leyes/${lawSlug}/${o.sectionId}#articulo-${o.articleNumber}` : '#'}
                              className="block rounded-lg border border-amber-300 bg-amber-50 p-3 hover:border-amber-400 transition-colors"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 mb-1">
                                Art. {o.articleNumber}{o.articleHeading ? ` — ${o.articleHeading}` : ''}
                              </p>
                              <p
                                className="text-xs text-ink-700 italic mb-2 line-clamp-2 px-1 rounded-sm"
                                style={{ backgroundColor: HL_COLORS[o.color] }}
                              >
                                “{o.quote}”
                              </p>
                              {o.note && <p className="text-sm text-ink-900 mb-1">{o.note}</p>}
                              <p className="text-[10px] text-amber-700 font-medium">El texto cambió</p>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-ink-500 mb-3">Las notas son una función de LexGT Pro.</p>
                <button
                  onClick={() => setPaywallOpen(true)}
                  className="text-xs font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 transition-colors rounded-full px-4 py-2"
                >
                  Conocer Pro
                </button>
              </div>
            ))}

          {tab === 'caso' &&
            (tier === 'pro' ? (
              <div className="text-center py-4">
                <p className="text-sm text-ink-500 mb-3">Selecciona un caso desde Mis casos para vincular artículos.</p>
                <Link href="/casos" className="text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors">
                  Ir a Mis casos →
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-ink-500 mb-3">Los casos son una función de LexGT Pro.</p>
                <button
                  onClick={() => setPaywallOpen(true)}
                  className="text-xs font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 transition-colors rounded-full px-4 py-2"
                >
                  Conocer Pro
                </button>
              </div>
            ))}

          {tab === 'concordancias' && (
            <div className="text-center py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-1">En desarrollo</p>
              <p className="text-sm text-ink-500">Las concordancias entre artículos estarán disponibles próximamente.</p>
            </div>
          )}

          {tab === 'historial' &&
            (reforms.length === 0 ? (
              <p className="text-sm text-ink-400">Sin reformas registradas para esta ley.</p>
            ) : (
              <ul className="space-y-3">
                {reforms.map((r, i) => (
                  <li key={r.id} className="relative pl-4 border-l border-rule">
                    <span className={`absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-gold-500' : 'bg-ink-400'}`} />
                    {i === 0 && (
                      <span className="inline-block text-[9px] font-semibold uppercase tracking-wide text-gold-700 bg-gold-50 border border-gold-400/40 rounded px-1.5 py-0.5 mb-1">
                        Vigente
                      </span>
                    )}
                    <p className="text-sm text-ink-900">{r.title}</p>
                    <p className="text-xs text-ink-400">{formatDate(r.published_at)}</p>
                    {r.description && <p className="text-xs text-ink-500 mt-1">{r.description}</p>}
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
      {paywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}
    </aside>
  )
}
