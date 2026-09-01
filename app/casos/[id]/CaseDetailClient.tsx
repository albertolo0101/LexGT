'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Ico } from '@/components/icons'
import { HL_COLORS } from '@/lib/case-colors'
import { articleAnchor } from '@/lib/anchors'
import type { ActionResult } from '@/lib/action-result'
import type { CaseDetailAnnotation } from '@/lib/services/queries/cases'
import { updateCase, removeAnnotationFromCase } from '../actions'
import { updateAnnotationNote } from '@/app/leyes/actions'

type Props = {
  caseId: string
  title: string
  notes: string | null
  annotations: CaseDetailAnnotation[]
}

/** Enlace al artículo dentro de la ley: la ley completa vive en una sola página. */
function articleHref(a: CaseDetailAnnotation): string | null {
  if (!a.law || !a.article) return null
  return `/leyes/${a.law.slug}#${articleAnchor(a.article.number)}`
}

export default function CaseDetailClient({ caseId, title, notes, annotations }: Props) {
  const router = useRouter()
  const [caseNotes, setCaseNotes] = useState(notes ?? '')
  const [savedNotes, setSavedNotes] = useState(notes ?? '')
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [savingNotes, startNotesTransition] = useTransition()

  const dirty = caseNotes !== savedNotes

  const handleSaveNotes = () => {
    setNotesError(null)
    startNotesTransition(async () => {
      const result = await updateCase({ caseId, description: caseNotes.trim() || null })
      if (!result.ok) {
        setNotesStatus('error')
        setNotesError(result.message)
        return
      }
      setSavedNotes(caseNotes)
      setNotesStatus('saved')
      router.refresh()
    })
  }

  return (
    <>
      {/* Notas del caso: la caja de trabajo del expediente, hasta arriba. */}
      <section className="mb-10 rounded-xl border border-rule bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Notas del caso</h2>
          {notesStatus === 'saved' && !dirty && (
            <span className="text-[11px] font-medium text-emerald-700">Guardado</span>
          )}
        </div>
        <textarea
          value={caseNotes}
          onChange={(e) => {
            setCaseNotes(e.target.value)
            setNotesStatus('idle')
          }}
          rows={5}
          placeholder={`Estrategia, plazos, pendientes… todo lo que quieras recordar de "${title}".`}
          className="w-full resize-y rounded-lg border border-rule bg-paper-2/40 px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-navy-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-navy-500"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes || !dirty}
            className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-40"
          >
            {savingNotes ? 'Guardando…' : 'Guardar notas'}
          </button>
          {dirty && !savingNotes && <span className="text-[11px] text-ink-500">Cambios sin guardar</span>}
          {notesError && <span className="text-[11px] text-red-600">{notesError}</span>}
        </div>
      </section>

      <h2 className="mb-4 text-sm font-semibold text-ink-900">
        Artículos guardados{' '}
        <span className="font-normal text-ink-500">({annotations.length})</span>
      </h2>

      {annotations.length === 0 ? (
        <p className="text-sm text-ink-700">
          Este caso no tiene artículos guardados. Resalta un fragmento en la vista de lectura y elige
          «Guardar en caso».
        </p>
      ) : (
        <div className="space-y-4">
          {annotations.map((a) => (
            <AnnotationCard key={a.id} annotation={a} href={articleHref(a)} />
          ))}
        </div>
      )}
    </>
  )
}

function AnnotationCard({
  annotation,
  href,
}: {
  annotation: CaseDetailAnnotation
  href: string | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(annotation.note ?? '')
  const [savedNote, setSavedNote] = useState(annotation.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleResult = (result: ActionResult<unknown>, onOk: () => void) => {
    if (result.ok) onOk()
    else setError(result.message)
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateAnnotationNote(annotation.annotation_id, note.trim() || null)
      handleResult(result, () => {
        setSavedNote(note.trim())
        setEditing(false)
        router.refresh()
      })
    })
  }

  const handleRemove = () => {
    setError(null)
    startTransition(async () => {
      const result = await removeAnnotationFromCase(annotation.id)
      handleResult(result, () => router.refresh())
    })
  }

  return (
    <article className="rounded-xl border border-rule bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {annotation.article ? (
            <p className="text-xs font-semibold text-navy-800">
              Artículo {annotation.article.number}
              {annotation.article.heading ? ` — ${annotation.article.heading}` : ''}
            </p>
          ) : (
            <p className="text-xs font-semibold text-ink-500">Artículo no disponible</p>
          )}
          {annotation.law && <p className="text-[11px] text-ink-500">{annotation.law.short_name}</p>}
        </div>

        {href && (
          <Link
            href={href}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-navy-100 bg-navy-50 px-3 py-1 text-[11px] font-medium text-navy-800 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
          >
            <Ico.link className="h-3 w-3" />
            Ver en la ley
          </Link>
        )}
      </div>

      {annotation.excerpt && (
        <p className="mb-3 text-sm leading-relaxed text-ink-900">
          <mark
            className="rounded-sm px-0.5"
            style={{ backgroundColor: HL_COLORS[annotation.color as keyof typeof HL_COLORS] ?? HL_COLORS.yellow }}
          >
            {annotation.excerpt}
          </mark>
        </p>
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
              className="text-[11px] text-ink-700 transition-colors hover:text-ink-900"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          {savedNote ? (
            <p className="whitespace-pre-wrap border-l-2 border-gold-400 pl-3 text-sm text-ink-700">
              {savedNote}
            </p>
          ) : (
            <p className="text-sm text-ink-400 italic">Sin nota.</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex-shrink-0 text-[11px] font-medium text-navy-700 transition-colors hover:text-navy-900"
          >
            {savedNote ? 'Editar nota' : 'Agregar nota'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}

      <div className="mt-3 border-t border-rule pt-2">
        <button
          onClick={handleRemove}
          disabled={pending}
          className="text-[11px] text-ink-500 transition-colors hover:text-red-600 disabled:opacity-40"
        >
          Quitar del caso
        </button>
      </div>
    </article>
  )
}
