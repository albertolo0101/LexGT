'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ico } from '@/components/icons'
import { CC_PORTAL_EXPEDIENTE_URL } from '@/lib/cc-portal'
import type { CaseSummary } from '@/lib/services/queries/cases'
import type { JurisprudenciaRefWithSource } from '@/lib/types'
import {
  addRefToCase,
  deleteJurisprudenciaRef,
  updateJurisprudenciaRef,
} from '../actions'

type Props = {
  refs: JurisprudenciaRefWithSource[]
  cases: CaseSummary[]
}

function formatFecha(iso: string | null): string | null {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function SavedClient({ refs, cases }: Props) {
  if (refs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-white py-16 text-center">
        <p className="text-sm text-ink-600">Aquí aparecerán las resoluciones que guardes.</p>
        <Link
          href="/jurisprudencia"
          className="mt-3 inline-block text-xs text-navy-800 underline underline-offset-2"
        >
          Buscar jurisprudencia
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {refs.map((ref) => (
        <SavedCard key={ref.id} item={ref} cases={cases} />
      ))}
    </ul>
  )
}

function SavedCard({ item, cases }: { item: JurisprudenciaRefWithSource; cases: CaseSummary[] }) {
  const router = useRouter()
  const [note, setNote] = useState(item.note ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const source = item.jurisprudencia
  const fecha = formatFecha(item.fecha_sentencia ?? source?.fecha_sentencia ?? null)
  const dirty = note !== (item.note ?? '')

  function saveNote() {
    startTransition(async () => {
      const result = await updateJurisprudenciaRef({ refId: item.id, note: note.trim() || null })
      setStatus(result.ok ? 'Nota guardada.' : result.message)
      if (result.ok) router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteJurisprudenciaRef(item.id)
      if (!result.ok) {
        setStatus(result.message)
        return
      }
      router.refresh()
    })
  }

  function attach(caseId: string) {
    startTransition(async () => {
      const result = await addRefToCase({ caseId, refId: item.id })
      const name = cases.find((c) => c.id === caseId)?.title ?? 'el caso'
      setStatus(result.ok ? `Añadida a ${name}.` : result.message)
    })
  }

  return (
    <li className="rounded-lg border border-rule bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-semibold text-ink-900">
            Expediente {item.expediente}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            {[source?.tipo_resolucion, fecha].filter(Boolean).join(' del ')}
            {source?.tipo_proceso && ` · ${source.tipo_proceso}`}
            {source?.resultado && ` · ${source.resultado}`}
            {!source && ' · anotada a mano, aún no está en el índice'}
          </p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="shrink-0 text-ink-400 transition-colors hover:text-red-700 disabled:opacity-50"
          aria-label="Eliminar referencia"
        >
          <Ico.x className="h-4 w-4" />
        </button>
      </div>

      {source && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-700">
          {source.sumario}
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tu nota sobre esta resolución"
        rows={2}
        className="mt-3 w-full rounded-md border border-rule bg-paper-2 px-3 py-2 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-navy-800 focus:bg-white focus:outline-none"
      />

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {dirty && (
          <button
            type="button"
            onClick={saveNote}
            disabled={pending}
            className="rounded-md bg-navy-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
          >
            {pending ? 'Guardando…' : 'Guardar nota'}
          </button>
        )}

        {cases.length > 0 && (
          <select
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) attach(e.target.value)
              e.target.value = ''
            }}
            className="rounded-md border border-rule bg-white px-2 py-1.5 text-xs text-ink-800 focus:border-navy-800 focus:outline-none"
          >
            <option value="">Añadir a un caso…</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}

        <a
          href={item.url ?? CC_PORTAL_EXPEDIENTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink-600 transition-colors hover:text-navy-800"
        >
          <Ico.link className="h-3.5 w-3.5" /> Ver en la CC
        </a>

        {status && <span className="text-[11px] text-ink-600">{status}</span>}
      </div>
    </li>
  )
}
