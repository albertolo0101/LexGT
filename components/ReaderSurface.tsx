"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Tier } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";
import { saveAnnotations, deleteAnnotation, updateAnnotationNote } from "@/app/leyes/actions";
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

// Rango dentro del párrafo a partir de offsets de caracteres — el inverso de
// `getCharOffset`. Se calcula al momento de pintar, contra el DOM vigente, en
// vez de guardar el Range de la selección: al envolver un tramo en <mark> el
// DOM cambia y un Range viejo puede quedar inválido.
function rangeFromOffsets(container: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const length = node.textContent?.length ?? 0;
    if (!started && offset + length > start) {
      range.setStart(node, start - offset);
      started = true;
    }
    if (started && offset + length >= end) {
      range.setEnd(node, end - offset);
      return range;
    }
    offset += length;
  }
  return null;
}

// Tramo de la selección dentro de UN párrafo. Una selección que cruza varios
// párrafos produce un segmento por párrafo, y cada uno se guarda como su propia
// anotación (el anclaje es por párrafo).
type Segment = {
  paragraphId: string;
  articleId: string;
  start: number;
  end: number;
  /** Texto completo del párrafo: de aquí salen quote, prefix y suffix. */
  text: string;
};

// Igual que `MAX_ANNOTATIONS_PER_SAVE` en el servicio: un "seleccionar todo"
// sobre el Código Civil no debe intentar insertar miles de filas.
const MAX_SEGMENTS = 50;

type TooltipState =
  | { kind: "new"; x: number; y: number; segments: Segment[] }
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

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isAuthenticated) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const root = rootRef.current;
      if (!root) return;

      const range = sel.getRangeAt(0);
      // Todos los párrafos que toca la selección, en orden de documento.
      const paragraphs = Array.from(
        root.querySelectorAll<HTMLElement>("[data-paragraph-id]")
      ).filter((p) => range.intersectsNode(p));
      if (paragraphs.length === 0) return;

      const segments: Segment[] = [];
      for (const paragraph of paragraphs) {
        const text = paragraph.textContent ?? "";
        const startOffset = paragraph.contains(range.startContainer)
          ? getCharOffset(paragraph, range.startContainer, range.startOffset)
          : 0;
        const endOffset = paragraph.contains(range.endContainer)
          ? getCharOffset(paragraph, range.endContainer, range.endOffset)
          : text.length;
        // Un párrafo que la selección solo roza (empieza donde otro termina)
        // no aporta texto: se descarta, igual que los tramos en blanco.
        if (endOffset <= startOffset) continue;
        if (text.slice(startOffset, endOffset).trim() === "") continue;

        segments.push({
          paragraphId: paragraph.dataset.paragraphId!,
          articleId: paragraph.dataset.articleId!,
          start: startOffset,
          end: endOffset,
          text,
        });
      }
      if (segments.length === 0) return;

      setActionError(
        segments.length > MAX_SEGMENTS
          ? `La selección abarca ${segments.length} párrafos; el máximo por resaltado es ${MAX_SEGMENTS}.`
          : null
      );
      // El panel se ancla al puntero: con una selección larga el inicio puede
      // haber quedado fuera de la pantalla.
      setTooltip({
        kind: "new",
        x: e.clientX,
        y: e.clientY - 8,
        segments: segments.slice(0, MAX_SEGMENTS),
      });
    },
    [isAuthenticated]
  );

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

  // Inserta los <mark> recién guardados sin volver a pedir la ley al servidor.
  const paintMark = (segment: Segment, annotationId: string, color: HighlightColor) => {
    const paragraph = rootRef.current?.querySelector<HTMLElement>(
      `[data-paragraph-id="${segment.paragraphId}"]`
    );
    const range = paragraph ? rangeFromOffsets(paragraph, segment.start, segment.end) : null;
    if (!range) return false;
    try {
      const mark = document.createElement("mark");
      mark.className = HL_MARK_CLASS[color];
      mark.dataset.annotationId = annotationId;
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
      return true;
    } catch {
      // El rango cruzaba elementos que no se pueden envolver: el servidor ya
      // tiene la anotación, basta re-renderizar para verla.
      return false;
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
    const { segments } = tooltip;
    const color = selectedColor;
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
    setActionError(null);

    const payload = segments.map((segment) => {
      const { text, start, end } = segment;
      return {
        paragraph_id: segment.paragraphId,
        article_id: segment.articleId,
        char_start: start,
        char_end: end,
        quote: text.slice(start, end),
        prefix: text.slice(Math.max(0, start - ANCHOR_CONTEXT_LENGTH), start),
        suffix: text.slice(end, end + ANCHOR_CONTEXT_LENGTH),
        color,
      };
    });

    startTransition(async () => {
      const result = await saveAnnotations({ annotations: payload });
      handleActionResult(result);
      if (!result.ok) return;
      const painted = segments.map((segment, i) => {
        const id = result.data.ids[i];
        return id ? paintMark(segment, id, color) : false;
      });
      // Si algún tramo no se pudo pintar en el DOM, se re-renderiza la ley:
      // la anotación ya existe en el servidor y debe verse.
      if (painted.some((ok) => !ok)) router.refresh();
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
                  {pending
                    ? "…"
                    : tooltip.segments.length > 1
                      ? `Destacar ${tooltip.segments.length} párrafos`
                      : "Destacar"}
                </button>
                {actionError && (
                  <p className="max-w-[220px] text-[11px] leading-snug text-red-300">{actionError}</p>
                )}
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
