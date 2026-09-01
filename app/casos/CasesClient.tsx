"use client"

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CASE_COLORS, caseColorToken, type CaseColorKey } from "@/lib/case-colors";
import type { CaseSummary } from "@/lib/services/queries/cases";
import { createCase } from "./actions";

const COLOR_KEYS = Object.keys(CASE_COLORS) as CaseColorKey[];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

// Contraste: los formularios de caso usaban gris claro sobre blanco y no se
// leían. Etiquetas y valores van en tinta oscura; el gris queda solo para
// metadatos secundarios.
const LABEL = "mb-1 block text-xs font-medium text-ink-900";
const FIELD =
  "w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500";

export default function CasesClient({ cases }: { cases: CaseSummary[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<CaseColorKey>("gray");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createCase({
        title: title.trim(),
        description: description.trim() || undefined,
        color,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setColor("gray");
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700"
        >
          Nuevo caso
        </button>
      </div>

      {cases.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-700">
          Aún no tienes casos. Crea uno para organizar tus artículos y notas.
        </p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const token = caseColorToken(c.color);
            return (
              <Link
                key={c.id}
                href={`/casos/${c.id}`}
                className="block rounded-lg border border-rule border-l-4 bg-white px-5 py-4 transition-colors hover:border-gold-400"
                style={{ borderLeftColor: token.solid }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{c.title}</p>
                    {c.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-700">{c.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-ink-700">
                      {c.annotation_count} {c.annotation_count === 1 ? "artículo" : "artículos"}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">{formatDate(c.updated_at)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg text-ink-900">Nuevo caso</h2>

            <div className="space-y-3">
              <div>
                <label className={LABEL} htmlFor="caso-titulo">
                  Título *
                </label>
                <input
                  id="caso-titulo"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nombre del caso"
                  className={FIELD}
                  autoFocus
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="caso-descripcion">
                  Notas del caso (opcional)
                </label>
                <textarea
                  id="caso-descripcion"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Partes, materia, pendientes…"
                  rows={3}
                  className={`${FIELD} resize-y`}
                />
              </div>

              <div>
                <p className={LABEL}>Color</p>
                <div className="flex gap-2">
                  {COLOR_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setColor(key)}
                      style={{ backgroundColor: CASE_COLORS[key].solid }}
                      className={`h-6 w-6 rounded-full transition-all ${
                        color === key ? "ring-2 ring-navy-800 ring-offset-2" : ""
                      }`}
                      aria-label={CASE_COLORS[key].label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 text-xs font-medium text-ink-700 transition-colors hover:text-ink-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={pending || !title.trim()}
                className="rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-40"
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
