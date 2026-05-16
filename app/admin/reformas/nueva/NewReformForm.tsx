"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { findArticle, createReformDraft } from "@/app/admin/actions"

type Law = { id: string; short_name: string }

type DraftArticle = {
  articleId: string
  articleNumber: string
  currentText: string
  newText: string
}

export default function NewReformForm({ laws }: { laws: Law[] }) {
  const router = useRouter()

  const [lawId, setLawId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [articles, setArticles] = useState<DraftArticle[]>([])

  const [searchNumber, setSearchNumber] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [found, setFound] = useState<{ articleId: string; currentText: string } | null>(null)
  const [newText, setNewText] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleLawChange = (id: string) => {
    setLawId(id)
    setFound(null)
    setSearchNumber("")
    setSearchError(null)
  }

  const handleSearch = async () => {
    if (!lawId || !searchNumber.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setFound(null)
    setNewText("")
    try {
      const result = await findArticle(lawId, searchNumber.trim())
      if (!result) {
        setSearchError("Artículo no encontrado.")
      } else {
        setFound(result)
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Error al buscar.")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleAddArticle = () => {
    if (!found || !newText.trim()) return
    setArticles((prev) => [
      ...prev,
      {
        articleId: found.articleId,
        articleNumber: searchNumber,
        currentText: found.currentText,
        newText: newText.trim(),
      },
    ])
    setSearchNumber("")
    setFound(null)
    setNewText("")
    setSearchError(null)
  }

  const handleRemoveArticle = (articleId: string) => {
    setArticles((prev) => prev.filter((a) => a.articleId !== articleId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lawId || !title.trim() || articles.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await createReformDraft({
        lawId,
        title: title.trim(),
        description: description.trim(),
        articles: articles.map((a) => ({ articleId: a.articleId, newText: a.newText })),
      })
      router.push(`/admin/reformas/${result.id}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error inesperado.")
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-8">Nueva reforma</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ley</label>
          <select
            required
            value={lawId}
            onChange={(e) => handleLawChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona una ley…</option>
            {laws.map((law) => (
              <option key={law.id} value={law.id}>
                {law.short_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título de la reforma
          </label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Decreto 15-2026 — Reforma al Artículo 1"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el alcance y motivación de la reforma…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Artículos afectados</h2>

          {articles.length > 0 && (
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {articles.map((a) => (
                <div key={a.articleId} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      Artículo {a.articleNumber}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {a.newText.slice(0, 80)}…
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveArticle(a.articleId)}
                    className="shrink-0 text-xs text-red-500 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="Número de artículo (ej. 1)"
                disabled={!lawId}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={!lawId || !searchNumber.trim() || searchLoading}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {searchLoading ? "Buscando…" : "Buscar"}
              </button>
            </div>

            {searchError && <p className="text-xs text-red-500">{searchError}</p>}

            {found && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Texto vigente</p>
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {found.currentText}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Texto nuevo</p>
                  <textarea
                    rows={5}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Pega aquí el texto reformado del artículo…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddArticle}
                  disabled={!newText.trim()}
                  className="px-4 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition-colors"
                >
                  Agregar artículo
                </button>
              </div>
            )}
          </div>
        </div>

        {submitError && <p className="text-sm text-red-500">{submitError}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !lawId || !title.trim() || articles.length === 0}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? "Guardando…" : "Guardar borrador"}
          </button>
        </div>
      </form>
    </div>
  )
}
