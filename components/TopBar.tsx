import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { Ico } from './icons'
import ToolsMenu from './ToolsMenu'
import type { EffectiveTier, SerializedUser } from './ShellClient'

export default function TopBar({
  tier,
  user,
  totalPending,
  onOpenSearch,
  onOpenPaywall,
  onToggleSidebar,
  sidebarOpen,
}: {
  tier: EffectiveTier
  user: SerializedUser
  totalPending: number
  onOpenSearch: () => void
  onOpenPaywall: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}) {
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : ''

  return (
    <header className="h-[62px] flex-shrink-0 bg-navy-900 text-white flex items-center gap-3 px-3 sm:px-5 z-30 relative">
      <button
        onClick={onToggleSidebar}
        className="sm:hidden p-1.5 -ml-1 text-navy-100 hover:text-white transition-colors"
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <Link href="/leyes" className="flex items-center gap-2.5 flex-shrink-0 group">
        <span className="w-8 h-8 rounded-full border border-gold-400/60 bg-navy-800 flex items-center justify-center text-gold-400 group-hover:text-gold-200 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v5c0 4.5 3 7.5 8 9 5-1.5 8-4.5 8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <span className="leading-tight hidden sm:block">
          <span className="block font-serif text-[17px] tracking-wide">LexGT</span>
          <span className="block text-[10px] text-navy-100/70 -mt-0.5">Biblioteca legal · Guatemala</span>
        </span>
      </Link>

      <div className="flex-1 flex items-center justify-center gap-2 px-1 sm:px-4">
        <button
          onClick={onOpenSearch}
          className="w-full max-w-md flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-3 py-2 text-left text-navy-100/80"
        >
          <Ico.search className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm flex-1 truncate hidden sm:inline">Buscar leyes, artículos…</span>
          <span className="text-sm flex-1 truncate sm:hidden">Buscar…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-navy-100/60 border border-white/15 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        <ToolsMenu />
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {tier === 'free' && (
          <button
            onClick={onOpenPaywall}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium border border-gold-400/50 text-gold-200 hover:bg-gold-400/10 transition-colors rounded-full px-3 py-1.5"
          >
            Actualizar a Pro
          </button>
        )}
        {tier === 'pro' && (
          <span className="hidden sm:inline-flex items-center text-xs font-semibold text-navy-900 bg-gold-400 rounded-full px-3 py-1">
            Pro
          </span>
        )}

        {tier === 'anonymous' ? (
          <Link
            href="/auth/login"
            className="text-xs font-medium text-navy-100 hover:text-white transition-colors"
          >
            Iniciar sesión
          </Link>
        ) : (
          <>
            <button
              title="Notificaciones"
              className="relative p-1.5 text-navy-100/80 hover:text-white transition-colors"
            >
              <Ico.bell className="w-[18px] h-[18px]" />
              {totalPending > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold-400" />
              )}
            </button>

            <div className="relative group">
              <button className="w-8 h-8 rounded-full bg-navy-700 border border-white/10 flex items-center justify-center text-xs font-semibold text-gold-200">
                {initials}
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-white text-ink-900 rounded-lg shadow-lg border border-rule py-1 min-w-[160px] z-50">
                <p className="px-3 py-1.5 text-xs text-ink-500 truncate border-b border-rule">{user?.email}</p>
                {tier === 'pro' && (
                  <Link href="/casos" className="block px-3 py-1.5 text-sm hover:bg-paper-2 transition-colors">
                    Mis casos
                  </Link>
                )}
                <form action={signOut}>
                  <button type="submit" className="w-full text-left px-3 py-1.5 text-sm hover:bg-paper-2 transition-colors">
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
