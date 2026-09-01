import type { Annotation } from '@/lib/types'
import { HL_MARK_CLASS } from '@/lib/case-colors'
import { buildSegments } from './segments'

/**
 * Párrafo anotable, renderizado 100% en el servidor: cero JavaScript por
 * párrafo. Los eventos (selección de texto, click en un highlight) los maneja
 * `ReaderSurface`, que ubica este nodo con `closest('[data-paragraph-id]')`.
 *
 * `lead` (el "Artículo 12." de entrada) va FUERA del span anotable a propósito:
 * `char_start`/`char_end` son offsets sobre `paragraphs.text`, y ReaderSurface
 * los calcula recorriendo los nodos de texto del span. Cualquier texto extra
 * adentro correría todas las anotaciones del párrafo.
 */
export default function ParagraphText({
  paragraphId,
  articleId,
  text,
  annotations,
  lead,
}: {
  paragraphId: string
  articleId: string
  text: string
  annotations: Annotation[]
  lead?: React.ReactNode
}) {
  const segments = buildSegments(text, annotations)

  return (
    <p className="doc-text">
      {lead}
      <span data-paragraph-id={paragraphId} data-article-id={articleId}>
        {segments.map((seg, i) =>
          seg.kind === 'mark' ? (
            <mark
              key={i}
              className={HL_MARK_CLASS[seg.color] ?? HL_MARK_CLASS.yellow}
              data-annotation-id={seg.annotationId}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </span>
    </p>
  )
}
