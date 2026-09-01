'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/auth/actions'
import type { EffectiveTier, SerializedUser } from './ShellClient'

/**
 * Menú de la cuenta.
 *
 * Antes era `hidden group-hover:block`: el panel vivía mientras el puntero
 * estuviera encima, así que al moverse hacia "Cerrar sesión" —o al cruzar el
 * hueco de 8px que lo separa del botón— desaparecía. Ahora abre con click y se
 * cierra con click afuera, Escape o al navegar; nunca solo por mover el ratón.
 */
export default function UserMenu({
  user,
  tier,
}: {
  user: NonNullable<SerializedUser>
  tier: EffectiveTier
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : '··'

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de la cuenta"
        className={[
          'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
          open
            ? 'border-gold-400 bg-navy-700 text-gold-200'
            : 'border-white/10 bg-navy-700 text-gold-200 hover:border-gold-400/60',
        ].join(' ')}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="lex-fade absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-lg border border-rule bg-white py-1 text-ink-900 shadow-lg"
        >
          <div className="border-b border-rule px-3 py-2">
            <p className="truncate text-xs text-ink-700">{user.email}</p>
            <p className="mt-0.5 text-[11px] font-medium text-gold-700">
              {tier === 'pro' ? 'Plan Pro' : 'Plan Free'}
            </p>
          </div>

          <Link
            href="/cuenta"
            role="menuitem"
            className="block px-3 py-2 text-sm transition-colors hover:bg-paper-2"
          >
            Mi cuenta y suscripción
          </Link>

          {tier === 'pro' && (
            <Link
              href="/casos"
              role="menuitem"
              className="block px-3 py-2 text-sm transition-colors hover:bg-paper-2"
            >
              Mis casos
            </Link>
          )}

          <form action={signOut} className="border-t border-rule">
            <button
              type="submit"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-paper-2"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
