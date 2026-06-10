import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LawReform } from './types'

export type UserTier = 'anonymous' | 'free' | 'pro'

function cutoffDate(tier: UserTier): string {
  const d = new Date()
  if (tier === 'anonymous') d.setDate(d.getDate() - 7)
  else if (tier === 'free') d.setMonth(d.getMonth() - 1)
  else d.setMonth(d.getMonth() - 6)
  return d.toISOString()
}

export type PendingReforms = {
  reformsByLaw: Map<string, LawReform[]>
  totalPending: number
}

// Reformas publicadas dentro de la ventana del tier que el usuario aún no ha marcado como vistas.
export async function getPendingReforms(
  supabase: SupabaseClient,
  tier: UserTier,
  userId: string | null
): Promise<PendingReforms> {
  const [{ data: reforms }, seenReformIds] = await Promise.all([
    supabase.from('law_reforms').select('*').gte('published_at', cutoffDate(tier)),
    userId
      ? supabase
          .from('reform_notifications')
          .select('reform_id')
          .eq('user_id', userId)
          .then(({ data }) => new Set((data ?? []).map((r) => r.reform_id as string)))
      : Promise.resolve(new Set<string>()),
  ])

  const reformsByLaw = new Map<string, LawReform[]>()
  let totalPending = 0
  for (const reform of (reforms ?? []) as LawReform[]) {
    if (!seenReformIds.has(reform.id)) {
      const arr = reformsByLaw.get(reform.law_id) ?? []
      arr.push(reform)
      reformsByLaw.set(reform.law_id, arr)
      totalPending++
    }
  }

  return { reformsByLaw, totalPending }
}
