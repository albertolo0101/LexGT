"use client"

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Case } from "@/lib/types";
import { createCase } from "./actions";

type CaseWithCount = Case & { case_annotations: { id: string }[] };

const CASE_COLORS = ["gray", "blue", "green", "red", "amber", "purple"] as const;
type CaseColor = typeof CASE_COLORS[number];

const COLOR_DOT: Record<CaseColor, string> = {
  gray:   "bg-gray-400",
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  red:    "bg-red-500",
  amber:  "bg-amber-500",
  purple: "bg-purple-500",
};

const COLOR_BORDER: Record<CaseColor, string> = {
  gray:   "border-l-gray-300",
  blue:   "border-l-blue-400",
  green:  "border-l-green-400",
  red:    "border-l-red-400",
  amber:  "border-l-amber-400",
  purple: "border-l-purple-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

export default function CasesClient({ cases }: { cases: CaseWithCount[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CaseColor>("gray");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createCase({ title: title.trim(), description: description.trim() || undefined, color });
        setModalOpen(false);
        setTitle("");
        setDescription("");
        setColor("gray");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear caso");
      }
    });
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Nuevo caso
        </button>
      </div>

      {cases.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          Aún no tienes casos. Crea uno para organizar tus highlights.
        </p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/casos/${c.id}`}
              className={`block border border-gray-100 border-l-4 ${COLOR_BORDER[c.color as CaseColor] ?? "border-l-gray-300"} rounded-lg px-5 py-4 hover:bg-gray-50 transition-colors`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  {c.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">
                    {c.case_annotations.length}{" "}
                    {c.case_annotations.length === 1 ? "highlight" : "highlights"}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{formatDate(c.updated_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">Nuevo caso</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre del caso"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción breve…"
                  rows={2}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">Color</label>
                <div className="flex gap-2">
                  {CASE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full ${COLOR_DOT[c]} transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={pending || !title.trim()}
                className="text-xs bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {pending ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
