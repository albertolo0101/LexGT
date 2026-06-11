import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserTier } from './get-user-tier'
import type { Tier } from './types'

export type Actor = { userId: string | null; tier: Tier; isAdmin: boolean }

export type AuthzCode = 'UNAUTHENTICATED' | 'PRO_REQUIRED' | 'ADMIN_REQUIRED'

export class AuthzError extends Error {
  code: AuthzCode

  constructor(code: AuthzCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

export async function getActor(supabase: SupabaseClient): Promise<Actor> {
  const [{ data: { user } }, tier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ])

  return {
    userId: user?.id ?? null,
    tier,
    isAdmin: user?.app_metadata?.role === 'admin',
  }
}

export function requireUser(actor: Actor): asserts actor is Actor & { userId: string } {
  if (!actor.userId) throw new AuthzError('UNAUTHENTICATED')
}

export function requirePro(actor: Actor): asserts actor is Actor & { userId: string } {
  requireUser(actor)
  if (actor.tier !== 'pro') throw new AuthzError('PRO_REQUIRED')
}

export function requireAdmin(actor: Actor): void {
  if (!actor.isAdmin) throw new AuthzError('ADMIN_REQUIRED')
}
