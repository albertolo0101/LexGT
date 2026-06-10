'use client'
import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import SidebarContent from './SidebarContent'
import SearchOverlay from './SearchOverlay'
import PaywallModal from './PaywallModal'
import type { Law } from '@/lib/types'

export type SerializedUser = { email: string; id: string } | null
export type EffectiveTier = 'anonymous' | 'free' | 'pro'
export type SidebarLaw = Pick<Law, 'id' | 'slug' | 'short_name' | 'decree'> & { hasAlert: boolean }
export type SidebarCase = { id: string; title: string; color: string; count: number }

export default function ShellClient({
  user,
  tier,
  laws,
  totalPending,
  cases,
  children,
}: {
  user: SerializedUser
  tier: EffectiveTier
  laws: SidebarLaw[]
  totalPending: number
  cases: SidebarCase[]
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper">
      <TopBar
        tier={tier}
        user={user}
        totalPending={totalPending}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenPaywall={() => setPaywallOpen(true)}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={[
            'w-[260px] flex-shrink-0 border-r border-rule overflow-y-auto bg-white',
            'fixed top-[62px] left-0 bottom-0 z-20 transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'sm:relative sm:top-auto sm:left-auto sm:bottom-auto sm:z-auto sm:translate-x-0',
          ].join(' ')}
        >
          <SidebarContent
            laws={laws}
            totalPending={totalPending}
            cases={cases}
            tier={tier}
            isAuthenticated={!!user}
            onOpenPaywall={() => setPaywallOpen(true)}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        {sidebarOpen && (
          <div
            className="sm:hidden fixed inset-0 z-10 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      {searchOpen && (
        <SearchOverlay
          tier={tier}
          onClose={() => setSearchOpen(false)}
          onLockedClick={() => {
            setSearchOpen(false)
            setPaywallOpen(true)
          }}
        />
      )}
      {paywallOpen && <PaywallModal onClose={() => setPaywallOpen(false)} />}
    </div>
  )
}
