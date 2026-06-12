import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requirePro } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import type { Case } from "@/lib/types";

export type CaseSummary = Case & { annotation_count: number };

type CaseListRow = Case & { case_annotations: { id: string }[] | null };

export async function listCases(db: SupabaseClient, actor: Actor): Promise<CaseSummary[]> {
  requirePro(actor);

  const { data, error } = await db
    .from("cases")
    .select("id, user_id, title, description, color, created_at, updated_at, case_annotations(id)")
    .eq("user_id", actor.userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as CaseListRow[]).map(({ case_annotations, ...rest }) => ({
    ...rest,
    annotation_count: case_annotations?.length ?? 0,
  }));
}

export type CaseDetailAnnotation = {
  id: string;
  annotation_id: string;
  color: string;
  note: string | null;
  excerpt: string | null;
  article: { number: string; heading: string | null } | null;
};

export type CaseDetail = Case & { annotations: CaseDetailAnnotation[] };

type CaseDetailRow = Case & {
  case_annotations:
    | {
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
      }[]
    | null;
};

export async function getCaseDetail(db: SupabaseClient, actor: Actor, caseId: string): Promise<CaseDetail> {
  requirePro(actor);

  const { data, error } = await db
    .from("cases")
    .select(`
      id, user_id, title, description, color, created_at, updated_at,
      case_annotations(
        id,
        annotations(
          id, color, note, char_start, char_end,
          paragraphs(text),
          articles(number, heading)
        )
      )
    `)
    .eq("id", caseId)
    .eq("user_id", actor.userId)
    .single();
  if (error || !data) throw new ActionError("NOT_FOUND", "Caso no encontrado.");

  const row = data as unknown as CaseDetailRow;

  const annotations: CaseDetailAnnotation[] = (row.case_annotations ?? [])
    .filter((ca) => ca.annotations !== null)
    .map((ca) => {
      const ann = ca.annotations!;
      const isMigrated = ann.char_start === 0 && ann.char_end === 0;
      const excerpt = isMigrated ? null : ann.paragraphs?.text.slice(ann.char_start, ann.char_end) ?? null;
      return {
        id: ca.id,
        annotation_id: ann.id,
        color: ann.color,
        note: ann.note,
        excerpt,
        article: ann.articles,
      };
    });

  const { case_annotations, ...rest } = row;
  void case_annotations;
  return { ...rest, annotations };
}
