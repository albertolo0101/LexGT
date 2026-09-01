import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActor } from "@/lib/authz";
import { getLawMeta, getLawUserLayer } from "@/lib/services/queries/reading";
import { getCachedLawContent } from "@/lib/cache/law-content";
import ReaderSurface from "@/components/ReaderSurface";
import ArticleBlock from "./ArticleBlock";
import DocHeader from "./DocHeader";
import LawToc from "./LawToc";
import NotifBanner from "./NotifBanner";
import RightPanel from "./RightPanel";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const meta = await getLawMeta(supabase, slug);
  return { title: meta ? `${meta.shortName} — LexGT` : "LexGT" };
}

// La ley completa en una sola página: el lector hace scroll continuo por todos
// los capítulos y el índice de la izquierda marca dónde va. Los saltos internos
// son anclas (#seccion-… / #articulo-…), no navegaciones.
export default async function LawReadingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);

  // Contenido público cacheado + capa del usuario siempre fresca.
  const content = await getCachedLawContent(slug);
  if (!content) notFound();

  const { law, nodes, toc, articleCount } = content;
  const {
    annotationsByParagraph,
    notes,
    orphanedAnnotations,
    reforms,
    hasUnseenReform,
    isAuthenticated,
  } = await getLawUserLayer(supabase, actor, content);

  const notesById = Object.fromEntries(notes.map((n) => [n.id, n.note]));

  return (
    <div className="min-h-full bg-paper-2">
      <div className="mx-auto flex w-full max-w-[1760px] gap-5 px-3 py-6 lg:gap-7 lg:px-5">
        <LawToc
          entries={toc}
          lawShortName={law.short_name}
          decree={law.decree}
          articleCount={articleCount}
        />

        <div className="flex min-w-0 flex-1 justify-center">
          <ReaderSurface
            isAuthenticated={isAuthenticated}
            tier={actor.tier}
            notesById={notesById}
            className="doc-sheet"
          >
            <NotifBanner lawSlug={slug} show={actor.tier === "pro" && hasUnseenReform} />

            <DocHeader law={law} latestReform={reforms[0] ?? null} articleCount={articleCount} />

            {nodes.length === 0 ? (
              <p className="text-sm text-ink-400">Esta ley todavía no tiene contenido cargado.</p>
            ) : (
              nodes.map((node) =>
                node.kind === "section" ? (
                  <section
                    key={node.id}
                    id={node.anchor}
                    data-section-id={node.id}
                    className={`doc-section doc-section-d${Math.min(node.depth, 2)}`}
                  >
                    {node.label && <p className="doc-section-label">{node.label}</p>}
                    <h2 className="doc-section-heading">{node.heading}</h2>
                  </section>
                ) : (
                  <ArticleBlock
                    key={node.article.id}
                    article={node.article}
                    annotationsByParagraph={annotationsByParagraph}
                  />
                )
              )
            )}
          </ReaderSurface>
        </div>

        <RightPanel
          tier={actor.tier}
          notes={notes}
          orphanedAnnotations={orphanedAnnotations}
          reforms={reforms}
        />
      </div>
    </div>
  );
}
