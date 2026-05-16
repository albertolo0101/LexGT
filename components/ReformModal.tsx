"use client"

import { useEffect, useRef, useState } from "react"
import type { LawReform } from "@/lib/types"

interface Props {
  reform: LawReform
  hasAnnotationsOnReformedArticles: boolean
  onConfirm: (action: "dismiss" | "migrate" | "delete") => void
  onClose: () => void
}

export default function ReformModal({
  reform,
  hasAnnotationsOnReformedArticles,
  onConfirm,
  onClose,
}: Props) {
  const [canConfirm, setCanConfirm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCanConfirm(true) },
      { root: scrollRef.current, threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 leading-snug">
            {reform.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 text-lg text-gray-400 hover:text-gray-600 leading-none"
          >
            ×
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700 leading-relaxed"
        >
          {reform.description ? (
            <p>{reform.description}</p>
          ) : (
            <p className="text-gray-400 italic">Sin descripción adicional.</p>
          )}
          <div ref={sentinelRef} className="h-px mt-4" />
        </div>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
          {!hasAnnotationsOnReformedArticles ? (
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm("dismiss")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Entendido
            </button>
          ) : (
            <>
              <button
                disabled={!canConfirm}
                onClick={() => onConfirm("delete")}
                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Agregar reforma y borrar mis notas
              </button>
              <button
                disabled={!canConfirm}
                onClick={() => onConfirm("migrate")}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Agregar reforma y conservar como anexo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
