'use client'

import { useEffect, useRef, useState } from 'react'
import { Ico } from '@/components/icons'
import type { TocEntry } from '@/lib/services/queries/reading'

// Un encabezado se considera "actual" cuando su parte superior pasa esta línea.
const ACTIVE_OFFSET = 96

function getScrollParent(el: HTMLElement): HTMLElement {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
    node = node.parentElement
  }
  return document.documentElement
}

/**
 * Índice de la ley. El documento completo vive en una sola página, así que
 * esto no navega: hace scroll dentro del documento y marca la sección en la
 * que va el lector (scroll-spy por offsets sobre los encabezados que ya
 * renderizó el servidor).
 */
export default function LawToc({
  entries,
  lawShortName,
  decree,
  articleCount,
}: {
  entries: TocEntry[]
  lawShortName: string
  decree: string | null
  articleCount: number
}) {
  const [open, setOpen] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (entries.length === 0) return

    const found = entries
      .map((entry) => ({ entry, el: document.getElementById(entry.anchor) }))
      .filter((x): x is { entry: TocEntry; el: HTMLElement } => x.el !== null)
    if (found.length === 0) return

    const scroller = getScrollParent(found[0].el)
    const scrollTop = () => (scroller === document.documentElement ? window.scrollY : scroller.scrollTop)

    // Se miden los offsets una sola vez y se busca por bisección: con 159
    // secciones (Código Civil) leer rects en cada frame de scroll sería caro.
    let offsets: number[] = []
    const measure = () => {
      const base = scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top
      const top = scrollTop()
      offsets = found.map(({ el }) => el.getBoundingClientRect().top - base + top)
    }

    const update = () => {
      const pos = scrollTop() + ACTIVE_OFFSET
      let lo = 0
      let hi = offsets.length - 1
      let idx = 0
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (offsets[mid] <= pos) {
          idx = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      setActiveId(found[idx].entry.id)
    }

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }
    const onResize = () => {
      measure()
      update()
    }

    measure()
    update()

    const target: HTMLElement | Window = scroller === document.documentElement ? window : scroller
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [entries])

  // Mantiene visible el ítem activo dentro del índice sin mover el documento.
  useEffect(() => {
    if (!activeId || !listRef.current) return
    const link = listRef.current.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`)
    if (!link) return
    const container = listRef.current
    const linkBox = link.getBoundingClientRect()
    const box = container.getBoundingClientRect()
    if (linkBox.top < box.top || linkBox.bottom > box.bottom) {
      container.scrollTop += linkBox.top - box.top - box.height / 3
    }
  }, [activeId])

  function goTo(e: React.MouseEvent<HTMLAnchorElement>, entry: TocEntry) {
    e.preventDefault()
    const el = document.getElementById(entry.anchor)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(entry.id)
    history.replaceState(null, '', `#${entry.anchor}`)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex w-10 flex-shrink-0 items-start justify-center pt-2 text-ink-400 hover:text-navy-700 transition-colors"
        aria-label="Mostrar tabla de contenidos"
      >
        <Ico.layers className="w-4 h-4" />
      </button>
    )
  }

  return (
    <aside className="hidden lg:block w-[268px] flex-shrink-0">
      <div className="sticky top-0 flex max-h-[calc(100vh-6rem)] flex-col pt-1">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-serif text-sm leading-snug text-ink-900">{lawShortName}</p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              {decree ? `${decree} · ` : ''}
              {articleCount} artículos
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mt-0.5 text-ink-400 transition-colors hover:text-navy-700"
            aria-label="Ocultar tabla de contenidos"
          >
            <Ico.x className="h-3.5 w-3.5" />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-ink-400">Esta ley no tiene secciones.</p>
        ) : (
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto border-l border-rule pl-3 pr-1">
            <ul className="space-y-0.5 pb-8">
              {entries.map((entry) => {
                const active = entry.id === activeId
                return (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.anchor}`}
                      data-toc-id={entry.id}
                      onClick={(e) => goTo(e, entry)}
                      style={{ paddingLeft: `${entry.depth * 0.625}rem` }}
                      className={[
                        'block rounded py-1 pr-1 text-xs leading-snug transition-colors',
                        active
                          ? 'font-semibold text-navy-800'
                          : 'text-ink-500 hover:text-navy-700',
                      ].join(' ')}
                      aria-current={active ? 'true' : undefined}
                    >
                      {entry.label && (
                        <>
                          <span className={active ? 'text-gold-700' : 'text-ink-400'}>{entry.label}</span>
                          <span className="mx-1 text-ink-400">·</span>
                        </>
                      )}
                      {entry.heading}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
