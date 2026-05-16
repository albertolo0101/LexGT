import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Law, Section, Article, SectionNode } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("laws")
    .select("short_name")
    .eq("slug", slug)
    .single();
  return { title: data ? `${data.short_name} — LexGT` : "LexGT" };
}

function buildTree(sections: Section[]): SectionNode[] {
  const map = new Map<string, SectionNode>();
  for (const s of sections) map.set(s.id, { ...s, children: [] });

  const roots: SectionNode[] = [];
  for (const s of sections) {
    const node = map.get(s.id)!;
    if (s.parent_id && map.has(s.parent_id)) {
      map.get(s.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

const KIND_LABEL: Record<string, string> = {
  libro: "Libro",
  titulo: "Título",
  capitulo: "Capítulo",
  seccion: "Sección",
  parte: "Parte",
};

function renderTree(
  nodes: SectionNode[],
  slug: string,
  depth = 0
): React.ReactNode {
  if (nodes.length === 0) return null;

  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-0.5"}>
      {nodes
        .sort((a, b) => a.position - b.position)
        .map((node) => {
          const label = KIND_LABEL[node.kind] ?? node.kind;
          const fullLabel = node.number ? `${label} ${node.number}` : label;
          const isLeaf = node.children.length === 0;

          if (isLeaf) {
            return (
              <li key={node.id}>
                <Link
                  href={`/leyes/${slug}/${node.id}`}
                  style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                  className="flex items-baseline gap-3 py-1.5 pr-3 rounded hover:bg-blue-50 group transition-colors"
                >
                  <span className="shrink-0 text-xs text-gray-400 font-medium w-24">
                    {fullLabel}
                  </span>
                  <span className="text-sm text-gray-800 group-hover:text-blue-700 transition-colors leading-snug">
                    {node.heading}
                  </span>
                </Link>
              </li>
            );
          }

          const isBook = node.kind === "libro";

          return (
            <li
              key={node.id}
              className={depth === 0 ? "mt-8 first:mt-0" : "mt-4"}
            >
              <div
                style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
                className={
                  isBook
                    ? "pb-2 mb-2 border-b border-gray-200"
                    : "pb-1"
                }
              >
                <p
                  className={
                    isBook
                      ? "text-xs font-bold uppercase tracking-widest text-gray-400"
                      : "text-xs font-semibold uppercase tracking-wider text-gray-400"
                  }
                >
                  {fullLabel}
                </p>
                <p
                  className={
                    isBook
                      ? "text-base font-semibold text-gray-900 mt-0.5"
                      : "text-sm font-medium text-gray-700 mt-0.5"
                  }
                >
                  {node.heading}
                </p>
              </div>
              {renderTree(node.children, slug, depth + 1)}
            </li>
          );
        })}
    </ul>
  );
}

export default async function LawTocPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: lawRow } = await supabase
    .from("laws")
    .select("*")
    .eq("slug", slug)
    .single();

  const law = lawRow as Law | null;
  if (!law) notFound();

  const { data: sectionsRaw, error: sectionsError } = await supabase
    .from("sections")
    .select("*")
    .eq("law_id", law.id)
    .order("position");

  if (sectionsError) throw new Error(sectionsError.message);

  const sections = (sectionsRaw as Section[]) ?? [];
  const hasSections = sections.length > 0;

  let directArticles: Article[] = [];
  if (!hasSections) {
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("id, number, heading, position")
      .eq("law_id", law.id)
      .eq("is_current", true)
      .order("position");
    if (articlesError) throw new Error(articlesError.message);
    directArticles = (articles as Article[]) ?? [];
  }

  const tree = hasSections ? buildTree(sections) : [];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href="/leyes"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Leyes
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-10">
          {law.decree && (
            <p className="text-xs font-mono text-gray-400 mb-1">{law.decree}</p>
          )}
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
            {law.short_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{law.full_name}</p>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
            Índice
          </h2>

          {hasSections ? (
            renderTree(tree, slug)
          ) : directArticles.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {directArticles.map((article) => (
                <li
                  key={article.id}
                  className="flex items-baseline gap-3 py-2 px-2"
                >
                  <span className="text-xs text-gray-400 font-medium shrink-0 w-20">
                    Art. {article.number}
                  </span>
                  <span className="text-sm text-gray-700">
                    {article.heading ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">
              Esta ley no tiene contenido disponible.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
