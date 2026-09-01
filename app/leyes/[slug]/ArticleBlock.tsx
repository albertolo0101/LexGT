import type { Annotation } from '@/lib/types'
import type { DocArticle } from '@/lib/services/queries/reading'
import ParagraphText from './ParagraphText'

export default function ArticleBlock({
  article,
  annotationsByParagraph,
}: {
  article: DocArticle
  annotationsByParagraph: Record<string, Annotation[]>
}) {
  // Entrada corrida ("Artículo 12. Epígrafe. Texto…"), como en un código impreso.
  // Muchos párrafos ya traen su propio rótulo dentro del texto ("Artículo 1º.-
  // El presente Código…"): en ese caso no se antepone otro, o se lee duplicado.
  // Ojo: el texto NUNCA se recorta — los offsets de las anotaciones se cuentan
  // sobre `paragraphs.text` tal cual.
  const firstText = article.paragraphs[0]?.text ?? ''
  const showNumber = !/^\s*(art[íi]culos?|arts?\.)\s*\d/i.test(firstText)

  const lead =
    showNumber || article.heading ? (
      <>
        {showNumber && <span className="doc-article-num">Artículo {article.number}.</span>}
        {article.heading && <span className="doc-article-epigraph">{article.heading}.</span>}{' '}
      </>
    ) : undefined

  return (
    <article id={article.anchor} className="doc-article">
      {article.paragraphs.length === 0 ? (
        <p className="doc-text">
          <span className="doc-article-num">Artículo {article.number}.</span>
          {article.heading && <span className="doc-article-epigraph">{article.heading}.</span>}{' '}
          <span className="doc-text-empty">[Texto no disponible]</span>
        </p>
      ) : (
        article.paragraphs.map((para, i) => (
          <ParagraphText
            key={para.id}
            paragraphId={para.id}
            articleId={article.id}
            text={para.text}
            annotations={annotationsByParagraph[para.id] ?? []}
            lead={i === 0 ? lead : undefined}
          />
        ))
      )}
    </article>
  )
}
