'use client'
import { useState } from 'react'
import Link from 'next/link'
import SearchBar from './SearchBar'
import { signOut } from '@/app/auth/actions'
import type { Tier } from '@/lib/types'

type SerializedUser = { email: string; id: string } | null

export default function ShellClient({
  user,
  tier,
  sidebar,
  children,
}: {
  user: SerializedUser
  tier: Tier
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* Header */}
      <header className="h-12 border-b border-gray-100 bg-white flex-shrink-0 flex items-center px-4 gap-3 z-30 relative">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="sm:hidden text-gray-500 hover:text-gray-900 p-1 -ml-1 flex-shrink-0"
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link
          href="/leyes"
          className="text-sm font-semibold text-gray-900 tracking-tight hover:text-gray-600 transition-colors flex-shrink-0"
        >
          LexGT
        </Link>

        {/* Centered search */}
        <div className="flex-1 flex justify-center px-2">
          <div className="w-full max-w-sm">
            <SearchBar />
          </div>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {user && tier === 'pro' && (
            <Link
              href="/casos"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Mis casos
            </Link>
          )}
          {user ? (
            <>
              <span className="text-xs text-gray-400 hidden md:block truncate max-w-[140px]">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              Iniciar sesión
            </Link>
          )}

          {/* Right panel toggle */}
          <button
            onClick={() => setRightPanelOpen((o) => !o)}
            className="hidden sm:block text-gray-400 hover:text-gray-700 p-1 transition-colors"
            aria-label={rightPanelOpen ? 'Cerrar panel' : 'Abrir panel lateral'}
          >
            {/* Split-panel icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — fixed overlay on mobile, in-flow on desktop */}
        <aside
          className={[
            'w-[260px] flex-shrink-0 border-r border-gray-100 overflow-y-auto bg-white',
            // Mobile: fixed below header, slides in/out
            'fixed top-12 left-0 bottom-0 z-20 transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            // Desktop: always in flow, no transform
            'sm:relative sm:top-auto sm:left-auto sm:bottom-auto sm:z-auto sm:translate-x-0',
          ].join(' ')}
        >
          {sidebar}
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="sm:hidden fixed inset-0 z-10 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>

        {/* Right panel — hidden by default, 320px, desktop only */}
        {rightPanelOpen && (
          <aside className="hidden sm:block w-[320px] flex-shrink-0 border-l border-gray-100 overflow-y-auto bg-white">
            {/* Panel content — próxima sesión */}
          </aside>
        )}
      </div>
    </div>
  )
}
