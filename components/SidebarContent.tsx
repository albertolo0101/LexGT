'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ico } from './icons'
import { caseColorToken } from '@/lib/case-colors'
import type { EffectiveTier, SidebarLaw, SidebarCase } from './ShellClient'

export default function SidebarContent({
  laws,
  totalPending,
  cases,
  tier,
  isAuthenticated,
  onOpenPaywall,
  onNavigate,
}: {
  laws: SidebarLaw[]
  totalPending: number
  cases: SidebarCase[]
  tier: EffectiveTier
  isAuthenticated: boolean
  onOpenPaywall: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const [leyesOpen, setLeyesOpen] = useState(true)

  const isHome = pathname === '/leyes'

  return (
    <nav className="flex flex-col h-full text-sm">
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          Navegar
        </p>
        <ul className="mb-5">
          <li>
            <Link
              href="/leyes"
              onClick={onNavigate}
              className={[
                'flex items-center justify-between px-4 py-1.5 transition-colors',
                isHome ? 'bg-navy-50 text-navy-800 font-medium' : 'text-ink-700 hover:bg-paper-2',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <Ico.scroll className="w-4 h-4 text-ink-400" />
                Todas las leyes
              </span>
              <span className="text-xs text-ink-400">{laws.length}</span>
            </Link>
          </li>
          <li>
            <Link
              href="/leyes"
              onClick={onNavigate}
              className="flex items-center justify-between px-4 py-1.5 text-ink-700 hover:bg-paper-2 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Ico.bell className="w-4 h-4 text-ink-400" />
                Actualizaciones
              </span>
              {totalPending > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gold-700">{totalPending}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse-gold" />
                </span>
              )}
            </Link>
          </li>
        </ul>

        <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          Biblioteca
        </p>
        <div className="mb-2">
          <button
            onClick={() => setLeyesOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-1.5 text-ink-700 hover:bg-paper-2 transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <Ico.gavel className="w-4 h-4 text-ink-400" />
              Leyes
            </span>
            <Ico.chevD className={`w-3.5 h-3.5 text-ink-400 transition-transform ${leyesOpen ? '' : '-rotate-90'}`} />
          </button>
          {leyesOpen && (
            <ul>
              {laws.map((law) => {
                const active = pathname?.startsWith(`/leyes/${law.slug}`)
                return (
                  <li key={law.id}>
                    <Link
                      href={`/leyes/${law.slug}`}
                      onClick={onNavigate}
                      className={[
                        'flex items-center justify-between gap-2 px-4 py-1.5 pl-9 transition-colors truncate',
                        active ? 'bg-navy-50 text-navy-800 font-medium' : 'text-ink-700 hover:bg-paper-2',
                      ].join(' ')}
                    >
                      <span className="truncate">
                        {law.decree && <span className="text-ink-400 mr-1">{law.decree}</span>}
                        {law.short_name}
                      </span>
                      {law.hasAlert && (
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse-gold flex-shrink-0" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-1 px-4 py-1.5 flex items-center gap-2 text-ink-400">
          <Ico.folder className="w-4 h-4" />
          <span className="text-sm">Jurisprudencias</span>
          <span className="text-[9px] font-medium border border-dashed border-ink-400/50 rounded px-1.5 py-0.5 leading-none uppercase tracking-wide">
            Próximamente
          </span>
        </div>
      </div>

      <div className="border-t border-rule pt-3 pb-4 flex-shrink-0">
        <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          Mis casos
        </p>
        {tier === 'pro' ? (
          <>
            {cases.length === 0 ? (
              <p className="px-4 py-1.5 text-xs text-ink-400">Sin casos todavía.</p>
            ) : (
              <ul>
                {cases.slice(0, 4).map((c) => {
                  const token = caseColorToken(c.color)
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/casos/${c.id}`}
                        onClick={onNavigate}
                        className="flex items-center gap-2 px-4 py-1.5 text-ink-700 hover:bg-paper-2 transition-colors truncate"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: token.solid }} />
                        <span className="truncate flex-1">{c.title}</span>
                        <span className="text-xs text-ink-400">{c.count}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            <Link
              href="/casos"
              onClick={onNavigate}
              className="block px-4 py-1.5 text-xs text-navy-600 hover:text-navy-800 transition-colors"
            >
              {cases.length > 4 ? `Ver todos los casos (${cases.length}) →` : 'Ver todos los casos →'}
            </Link>
          </>
        ) : !isAuthenticated ? (
          <Link
            href="/auth/login"
            onClick={onNavigate}
            className="mx-4 block rounded-lg border border-dashed border-rule bg-paper-2 px-3 py-2.5 text-left text-xs text-ink-500 hover:border-navy-200 transition-colors"
          >
            Inicia sesión para ver tus casos
          </Link>
        ) : (
          <button
            onClick={onOpenPaywall}
            className="mx-4 block rounded-lg border border-dashed border-gold-400/60 bg-gold-50 px-3 py-2.5 text-left text-xs text-gold-700 hover:bg-gold-200/40 transition-colors"
          >
            Casos disponibles en <span className="font-semibold">Pro</span>
          </button>
        )}
      </div>

      <div className="border-t border-rule px-4 py-2.5 text-[11px] text-ink-400 flex-shrink-0">
        {laws.length} leyes verificadas
      </div>
    </nav>
  )
}
