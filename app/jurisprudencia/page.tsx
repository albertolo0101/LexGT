import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getActor } from '@/lib/authz'
import { listCases } from '@/lib/services/queries/cases'
import {
  getJurisprudenciaFacets,
  getSavedJurisprudenciaIds,
  searchJurisprudencia,
} from '@/lib/services/queries/jurisprudencia'
import ResultsClient from './ResultsClient'

export const metadata: Metadata = {
  title: 'Jurisprudencia — LexGT',
  description:
    'Busca sentencias de la Corte de Constitucionalidad por texto, expediente, fecha o tipo de proceso.',
}

const PAGE_SIZE = 20

type Props = {
  searchParams: Promise<{
    q?: string
    exp?: string
    tipo?: string
    resultado?: string
    desde?: string
    hasta?: string
    p?: string
  }>
}

const inputClass =
  'w-full rounded-md border border-rule bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-navy-800 focus:outline-none'

export default async function JurisprudenciaPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()
  const actor = await getActor(supabase)

  if (!actor.userId || actor.tier !== 'pro') {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper-2 px-6">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-700">LexGT Pro</p>
          <h1 className="font-serif text-2xl text-ink-900">Jurisprudencia constitucional</h1>
          <p className="text-sm leading-relaxed text-ink-700">
            Busca entre las sentencias que la Corte de Constitucionalidad publica en su Gaceta
            Jurisprudencial, guarda las que te sirvan y adjúntalas a un caso con tus notas.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/cuenta"
              className="rounded-md bg-navy-900 px-4 py-2 text-sm text-white transition-colors hover:bg-navy-800"
            >
              Ver planes
            </Link>
            <Link href="/leyes" className="text-xs text-ink-500 transition-colors hover:text-navy-800">
              ← Volver a leyes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const q = (params.q ?? '').trim()
  const exp = (params.exp ?? '').trim()
  const tipo = (params.tipo ?? '').trim()
  const resultado = (params.resultado ?? '').trim()
  const desde = (params.desde ?? '').trim()
  const hasta = (params.hasta ?? '').trim()
  const page = Math.max(1, Number.parseInt(params.p ?? '1', 10) || 1)

  const hasCriteria = Boolean(q || exp || tipo || resultado || desde || hasta)

  const [facets, cases, savedIds, search] = await Promise.all([
    getJurisprudenciaFacets(supabase),
    listCases(supabase, actor),
    getSavedJurisprudenciaIds(supabase, actor.userId),
    hasCriteria
      ? searchJurisprudencia(supabase, {
          q,
          expediente: exp || null,
          tipoProceso: tipo || null,
          resultado: resultado || null,
          desde: desde || null,
          hasta: hasta || null,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
      : Promise.resolve({ results: [], total: 0 }),
  ])

  const totalPages = Math.max(1, Math.ceil(search.total / PAGE_SIZE))
  const pageHref = (n: number) => {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    if (exp) next.set('exp', exp)
    if (tipo) next.set('tipo', tipo)
    if (resultado) next.set('resultado', resultado)
    if (desde) next.set('desde', desde)
    if (hasta) next.set('hasta', hasta)
    if (n > 1) next.set('p', String(n))
    return `/jurisprudencia?${next.toString()}`
  }

  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl text-ink-900">Jurisprudencia</h1>
            <p className="mt-1 text-xs text-ink-500">
              Corte de Constitucionalidad · Gaceta Jurisprudencial
            </p>
          </div>
          <Link
            href="/jurisprudencia/guardadas"
            className="whitespace-nowrap text-xs text-ink-500 transition-colors hover:text-navy-800"
          >
            Mis referencias →
          </Link>
        </div>

        <form method="get" className="mb-8 space-y-3 rounded-lg border border-rule bg-white p-4">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Texto libre: debido proceso, derecho de defensa…"
            className={inputClass}
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-500">Expediente</span>
              <input
                type="text"
                name="exp"
                defaultValue={exp}
                placeholder="1920-2003 1930"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-500">Tipo de proceso</span>
              <select name="tipo" defaultValue={tipo} className={inputClass}>
                <option value="">Todos</option>
                {facets.tiposProceso.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink-500">Resultado</span>
              <select name="resultado" defaultValue={resultado} className={inputClass}>
                <option value="">Cualquiera</option>
                {facets.resultados.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink-500">Desde</span>
                <input type="date" name="desde" defaultValue={desde} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink-500">Hasta</span>
                <input type="date" name="hasta" defaultValue={hasta} className={inputClass} />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/jurisprudencia"
              className="text-xs text-ink-500 transition-colors hover:text-navy-800"
            >
              Limpiar
            </Link>
            <button
              type="submit"
              className="rounded-md bg-navy-900 px-4 py-2 text-sm text-white transition-colors hover:bg-navy-800"
            >
              Buscar
            </button>
          </div>
        </form>

        {!hasCriteria ? (
          <p className="py-12 text-center text-sm text-ink-500">
            Escribe un término, un expediente o elige un rango de fechas.
          </p>
        ) : (
          <>
            <p className="mb-4 text-xs text-ink-500">
              {search.total > 0
                ? `${search.total.toLocaleString('es-GT')} resolución${search.total === 1 ? '' : 'es'}`
                : 'Sin resultados'}
              {search.total > PAGE_SIZE && ` · página ${page} de ${totalPages}`}
            </p>

            <ResultsClient results={search.results} cases={cases} savedIds={[...savedIds]} />

            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-between border-t border-rule pt-4 text-xs">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="text-ink-600 hover:text-navy-800">
                    ← Anterior
                  </Link>
                ) : (
                  <span />
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="text-ink-600 hover:text-navy-800">
                    Siguiente →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}

        <p className="mt-12 border-t border-rule pt-4 text-[11px] leading-relaxed text-ink-500">
          Índice construido a partir de la Gaceta Jurisprudencial que publica la Corte de
          Constitucionalidad (art. 189 de la Ley de Amparo, Exhibición Personal y de
          Constitucionalidad). LexGT indexa la ficha y el sumario oficial; el texto íntegro de cada
          resolución se consulta en el portal de la Corte.
        </p>
      </main>
    </div>
  )
}
