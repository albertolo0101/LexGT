import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getUserTier } from '@/lib/get-user-tier'
import { getPendingReforms } from '@/lib/get-pending-reforms'
import ShellClient from './ShellClient'
import type { Case } from '@/lib/types'

type CaseRow = Pick<Case, 'id' | 'title' | 'color'> & { case_annotations: { id: string }[] }

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()

  const [{ data: { user } }, lawsResult, tier] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('laws')
      .select('id, slug, short_name, decree')
      .eq('is_active', true)
      .order('short_name'),
    getUserTier(supabase),
  ])

  const laws = lawsResult.data ?? []

  const [{ reformsByLaw, totalPending }, casesRaw] = await Promise.all([
    getPendingReforms(supabase, tier, user?.id ?? null),
    tier === 'pro' && user
      ? supabase
          .from('cases')
          .select('id, title, color, case_annotations(id)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .then(({ data }) => (data ?? []) as unknown as CaseRow[])
      : Promise.resolve([] as CaseRow[]),
  ])

  const lawsWithAlert = laws.map((law) => ({
    ...law,
    hasAlert: reformsByLaw.has(law.id),
  }))

  const cases = casesRaw.map((c) => ({
    id: c.id,
    title: c.title,
    color: c.color,
    count: c.case_annotations.length,
  }))

  const serializedUser = user ? { email: user.email ?? '', id: user.id } : null

  return (
    <ShellClient
      user={serializedUser}
      tier={tier}
      laws={lawsWithAlert}
      totalPending={totalPending}
      cases={cases}
    >
      {children}
    </ShellClient>
  )
}
