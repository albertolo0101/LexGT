"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Annotation } from "@/lib/types";
import { saveAnnotation, deleteAnnotation } from "@/app/leyes/actions";

type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; annotationId: string };

function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  const sorted = [...annotations].sort((a, b) => a.char_start - b.char_start);
  const result: Segment[] = [];
  let cursor = 0;
  for (const ann of sorted) {
    const start = Math.max(ann.char_start, cursor);
    const end = Math.min(ann.char_end, text.length);
    if (start >= end) continue;
    if (start > cursor) result.push({ kind: "text", text: text.slice(cursor, start) });
    result.push({ kind: "mark", text: text.slice(start, end), annotationId: ann.id });
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
  | { kind: "existing"; x: number; y: number; annotationId: string };

export default function ParagraphHighlighter({
  text,
  annotations,
  paragraphId,
  articleId,
  isAuthenticated,
}: {
  text: string;
  annotations: Annotation[];
  paragraphId: string;
  articleId: string;
  isAuthenticated: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (tooltipRef.current?.contains(e.target as Node)) return;
      setTooltip(null);
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
    setTooltip({
      kind: "new",
      x: rect.left + rect.width / 2,
      y: rect.top - 4,
      start,
      end,
    });
  }, [isAuthenticated]);

  const handleMarkClick = useCallback((e: React.MouseEvent, annotationId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    setTooltip({
      kind: "existing",
      x: e.clientX,
      y: e.clientY - 4,
      annotationId,
    });
  }, [isAuthenticated]);

  const handleSave = () => {
    if (!tooltip || tooltip.kind !== "new") return;
    const { start, end } = tooltip;
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
    startTransition(async () => {
      await saveAnnotation({ paragraph_id: paragraphId, article_id: articleId, char_start: start, char_end: end });
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

  const segments = buildSegments(text, annotations);

  return (
    <>
      <span ref={containerRef} onMouseUp={handleMouseUp}>
        {segments.map((seg, i) =>
          seg.kind === "mark" ? (
            <mark
              key={i}
              className="bg-yellow-200 rounded-sm cursor-pointer"
              onClick={(e) => handleMarkClick(e, seg.annotationId)}
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
              <button
                onClick={handleSave}
                disabled={pending}
                className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {pending ? "…" : "Destacar"}
              </button>
            ) : (
              <button
                onClick={handleDelete}
                disabled={pending}
                className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {pending ? "…" : "Eliminar"}
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
