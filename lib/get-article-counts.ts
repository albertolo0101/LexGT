import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cuenta de artículos vigentes por ley, vía consultas head:true en paralelo.
export async function getArticleCounts(
  supabase: SupabaseClient,
  lawIds: string[]
): Promise<Map<string, number>> {
  const counts = await Promise.all(
    lawIds.map((id) =>
      supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('law_id', id)
        .eq('is_current', true)
        .then(({ count }) => [id, count ?? 0] as const)
    )
  )
  return new Map(counts)
}
