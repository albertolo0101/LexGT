import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requirePro } from "@/lib/authz";
import type { Case } from "@/lib/types";

export const CreateCaseInput = z.object({
  title: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInput>;

export async function createCase(
  db: SupabaseClient,
  actor: Actor,
  input: CreateCaseInput
): Promise<Case> {
  requirePro(actor);

  const { data: newCase, error } = await db
    .from("cases")
    .insert({
      user_id: actor.userId,
      title: input.title,
      description: input.description ?? null,
      color: input.color ?? "gray",
    })
    .select("*")
    .single();
  if (error) throw error;

  return newCase as Case;
}

export const DeleteCaseInput = z.object({
  caseId: z.string(),
});
export type DeleteCaseInput = z.infer<typeof DeleteCaseInput>;

export async function deleteCase(
  db: SupabaseClient,
  actor: Actor,
  input: DeleteCaseInput
): Promise<void> {
  requirePro(actor);

  const { error } = await db
    .from("cases")
    .delete()
    .eq("id", input.caseId)
    .eq("user_id", actor.userId);
  if (error) throw error;
}

export const AddAnnotationToCaseInput = z.object({
  caseId: z.string(),
  annotationId: z.string(),
});
export type AddAnnotationToCaseInput = z.infer<typeof AddAnnotationToCaseInput>;

export async function addAnnotationToCase(
  db: SupabaseClient,
  actor: Actor,
  input: AddAnnotationToCaseInput
): Promise<void> {
  requirePro(actor);

  const { error } = await db
    .from("case_annotations")
    .insert({ case_id: input.caseId, annotation_id: input.annotationId });

  // unique constraint violation means it's already there — not an error
  if (error && !error.message.includes("duplicate")) throw error;
}

export const RemoveAnnotationFromCaseInput = z.object({
  caseAnnotationId: z.string(),
});
export type RemoveAnnotationFromCaseInput = z.infer<typeof RemoveAnnotationFromCaseInput>;

export async function removeAnnotationFromCase(
  db: SupabaseClient,
  actor: Actor,
  input: RemoveAnnotationFromCaseInput
): Promise<void> {
  requirePro(actor);

  const { error } = await db
    .from("case_annotations")
    .delete()
    .eq("id", input.caseAnnotationId);
  if (error) throw error;
}
