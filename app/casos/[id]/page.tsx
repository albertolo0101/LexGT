import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor } from "@/lib/authz";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCaseDetail } from "@/lib/services/queries/cases";
import { deleteCase } from "../actions";
import CaseDetailClient from "./CaseDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);

  if (!actor.userId || actor.tier !== "pro") redirect("/leyes");

  const theCase = await getCaseDetail(supabase, actor, id).catch(() => null);
  if (!theCase) notFound();

  const caseId = theCase.id;

  async function deleteCaseAction() {
    "use server";
    await deleteCase(caseId);
  }

  return (
    <div className="min-h-full bg-paper-2">
      <header className="sticky top-0 z-10 border-b border-rule bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-3 text-xs text-ink-500">
          <Link href="/casos" className="transition-colors hover:text-navy-700">
            Mis casos
          </Link>
          <span>/</span>
          <span className="truncate text-ink-900">{theCase.title}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4 border-b border-rule pb-6">
          <h1 className="font-serif text-2xl text-ink-900">{theCase.title}</h1>
          <form action={deleteCaseAction}>
            <button
              type="submit"
              className="whitespace-nowrap text-xs text-ink-500 transition-colors hover:text-red-600"
            >
              Eliminar caso
            </button>
          </form>
        </div>

        <CaseDetailClient
          caseId={theCase.id}
          title={theCase.title}
          notes={theCase.description}
          annotations={theCase.annotations}
        />
      </main>
    </div>
  );
}
