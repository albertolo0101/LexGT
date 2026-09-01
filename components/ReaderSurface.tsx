"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Tier } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { saveAnnotation, deleteAnnotation, updateAnnotationNote } from "@/app/leyes/actions";
import { addAnnotationToCase } from "@/app/casos/actions";
import { createClient } from "@/lib/supabase";
import { HL_TOKENS, HL_MARK_CLASS, type HighlightColor } from "@/lib/case-colors";
import { ANCHOR_CONTEXT_LENGTH } from "@/lib/anchoring";
import PaywallModal from "./PaywallModal";

const COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink"];

// Offset de caracteres dentro del párrafo, contando solo nodos de texto — el
// mismo cálculo que espera `annotations.char_start/char_end`.
function getCharOffset(container: HTMLElement, node: Node, nodeOffset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current === node) return total + nodeOffset;
    total += current.textContent?.length ?? 0;
  }
  return total;
}

type TooltipState =
  | {
      kind: "new";
      x: number;
      y: number;
      start: number;
      end: number;
      paragraphId: string;
      articleId: string;
      text: string;
    }
  | { kind: "existing"; x: number; y: number; annotationId: string };

type UserCase = { id: string; title: string; color: string };

/**
 * Superficie de lectura: UN solo componente cliente para toda la ley.
 *
 * Los párrafos los renderiza el servidor (`ParagraphText`) como HTML plano con
 * `data-paragraph-id` / `data-article-id`, y aquí se delegan los eventos. La
 * versión anterior montaba un componente cliente por párrafo, lo que era viable
 * con un capítulo a la vez pero no con una ley completa (el Código Civil tiene
 * 2,894 párrafos).
 *
 * Al guardar o borrar un highlight se parcha el DOM directamente en vez de
 * llamar a `router.refresh()`: refrescar re-renderiza la ley entera en el
 * servidor. Solo las notas —mucho menos frecuentes— fuerzan un refresh, porque
 * el panel derecho las lista.
 */
