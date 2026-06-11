import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Annotation, Law, LawReform, Section, ArticleWithParagraphs } from "@/lib/types";
import { getUserTier } from "@/lib/get-user-tier";
import { getPendingReforms } from "@/lib/get-pending-reforms";
import { sectionLabel } from "@/lib/section-kind";
import DocHeader from "./DocHeader";
import ChapterRail from "./ChapterRail";
import SectionNav from "./SectionNav";
import RightPanel from "./RightPanel";
import NotifBanner from "./NotifBanner";
import Article from "./Article";
import type { NoteItem, SiblingSection } from "./types";

type Props = { params: Promise<{ slug: string; section_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, section_id } = await params;
  const supabase = await createServerSupabaseClient();
  const [{ data: law }, { data: section }] = await Promise.all([
    supabase.from("laws").select("short_name").eq("slug", slug).single(),
    supabase.from("sections").select("heading").eq("id", section_id).single(),
  ]);
  if (!law || !section) return { title: "LexGT" };
  return { title: `${section.heading} — ${law.short_name} — LexGT` };
}

type AnnotationNoteRow = {
  id: string;
  color: "yellow" | "green" | "blue" | "pink";
  note: string | null;
  char_start: number;
  char_end: number;
  paragraphs: { text: string } | null;
  articles: { number: string; heading: string | null; section_id: string | null };
};

export default async function SectionReadingPage({ params }: Props) {
  const { slug, section_id } = await params;
  const supabase = await createServerSupabaseClient();

  const [
    { data: lawRow },
    { data: sectionRow },
    { data: articlesRaw, error: articlesError },
    { data: { user } },
    tier,
  ] = await Promise.all([
    supabase.from("laws").select("*").eq("slug", slug).single(),
    supabase.from("sections").select("*").eq("id", section_id).single(),
    supabase
      .from("articles")
      .select("*, paragraphs(*)")
      .eq("section_id", section_id)
      .eq("is_current", true)
      .order("position"),
    supabase.auth.getUser(),
    getUserTier(supabase),
  ]);

  const law = lawRow as Law | null;
  const section = sectionRow as Section | null;

  if (!law || !section) notFound();
  if (articlesError) throw new Error(articlesError.message);

  const articles = ((articlesRaw as ArticleWithParagraphs[]) ?? []).map((a) => ({
    ...a,
    paragraphs: [...a.paragraphs].sort((x, y) => x.position - y.position),
  }));

  const articleIds = articles.map((a) => a.id);

  const [
    { data: parentSectionRow },
    { data: siblingsRaw },
    { data: reformsRaw },
    { data: highlightAnnotationsRaw },
    { data: notesRaw },
    { reformsByLaw },
  ] = await Promise.all([
    section.parent_id
      ? supabase.from("sections").select("*").eq("id", section.parent_id).single()
      : Promise.resolve({ data: null }),
    section.parent_id
      ? supabase
          .from("sections")
          .select("id, kind, number, heading, position")
          .eq("law_id", law.id)
          .eq("parent_id", section.parent_id)
          .order("position")
      : supabase
          .from("sections")
          .select("id, kind, number, heading, position")
          .eq("law_id", law.id)
          .is("parent_id", null)
          .order("position"),
    supabase.from("law_reforms").select("*").eq("law_id", law.id).order("published_at", { ascending: false }),
    user && articleIds.length > 0
      ? supabase.from("annotations").select("*").in("article_id", articleIds)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("annotations")
          .select("id, color, note, char_start, char_end, paragraph_id, article_id, paragraphs(text), articles!inner(number, heading, section_id, law_id, is_current)")
          .eq("user_id", user.id)
          .eq("articles.law_id", law.id)
          .eq("articles.is_current", true)
          .not("note", "is", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    getPendingReforms(supabase, tier, user?.id ?? null),
  ]);

  const parentSection = parentSectionRow as Section | null;
  const siblings = (siblingsRaw ?? []) as SiblingSection[];
  const reforms = (reformsRaw ?? []) as LawReform[];

  const annotations = (highlightAnnotationsRaw ?? []) as Annotation[];
  const annotationsByParagraph = annotations.reduce<Record<string, Annotation[]>>((acc, ann) => {
    (acc[ann.paragraph_id] ??= []).push(ann);
    return acc;
  }, {});

  const notes: NoteItem[] = (notesRaw ?? []).map((raw) => {
    const row = raw as unknown as AnnotationNoteRow;
    const text = row.paragraphs?.text ?? "";
    return {
      id: row.id,
      color: row.color,
      note: row.note ?? "",
      quote: text.slice(row.char_start, row.char_end),
      articleNumber: row.articles.number,
      articleHeading: row.articles.heading,
      sectionId: row.articles.section_id,
    };
  });

  const currentIndex = siblings.findIndex((s) => s.id === section.id);
  const prevSection = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  const articleStubs = articles.map((a) => ({ id: a.id, number: a.number, heading: a.heading }));
  const hasUnseenReform = reformsByLaw.has(law.id);

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
          <NotifBanner lawSlug={slug} show={tier === "pro" && hasUnseenReform} />

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
                  isAuthenticated={!!user}
                  tier={tier === "pro" ? "pro" : "free"}
                />
              ))}
            </div>
          )}

          <SectionNav lawSlug={slug} prev={prevSection} next={nextSection} />
        </div>

        <RightPanel tier={tier} notes={notes} reforms={reforms} lawSlug={slug} />
      </div>
    </div>
  );
}
