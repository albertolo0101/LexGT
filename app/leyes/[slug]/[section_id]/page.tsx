import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActor } from "@/lib/authz";
import { getSectionMeta, getSectionReadingBundle } from "@/lib/services/queries/reading";
import { sectionLabel } from "@/lib/section-kind";
import DocHeader from "./DocHeader";
import ChapterRail from "./ChapterRail";
import SectionNav from "./SectionNav";
import RightPanel from "./RightPanel";
import NotifBanner from "./NotifBanner";
import Article from "./Article";

type Props = { params: Promise<{ slug: string; section_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, section_id } = await params;
  const supabase = await createServerSupabaseClient();
  const meta = await getSectionMeta(supabase, slug, section_id);
  if (!meta) return { title: "LexGT" };
  return { title: `${meta.sectionHeading} — ${meta.lawShortName} — LexGT` };
}

export default async function SectionReadingPage({ params }: Props) {
  const { slug, section_id } = await params;
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);

  const bundle = await getSectionReadingBundle(supabase, actor, slug, section_id);
  if (!bundle) notFound();

  const {
    law,
    section,
    parentSection,
    prevSection,
    nextSection,
    articles,
    articleStubs,
    annotationsByParagraph,
    notes,
    orphanedAnnotations,
    reforms,
    hasUnseenReform,
    isAuthenticated,
  } = bundle;

  return (
    <div className="bg-paper min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-6">
        <ChapterRail
          lawSlug={slug}
          sectionLabel={sectionLabel(section)}
          parentLabel={parentSection ? sectionLabel(parentSection) : null}
          articles={articleStubs}
          nextSection={nextSection}
        />

        <div className="flex-1 min-w-0 max-w-2xl mx-auto">
          <NotifBanner lawSlug={slug} show={actor.tier === "pro" && hasUnseenReform} />

          <DocHeader law={law} section={section} parentSection={parentSection} latestReform={reforms[0] ?? null} />

          {articles.length === 0 ? (
            <p className="text-sm text-ink-400">Esta sección no contiene artículos.</p>
          ) : (
            <div className="space-y-10">
              {articles.map((article) => (
                <Article
                  key={article.id}
                  article={article}
                  annotationsByParagraph={annotationsByParagraph}
                  isAuthenticated={isAuthenticated}
                  tier={actor.tier === "pro" ? "pro" : "free"}
                />
              ))}
            </div>
          )}

          <SectionNav lawSlug={slug} prev={prevSection} next={nextSection} />
        </div>

        <RightPanel tier={actor.tier} notes={notes} orphanedAnnotations={orphanedAnnotations} reforms={reforms} lawSlug={slug} />
      </div>
    </div>
  );
}
