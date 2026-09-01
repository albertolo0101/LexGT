import type { Annotation } from '@/lib/types'
import type { HighlightColor } from '@/lib/case-colors'

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'mark'; text: string; annotationId: string; color: HighlightColor }

export function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  const sorted = [...annotations].sort((a, b) => a.char_start - b.char_start)
  const result: Segment[] = []
  let cursor = 0
  for (const ann of sorted) {
    const start = Math.max(ann.char_start, cursor)
    const end = Math.min(ann.char_end, text.length)
    if (start >= end) continue
    if (start > cursor) result.push({ kind: 'text', text: text.slice(cursor, start) })
    result.push({
      kind: 'mark',
      text: text.slice(start, end),
      annotationId: ann.id,
      color: (ann.color as HighlightColor) || 'yellow',
    })
    cursor = end
  }
  if (cursor < text.length) result.push({ kind: 'text', text: text.slice(cursor) })
  return result
}
