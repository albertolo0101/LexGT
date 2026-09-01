import { createServerSupabaseClient } from '@/lib/supabase-server'
import { searchArticles, searchLaws } from '@/lib/services/queries/search'
import { searchLimiter, checkRateLimit } from '@/lib/api/rate-limit'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const identifier = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const allowed = await checkRateLimit(searchLimiter, identifier)
  if (!allowed) {
    return Response.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
      { status: 429 }
    )
  }

  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') ?? '').trim()
  const law = searchParams.get('law') ?? null
  const limitParam = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50)

  if (q.length < 2) {
    return Response.json(
      { error: 'El parámetro q debe tener al menos 2 caracteres.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  // Las leyes solo se buscan cuando no se está buscando *dentro* de una ley.
  const [{ results, total }, laws] = await Promise.all([
    searchArticles(supabase, { q, lawSlug: law, limit }),
    law ? Promise.resolve([]) : searchLaws(supabase, q),
  ])

  return Response.json({ laws, results, total, query: q })
}
