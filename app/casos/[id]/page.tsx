import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserTier } from "@/lib/get-user-tier";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteCase, removeAnnotationFromCase } from "../actions";

type Props = { params: Promise<{ id: string }> };

type CaseAnnotationRow = {
  id: string;
  annotations: {
    id: string;
    color: string;
    note: string | null;
    char_start: number;
    char_end: number;
    paragraphs: { text: string } | null;
    articles: { number: string; heading: string | null } | null;
  } | null;
};

const COLOR_BG: Record<string, string> = {
  yellow: "bg-yellow-200",
  green:  "bg-green-200",
  blue:   "bg-blue-200",
  pink:   "bg-pink-200",
};

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: { user } }, tier] = await Promise.all([
    supabase.auth.getUser(),
    getUserTier(supabase),
  ]);

  if (!user || tier !== "pro") redirect("/leyes");

  const { data: theCase } = await supabase
    .from("cases")
    .select(`
      id, title, description, color, updated_at,
      case_annotations(
        id,
        annotations(
          id, color, note, char_start, char_end,
          paragraphs(text),
          articles(number, heading)
        )
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!theCase) notFound();

  const caseAnnotations = (theCase.case_annotations ?? []) as CaseAnnotationRow[];

  const deleteCaseAction = deleteCase.bind(null, theCase.id);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/casos" className="hover:text-gray-600 transition-colors">
            Mis casos
          </Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{theCase.title}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10 pb-8 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{theCase.title}</h1>
            {theCase.description && (
              <p className="text-sm text-gray-400 mt-1">{theCase.description}</p>
            )}
          </div>
          <form action={deleteCaseAction}>
            <button
              type="submit"
              className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
            >
              Eliminar caso
            </button>
          </form>
        </div>

        {caseAnnotations.length === 0 ? (
          <p className="text-sm text-gray-400">
            Este caso no tiene highlights guardados. Agrega highlights desde la vista de lectura.
          </p>
        ) : (
          <div className="space-y-6">
            {caseAnnotations.map((ca) => {
              const ann = ca.annotations;
              if (!ann) return null;

              const isMigrated = ann.char_start === 0 && ann.char_end === 0;
              const excerpt = isMigrated
                ? null
                : ann.paragraphs?.text.slice(ann.char_start, ann.char_end) ?? null;

              const removeFn = removeAnnotationFromCase.bind(null, ca.id);

              return (
                <div key={ca.id} className="border border-gray-100 rounded-lg p-4 space-y-2">
                  {ann.articles && (
                    <p className="text-xs font-medium text-gray-500">
                      Artículo {ann.articles.number}
                      {ann.articles.heading ? ` — ${ann.articles.heading}` : ""}
                    </p>
                  )}

                  {excerpt && (
                    <p className="text-sm text-gray-800">
                      <mark className={`${COLOR_BG[ann.color] ?? "bg-yellow-200"} rounded-sm px-0.5`}>
                        {excerpt}
                      </mark>
                    </p>
                  )}

                  {ann.note && (
                    <p className="text-xs text-gray-500 border-l-2 border-gray-200 pl-3 whitespace-pre-wrap">
                      {ann.note}
                    </p>
                  )}

                  <div className="pt-1">
                    <form action={removeFn}>
                      <button
                        type="submit"
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                      >
                        Eliminar del caso
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
