import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserTier } from '@/lib/get-user-tier'
import ShellClient from './ShellClient'
import SidebarContent from './SidebarContent'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()

  const [{ data: { user } }, lawsResult, tier] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('laws')
      .select('id, slug, short_name')
      .eq('is_active', true)
      .order('short_name'),
    getUserTier(supabase),
  ])

  const laws = lawsResult.data ?? []
  const serializedUser = user ? { email: user.email ?? '', id: user.id } : null

  return (
    <ShellClient
      user={serializedUser}
      tier={tier}
      sidebar={<SidebarContent laws={laws} isAuthenticated={!!user} />}
    >
      {children}
    </ShellClient>
  )
}
