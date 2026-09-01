'use client'

import { useState, useTransition } from 'react'
import { Ico } from '@/components/icons'
import { CC_PORTAL_EXPEDIENTE_URL } from '@/lib/cc-portal'
import type { CaseSummary } from '@/lib/services/queries/cases'
import type { Jurisprudencia } from '@/lib/types'
import { addRefToCase, saveJurisprudenciaRef } from './actions'

type Props = {
  results: Jurisprudencia[]
  cases: CaseSummary[]
  savedIds: string[]
}

const RESULTADO_STYLE: Record<string, string> = {
  'CON LUGAR': 'bg-green-50 text-green-800 border-green-200',
  'SIN LUGAR': 'bg-red-50 text-red-800 border-red-200',
  'PARCIALMENTE CON LUGAR': 'bg-amber-50 text-amber-800 border-amber-200',
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ResultsClient({ results, cases, savedIds }: Props) {
  // Optimista y local: la fila guardada se marca sin esperar un revalidate de
  // toda la página, que reordenaría el listado bajo el cursor del usuario.
  const [saved, setSaved] = useState<Record<string, string>>(() =>
    Object.fromEntries(savedIds.map((id) => [id, ''])),
  )
  const [openId, setOpenId] = useState<string | null>(null)

  if (results.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-ink-700">No se encontró ninguna resolución.</p>
        <p className="mt-1 text-xs text-ink-500">
          Prueba con menos filtros o un término más general.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {results.map((r) => (
        <ResultCard
          key={r.id}
          item={r}
          cases={cases}
          isSaved={r.id in saved}
          refId={saved[r.id]}
          onSaved={(refId) => setSaved((prev) => ({ ...prev, [r.id]: refId }))}
          isOpen={openId === r.id}
          onToggle={() => setOpenId((prev) => (prev === r.id ? null : r.id))}
        />
      ))}
    </ul>
  )
}

type CardProps = {
  item: Jurisprudencia
  cases: CaseSummary[]
  isSaved: boolean
  refId: string | undefined
  onSaved: (refId: string) => void
  isOpen: boolean
  onToggle: () => void
}

function ResultCard({ item, cases, isSaved, refId, onSaved, isOpen, onToggle }: CardProps) {
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const badge = item.resultado
    ? (RESULTADO_STYLE[item.resultado] ?? 'bg-paper-2 text-ink-700 border-rule')
    : null

  function save(caseId?: string) {
    startTransition(async () => {
      setStatus(null)
      const result = await saveJurisprudenciaRef({
        jurisprudenciaId: item.id,
        expediente: item.expediente,
        fechaSentencia: item.fecha_sentencia,
        note: note.trim() || null,
      })
      if (!result.ok) {
        setStatus(result.message)
        return
      }
      onSaved(result.data.id)

      if (caseId) {
        const linked = await addRefToCase({ caseId, refId: result.data.id })
        if (!linked.ok) {
          setStatus(linked.message)
          return
        }
        const name = cases.find((c) => c.id === caseId)?.title ?? 'el caso'
        setStatus(`Guardada en ${name}.`)
        return
      }
      setStatus('Guardada en tus referencias.')
    })
  }

  return (
    <li className="rounded-lg border border-rule bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-semibold text-ink-900">
          Expediente {item.expedientes.length > 1 ? item.expedientes.join(', ') : item.expediente}
        </span>
        {badge && (
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge}`}>
            {item.resultado}
          </span>
        )}
        {isSaved && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-700">
            <Ico.check className="h-3 w-3" /> guardada
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] text-ink-500">
        {item.tipo_resolucion} del {formatFecha(item.fecha_sentencia)}
        {item.tipo_proceso && ` · ${item.tipo_proceso}`}
        {item.gaceta && ` · Gaceta ${item.gaceta}`}
        {item.pagina && `, pág. ${item.pagina}`}
      </p>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-900">{item.sumario}</p>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-rule pt-3 text-xs">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 text-ink-700 transition-colors hover:text-navy-800"
        >
          <Ico.bookmark className="h-3.5 w-3.5" />
          {isSaved ? 'Añadir a un caso' : 'Guardar'}
        </button>
        <a
          href={CC_PORTAL_EXPEDIENTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink-700 transition-colors hover:text-navy-800"
          title="El portal de la CC no acepta enlaces directos: busca ahí el expediente para leer el texto íntegro."
        >
          <Ico.link className="h-3.5 w-3.5" /> Texto íntegro en la CC
        </a>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ink-700 transition-colors hover:text-navy-800"
          >
            <Ico.scroll className="h-3.5 w-3.5" /> Gaceta {item.gaceta} (PDF)
          </a>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 space-y-3 rounded-md bg-paper-2 p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tu nota sobre esta resolución (opcional)"
            rows={3}
            className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-navy-800 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => save()}
              className="rounded-md bg-navy-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
            >
              {pending ? 'Guardando…' : 'Guardar referencia'}
            </button>

            {cases.length > 0 && (
              <select
                defaultValue=""
                disabled={pending}
                onChange={(e) => {
                  if (e.target.value) save(e.target.value)
                  e.target.value = ''
                }}
                className="rounded-md border border-rule bg-white px-2 py-1.5 text-xs text-ink-900 focus:border-navy-800 focus:outline-none"
              >
                <option value="">Guardar en un caso…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {status && <p className="text-[11px] text-ink-700">{status}</p>}
          {isSaved && refId === '' && (
            <p className="text-[11px] text-ink-500">
              Ya la tenías guardada; elige un caso para adjuntarla.
            </p>
          )}
        </div>
      )}
    </li>
  )
}
