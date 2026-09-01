'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ico } from './icons'
import { TOOLS } from '@/lib/tools'

/**
 * Menú "Herramientas" de la barra superior, a la par del buscador.
 * Se cierra al navegar, con Escape o al hacer click fuera.
 */
export default function ToolsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = pathname?.startsWith('/herramientas')

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm transition-colors',
          active || open
            ? 'border-gold-400/60 bg-gold-400/10 text-gold-200'
            : 'border-white/10 bg-white/5 text-navy-100/80 hover:bg-white/10',
        ].join(' ')}
      >
        <Ico.layers className="h-4 w-4" />
        <span className="hidden md:inline">Herramientas</span>
        <Ico.chevD className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="lex-fade absolute right-0 top-full z-50 mt-2 w-[280px] overflow-hidden rounded-lg border border-rule bg-white py-1 text-ink-900 shadow-lg"
        >
          {TOOLS.map((tool) => {
            const Icon = Ico[tool.icon]
            return (
              <Link
                key={tool.slug}
                href={`/herramientas/${tool.slug}`}
                role="menuitem"
                className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-paper-2"
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-700" />
                <span>
                  <span className="block text-sm font-medium">{tool.name}</span>
                  <span className="block text-xs text-ink-500">{tool.description}</span>
                </span>
              </Link>
            )
          })}
          <Link
            href="/herramientas"
            role="menuitem"
            className="block border-t border-rule px-3 py-2 text-xs font-medium text-navy-700 transition-colors hover:bg-paper-2"
          >
            Ver todas las herramientas →
          </Link>
        </div>
      )}
    </div>
  )
}
