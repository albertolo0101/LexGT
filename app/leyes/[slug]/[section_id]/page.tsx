import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Law, Section, ArticleWithParagraphs } from "@/lib/types";

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

const KIND_LABEL: Record<string, string> = {
  libro: "Libro",
  titulo: "Título",
  capitulo: "Capítulo",
  seccion: "Sección",
  parte: "Parte",
};

export default async function SectionReadingPage({ params }: Props) {
  const { slug, section_id } = await params;
  const supabase = await createServerSupabaseClient();

  const [
    { data: lawRow },
    { data: sectionRow },
    { data: articlesRaw, error: articlesError },
  ] = await Promise.all([
    supabase.from("laws").select("*").eq("slug", slug).single(),
    supabase.from("sections").select("*").eq("id", section_id).single(),
    supabase
      .from("articles")
      .select("*, paragraphs(*)")
      .eq("section_id", section_id)
      .eq("is_current", true)
      .order("position"),
  ]);

  const law = lawRow as Law | null;
  const section = sectionRow as Section | null;

  if (!law || !section) notFound();
  if (articlesError) throw new Error(articlesError.message);

  const articles = ((articlesRaw as ArticleWithParagraphs[]) ?? []).map(
    (a) => ({
      ...a,
      paragraphs: [...a.paragraphs].sort((x, y) => x.position - y.position),
    })
  );

  const kindLabel = KIND_LABEL[section.kind] ?? section.kind;
  const sectionLabel = section.number
    ? `${kindLabel} ${section.number}`
    : kindLabel;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/leyes" className="hover:text-gray-600 transition-colors">
            Leyes
          </Link>
          <span>/</span>
          <Link
            href={`/leyes/${slug}`}
            className="hover:text-gray-600 transition-colors truncate max-w-[180px]"
          >
            {law.short_name}
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{sectionLabel}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10 pb-8 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            {sectionLabel}
          </p>
          <h1 className="text-xl font-semibold text-gray-900 leading-snug">
            {section.heading}
          </h1>
        </div>

        {articles.length === 0 ? (
          <p className="text-sm text-gray-400">
            Esta sección no contiene artículos.
          </p>
        ) : (
          <div className="space-y-10">
            {articles.map((article) => (
              <article key={article.id} id={`art-${article.number}`}>
                <header className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    <span className="text-gray-400 font-normal mr-2">
                      Artículo {article.number}.
                    </span>
                    {article.heading && (
                      <span className="italic">{article.heading}</span>
                    )}
                  </h2>
                </header>

                <div className="space-y-3">
                  {article.paragraphs.map((para) => (
                    <p
                      key={para.id}
                      className="text-[15px] leading-relaxed text-gray-800"
                    >
                      {para.text}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-16 pt-6 border-t border-gray-100">
          <Link
            href={`/leyes/${slug}`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Volver al índice
          </Link>
        </div>
      </main>
    </div>
  );
}
