import type { ArticleWithParagraphs, Annotation } from '@/lib/types'
import ParagraphHighlighter from '@/components/ParagraphHighlighter'

export default function Article({
  article,
  annotationsByParagraph,
  isAuthenticated,
  tier,
}: {
  article: ArticleWithParagraphs
  annotationsByParagraph: Record<string, Annotation[]>
  isAuthenticated: boolean
  tier: 'free' | 'pro'
}) {
  return (
    <article id={`articulo-${article.number}`} className="scroll-mt-24 grid grid-cols-[auto_1fr] gap-4 sm:gap-6">
      <div className="font-serif text-2xl sm:text-3xl text-gold-500 leading-none pt-1 select-none">
        {article.number}
      </div>
      <div className="min-w-0">
        {article.heading && (
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400 mb-2">
            {article.heading}
          </h2>
        )}
        <div className="space-y-3">
          {article.paragraphs.map((para) => (
            <p key={para.id} className="text-[15px] leading-relaxed text-ink-700 text-justify font-serif">
              <ParagraphHighlighter
                text={para.text}
                annotations={annotationsByParagraph[para.id] ?? []}
                paragraphId={para.id}
                articleId={article.id}
                isAuthenticated={isAuthenticated}
                tier={tier}
              />
            </p>
          ))}
        </div>
      </div>
    </article>
  )
}
