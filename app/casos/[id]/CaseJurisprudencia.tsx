'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ico } from '@/components/icons'
import { CC_PORTAL_EXPEDIENTE_URL } from '@/lib/cc-portal'
import type { CaseJurisprudenciaRow } from '@/lib/services/queries/jurisprudencia'
import {
  removeRefFromCase,
  updateJurisprudenciaRef,
} from '@/app/jurisprudencia/actions'

function formatFecha(iso: string | null): string | null {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function CaseJurisprudencia({ rows }: { rows: CaseJurisprudenciaRow[] }) {
  return (
    <>
      <h2 className="mb-4 mt-10 text-sm font-semibold text-ink-900">
        Jurisprudencia <span className="font-normal text-ink-500">({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-700">
          Este caso no tiene jurisprudencia guardada. Busca una resolución en{' '}
          <Link href="/jurisprudencia" className="text-navy-800 underline underline-offset-2">
            Jurisprudencia
          </Link>{' '}
          y elige «Guardar en un caso».
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <RefCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </>
  )
}

function RefCard({ row }: { row: CaseJurisprudenciaRow }) {
  const router = useRouter()
  const ref = row.ref
  const source = ref.jurisprudencia
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(ref.note ?? '')
  const [savedNote, setSavedNote] = useState(ref.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const fecha = formatFecha(ref.fecha_sentencia ?? source?.fecha_sentencia ?? null)

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateJurisprudenciaRef({ refId: ref.id, note: note.trim() || null })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setSavedNote(note.trim())
      setEditing(false)
      router.refresh()
    })
  }

  const handleRemove = () => {
    setError(null)
    startTransition(async () => {
      const result = await removeRefFromCase(row.id)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <article className="rounded-xl border border-rule bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-navy-800">
            Expediente {ref.expediente}
          </p>
          <p className="text-[11px] text-ink-500">
            {[source?.tipo_resolucion, fecha].filter(Boolean).join(' del ')}
            {source?.tipo_proceso && ` · ${source.tipo_proceso}`}
            {source?.resultado && ` · ${source.resultado}`}
            {!source && ' · anotada a mano, aún no está en el índice'}
          </p>
        </div>

        <a
          href={ref.url ?? CC_PORTAL_EXPEDIENTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="El portal de la CC no acepta enlaces directos: busca ahí el expediente para leer el texto íntegro."
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-[11px] font-medium text-navy-800 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
        >
          <Ico.link className="h-3 w-3" />
          Ver en la CC
        </a>
      </div>

      {source && (
        <p className="mb-3 line-clamp-4 text-sm leading-relaxed text-ink-900">{source.sumario}</p>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Escribe tu nota…"
            className="w-full resize-y rounded-lg border border-rule px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-full bg-navy-900 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-40"
            >
              {pending ? 'Guardando…' : 'Guardar nota'}
            </button>
            <button
              onClick={() => {
                setNote(savedNote)
                setEditing(false)
                setError(null)
              }}
              className="text-[11px] text-ink-500 transition-colors hover:text-ink-900"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {savedNote ? (
            <p className="flex-1 text-sm leading-relaxed text-ink-700">{savedNote}</p>
          ) : (
            <p className="flex-1 text-[11px] text-ink-500">Sin nota.</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex-shrink-0 text-[11px] font-medium text-navy-800 transition-colors hover:text-gold-700"
          >
            {savedNote ? 'Editar nota' : 'Añadir nota'}
          </button>
          <button
            onClick={handleRemove}
            disabled={pending}
            className="flex-shrink-0 text-[11px] text-ink-500 transition-colors hover:text-red-600 disabled:opacity-40"
          >
            Quitar
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </article>
  )
}
