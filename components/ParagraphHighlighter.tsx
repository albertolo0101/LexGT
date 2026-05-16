"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Annotation, Tier } from "@/lib/types";
import { saveAnnotation, deleteAnnotation, updateAnnotationNote } from "@/app/leyes/actions";
import { addAnnotationToCase } from "@/app/casos/actions";
import { createClient } from "@/lib/supabase";

type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink';

const COLOR_BG: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-200',
  green:  'bg-green-200',
  blue:   'bg-blue-200',
  pink:   'bg-pink-200',
};

const COLOR_CIRCLE: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-300',
  green:  'bg-green-300',
  blue:   'bg-blue-300',
  pink:   'bg-pink-300',
};

const COLORS: AnnotationColor[] = ['yellow', 'green', 'blue', 'pink'];

type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; annotationId: string; color: AnnotationColor; note: string | null };

function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  const sorted = [...annotations].sort((a, b) => a.char_start - b.char_start);
  const result: Segment[] = [];
  let cursor = 0;
  for (const ann of sorted) {
    const start = Math.max(ann.char_start, cursor);
    const end = Math.min(ann.char_end, text.length);
    if (start >= end) continue;
    if (start > cursor) result.push({ kind: "text", text: text.slice(cursor, start) });
    result.push({ kind: "mark", text: text.slice(start, end), annotationId: ann.id, color: (ann.color as AnnotationColor) || 'yellow', note: ann.note });
    cursor = end;
  }
  if (cursor < text.length) result.push({ kind: "text", text: text.slice(cursor) });
  return result;
}

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
  | { kind: "new"; x: number; y: number; start: number; end: number }
  | { kind: "existing"; x: number; y: number; annotationId: string; currentNote: string | null };

type UserCase = { id: string; title: string; color: string };

export default function ParagraphHighlighter({
  text,
  annotations,
  paragraphId,
  articleId,
  isAuthenticated,
  tier,
}: {
  text: string;
  annotations: Annotation[];
  paragraphId: string;
  articleId: string;
  isAuthenticated: boolean;
  tier: Tier;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow');
  const [noteText, setNoteText] = useState('');
  const [casesOpen, setCasesOpen] = useState(false);
  const [userCases, setUserCases] = useState<UserCase[] | null>(null);
  const [casesLoading, setCasesLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (tooltipRef.current?.contains(e.target as Node)) return;
      setTooltip(null);
      setCasesOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isAuthenticated) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const start = getCharOffset(containerRef.current, range.startContainer, range.startOffset);
    const end = getCharOffset(containerRef.current, range.endContainer, range.endOffset);
    if (start >= end) return;

    const rect = range.getBoundingClientRect();
    setTooltip({ kind: "new", x: rect.left + rect.width / 2, y: rect.top - 4, start, end });
  }, [isAuthenticated]);

  const handleMarkClick = useCallback((e: React.MouseEvent, annotationId: string, note: string | null) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setNoteText(note ?? '');
    setCasesOpen(false);
    setTooltip({ kind: "existing", x: e.clientX, y: e.clientY - 4, annotationId, currentNote: note });
  }, [isAuthenticated]);

  const handleSave = () => {
    if (!tooltip || tooltip.kind !== "new") return;
    const { start, end } = tooltip;
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
    startTransition(async () => {
      await saveAnnotation({ paragraph_id: paragraphId, article_id: articleId, char_start: start, char_end: end, color: selectedColor });
      router.refresh();
    });
  };

  const handleSaveNote = () => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    setTooltip(null);
    startTransition(async () => {
      await updateAnnotationNote(annotationId, noteText || null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    setTooltip(null);
    startTransition(async () => {
      await deleteAnnotation(annotationId);
      router.refresh();
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

  const handleAddToCase = (caseId: string) => {
    if (!tooltip || tooltip.kind !== "existing") return;
    const { annotationId } = tooltip;
    setCasesOpen(false);
    setTooltip(null);
    startTransition(async () => {
      await addAnnotationToCase({ caseId, annotationId });
    });
  };

  const segments = buildSegments(text, annotations);

  return (
    <>
      <span ref={containerRef} onMouseUp={handleMouseUp}>
        {segments.map((seg, i) =>
          seg.kind === "mark" ? (
            <mark
              key={i}
              className={`${COLOR_BG[seg.color] ?? 'bg-yellow-200'} rounded-sm cursor-pointer`}
              onClick={(e) => handleMarkClick(e, seg.annotationId, seg.note)}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </span>

      {tooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-auto"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.kind === "new" ? (
              <div className="bg-gray-900 rounded shadow-lg p-2 flex flex-col gap-2">
                {tier === 'pro' && (
                  <div className="flex gap-1.5 justify-center">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`w-5 h-5 rounded-full ${COLOR_CIRCLE[c]} transition-all ${selectedColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : ''}`}
                        aria-label={c}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={pending}
                  className="text-white text-xs px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {pending ? "…" : "Destacar"}
                </button>
              </div>
            ) : (
              <div className="bg-gray-900 rounded shadow-lg p-2 flex flex-col gap-2 min-w-[180px]">
                {tier === 'pro' && (
                  <>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Agregar nota…"
                      rows={3}
                      className="w-full text-xs bg-gray-800 text-white rounded p-1.5 resize-none placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={pending}
                      className="text-white text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      {pending ? "…" : "Guardar nota"}
                    </button>

                    <button
                      onClick={handleToggleCases}
                      disabled={pending}
                      className="text-white text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors text-left flex items-center justify-between"
                    >
                      <span>Guardar en caso</span>
                      <span className="ml-2 opacity-60">{casesOpen ? "▴" : "▾"}</span>
                    </button>

                    {casesOpen && (
                      <div className="bg-gray-800 rounded overflow-hidden">
                        {casesLoading ? (
                          <p className="text-xs text-gray-400 px-3 py-2">Cargando…</p>
                        ) : !userCases || userCases.length === 0 ? (
                          <p className="text-xs text-gray-400 px-3 py-2">No tienes casos</p>
                        ) : (
                          userCases.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleAddToCase(c.id)}
                              className="w-full text-left text-xs text-white px-3 py-2 hover:bg-gray-700 transition-colors"
                            >
                              {c.title}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="text-white text-xs px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {pending ? "…" : "Eliminar"}
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
