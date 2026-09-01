import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getActor } from '@/lib/authz'
import { listCases } from '@/lib/services/queries/cases'
import { listJurisprudenciaRefs } from '@/lib/services/queries/jurisprudencia'
import SavedClient from './SavedClient'

export const metadata: Metadata = {
  title: 'Mis referencias de jurisprudencia — LexGT',
}

export default async function GuardadasPage() {
  const supabase = await createServerSupabaseClient()
  const actor = await getActor(supabase)

  if (!actor.userId || actor.tier !== 'pro') {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper-2">
        <div className="space-y-3 text-center">
          <p className="text-sm text-ink-700">Esta función es exclusiva del tier Pro.</p>
          <Link href="/leyes" className="text-xs text-ink-500 transition-colors hover:text-navy-800">
            ← Volver a leyes
          </Link>
        </div>
      </div>
    )
  }

  const [refs, cases] = await Promise.all([
    listJurisprudenciaRefs(supabase, actor.userId),
    listCases(supabase, actor),
  ])

  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-ink-900">Mis referencias</h1>
            <p className="mt-1 text-xs text-ink-500">
              {refs.length === 0
                ? 'Todavía no guardas ninguna resolución.'
                : `${refs.length} resolución${refs.length === 1 ? '' : 'es'} guardada${refs.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <Link
            href="/jurisprudencia"
            className="whitespace-nowrap text-xs text-ink-500 transition-colors hover:text-navy-800"
          >
            ← Buscar jurisprudencia
          </Link>
        </div>

        <SavedClient refs={refs} cases={cases} />
      </main>
    </div>
  )
}
