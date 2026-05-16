import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tier } from './types'

export async function getUserTier(supabase: SupabaseClient): Promise<Tier> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tier, tier_expires_at')
    .eq('user_id', user.id)
    .single()

  if (!profile) return 'free'

  if (profile.tier_expires_at !== null && new Date(profile.tier_expires_at) < new Date()) {
    return 'free'
  }

  return (profile.tier as Tier) ?? 'free'
}