export default function ReaderSurface({
  isAuthenticated,
  tier,
  notesById,
  className,
  children,
}: {
  isAuthenticated: boolean;
  tier: Tier;
  notesById: Record<string, string | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pendingRangeRef = useRef<Range | null>(null);
  const activeMarkRef = useRef<HTMLElement | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>("yellow");
  const [noteText, setNoteText] = useState("");
  const [localNotes, setLocalNotes] = useState<Record<string, string | null>>({});
  const [casesOpen, setCasesOpen] = useState(false);
  const [userCases, setUserCases] = useState<UserCase[] | null>(null);
  const [casesLoading, setCasesLoading] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedCaseTitle, setSavedCaseTitle] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleActionResult = (result: ActionResult<unknown>) => {
    if (result.ok) return;
    if (result.code === "PRO_REQUIRED") setPaywallOpen(true);
    else setActionError(result.message);
  };

  const closeTooltip = useCallback(() => {
    setTooltip(null);
    setCasesOpen(false);
    setActionError(null);
    setSavedCaseTitle(null);
  }, []);

  // El panel de una anotación existente es un formulario: se cierra con
  // "Guardar nota", "Eliminar", la X o Escape — nunca por un click afuera, que
  // borraba la nota a medio escribir. El de una selección nueva sí se descarta
  // al hacer click en otro lado, porque la selección misma se pierde.
  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (tooltipRef.current?.contains(e.target as Node)) return;
      if (tooltip?.kind === "existing") return;
      closeTooltip();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTooltip();
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeTooltip, tooltip?.kind]);

  const handleMouseUp = useCallback(() => {
    if (!isAuthenticated) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const anchor =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as Element);
    const paragraph = anchor?.closest<HTMLElement>("[data-paragraph-id]");
    // Una selección que cruza párrafos no se puede anclar a un solo
    // `paragraph_id`; se ignora en vez de guardar algo incorrecto.
    if (!paragraph || !paragraph.contains(range.endContainer)) return;

    const start = getCharOffset(paragraph, range.startContainer, range.startOffset);
    const end = getCharOffset(paragraph, range.endContainer, range.endOffset);
    if (start >= end) return;

    const rect = range.getBoundingClientRect();
    pendingRangeRef.current = range.cloneRange();
    setActionError(null);
    setTooltip({
      kind: "new",
      x: rect.left + rect.width / 2,
      y: rect.top - 4,
      start,
      end,
      paragraphId: paragraph.dataset.paragraphId!,
      articleId: paragraph.dataset.articleId!,
      text: paragraph.textContent ?? "",
    });
  }, [isAuthenticated]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isAuthenticated) return;
      const mark = (e.target as HTMLElement).closest<HTMLElement>("mark[data-annotation-id]");
      if (!mark) return;
      e.stopPropagation();
      const annotationId = mark.dataset.annotationId!;
      activeMarkRef.current = mark;
      setNoteText(localNotes[annotationId] ?? notesById[annotationId] ?? "");
      setCasesOpen(false);
      setActionError(null);
      setSavedCaseTitle(null);
      setTooltip({ kind: "existing", x: e.clientX, y: e.clientY - 4, annotationId });
    },
    [isAuthenticated, localNotes, notesById]
  );

  // Inserta el <mark> recién guardado sin volver a pedir la ley al servidor.
  const paintMark = (annotationId: string, color: HighlightColor) => {
    const range = pendingRangeRef.current;
    if (!range) return;
    try {
      const mark = document.createElement("mark");
      mark.className = HL_MARK_CLASS[color];
      mark.dataset.annotationId = annotationId;
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    } catch {
      // Rango inválido (el DOM cambió): el servidor ya tiene la anotación, así
      // que basta con re-renderizar para verla.
      router.refresh();
    } finally {
      pendingRangeRef.current = null;
    }
  };

  const unpaintMark = (annotationId: string) => {
    const mark =
      activeMarkRef.current?.dataset.annotationId === annotationId
        ? activeMarkRef.current
        : rootRef.current?.querySelector<HTMLElement>(`mark[data-annotation-id="${annotationId}"]`);
    if (!mark) return;
    mark.replaceWith(...Array.from(mark.childNodes));
    activeMarkRef.current = null;
  };

  const handleSave = () => {
    if (!tooltip || tooltip.kind !== "new") return;
    const { start, end, paragraphId, articleId, text } = tooltip;
    const color = selectedColor;
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
    setActionError(null);

    const quote = text.slice(start, end);
    const prefix = text.slice(Math.max(0, start - ANCHOR_CONTEXT_LENGTH), start);
    const suffix = text.slice(end, end + ANCHOR_CONTEXT_LENGTH);

    startTransition(async () => {
      const result = await saveAnnotation({
        paragraph_id: paragraphId,
        article_id: articleId,
        char_start: start,
        char_end: end,
        quote,
        prefix,
        suffix,
        color,
      });
      handleActionResult(result);
      if (result.ok) paintMark(result.data.id, color);
      else pendingRangeRef.current = null;
    });
  };

  const handleSaveNote = () => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    const note = noteText.trim() || null;
    setActionError(null);
    startTransition(async () => {
      const result = await updateAnnotationNote(annotationId, note);
      handleActionResult(result);
      if (!result.ok) return;
      setLocalNotes((prev) => ({ ...prev, [annotationId]: note }));
      // Cerrar solo con el guardado confirmado: si falla, el texto sigue en
      // pantalla y se puede reintentar.
      closeTooltip();
      // El panel derecho lista las notas desde el servidor.
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    closeTooltip();
    startTransition(async () => {
      const result = await deleteAnnotation(annotationId);
      handleActionResult(result);
      if (result.ok) {
        unpaintMark(annotationId);
        if (localNotes[annotationId] != null || notesById[annotationId] != null) router.refresh();
      }
    });
  };

  const handleToggleCases = async () => {
    if (!casesOpen && userCases === null) {
      setCasesLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("cases")
        .select("id, title, color")
        .order("updated_at", { ascending: false });
      setUserCases((data ?? []) as UserCase[]);
      setCasesLoading(false);
    }
    setCasesOpen((prev) => !prev);
  };

  const handleAddToCase = (caseId: string, caseTitle: string) => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    setCasesOpen(false);
    setActionError(null);
    setSavedCaseTitle(null);
    startTransition(async () => {
      const result = await addAnnotationToCase({ caseId, annotationId });
      handleActionResult(result);
      // El panel se queda abierto: guardar en un caso no termina la edición de
      // la nota, y cerrarlo aquí era lo que dejaba la nota sin escribir.
      if (result.ok) setSavedCaseTitle(caseTitle);
    });
  };

  return (
    <>
      <div ref={rootRef} className={className} onMouseUp={handleMouseUp} onClick={handleClick}>
        {children}
      </div>

      {tooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-auto"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.kind === "new" ? (
              <div className="bg-navy-900 text-white rounded-lg shadow-xl px-3 py-2 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {(tier === "pro" ? COLORS : (["yellow"] as HighlightColor[])).map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      className={`w-4 h-4 rounded-full transition-all ${
                        selectedColor === c ? "ring-2 ring-gold-400 ring-offset-1 ring-offset-navy-900" : ""
                      }`}
                      style={{ backgroundColor: HL_TOKENS[c].swatch }}
                      aria-label={HL_TOKENS[c].label}
                    />
                  ))}
                  {tier !== "pro" && (
                    <span className="text-[10px] text-navy-100/60 ml-1 whitespace-nowrap">+3 en Pro</span>
                  )}
                </div>
                <div className="w-px h-4 bg-white/15" />
                <button
                  onClick={handleSave}
                  disabled={pending}
                  className="text-xs font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 transition-colors rounded-full px-3 py-1 whitespace-nowrap"
                >
                  {pending ? "…" : "Destacar"}
                </button>
              </div>
            ) : (
              <div className="bg-navy-900 text-white rounded-lg shadow-xl p-2.5 flex flex-col gap-2 w-[260px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-100/70">
                    Anotación
                  </span>
                  <button
                    onClick={closeTooltip}
                    className="text-navy-100/70 hover:text-white transition-colors p-0.5"
                    aria-label="Cerrar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m6 6 12 12M6 18 18 6" />
                    </svg>
                  </button>
                </div>

                {tier === "pro" && (
                  <>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Escribe tu nota…"
                      rows={4}
                      autoFocus
                      className="w-full text-xs bg-white/10 text-white rounded p-2 resize-y placeholder-navy-100/50 focus:outline-none focus:ring-1 focus:ring-gold-400"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={pending}
                      className="text-xs font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 transition-colors rounded-full px-3 py-1.5"
                    >
                      {pending ? "…" : "Guardar nota"}
                    </button>

                    <button
                      onClick={handleToggleCases}
                      disabled={pending}
                      className="text-white text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 disabled:opacity-50 transition-colors text-left flex items-center justify-between"
                    >
                      <span>Guardar en caso</span>
                      <span className="ml-2 opacity-60">{casesOpen ? "▴" : "▾"}</span>
                    </button>

                    {casesOpen && (
                      <div className="bg-white/10 rounded overflow-hidden max-h-40 overflow-y-auto">
                        {casesLoading ? (
                          <p className="text-xs text-navy-100/60 px-3 py-2">Cargando…</p>
                        ) : !userCases || userCases.length === 0 ? (
                          <p className="text-xs text-navy-100/60 px-3 py-2">No tienes casos</p>
                        ) : (
                          userCases.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleAddToCase(c.id, c.title)}
                              className="w-full text-left text-xs text-white px-3 py-2 hover:bg-white/10 transition-colors"
                            >
                              {c.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {savedCaseTitle && (
                      <p className="text-[11px] text-green-300">Guardado en “{savedCaseTitle}”.</p>
                    )}
                  </>
                )}
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-white text-xs px-3 py-1.5 rounded bg-white/5 hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {pending ? "…" : "Eliminar resaltado"}
                </button>
                {actionError && <p className="text-xs text-red-300">{actionError}</p>}
              </div>
            )}
          </div>,
          document.body
        )}

      {paywallOpen && createPortal(<PaywallModal onClose={() => setPaywallOpen(false)} />, document.body)}
    </>
  );
}
