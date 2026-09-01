import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requireUser, AuthzError } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { textChecksum } from "@/lib/anchoring";
import type { AnchorStatus } from "@/lib/types";

export const SaveAnnotationInput = z.object({
  paragraph_id: z.string(),
  article_id: z.string(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().nonnegative(),
  quote: z.string(),
  prefix: z.string().nullable().optional(),
  suffix: z.string().nullable().optional(),
  color: z.string().optional(),
  note: z.string().nullable().optional(),
});
export type SaveAnnotationInput = z.infer<typeof SaveAnnotationInput>;

export async function saveAnnotation(
  db: SupabaseClient,
  actor: Actor,
  input: SaveAnnotationInput
): Promise<{ id: string }> {
  requireUser(actor);

  const color = input.color ?? "yellow";
  if (color !== "yellow" && actor.tier !== "pro") {
    throw new AuthzError("PRO_REQUIRED", "Pro plan required for colored highlights");
  }
  if (input.note != null && actor.tier !== "pro") {
    throw new AuthzError("PRO_REQUIRED", "Esta función requiere el plan Pro.");
  }

  const { data: paragraph, error: paragraphError } = await db
    .from("paragraphs")
    .select("text")
    .eq("id", input.paragraph_id)
    .single();
  if (paragraphError) throw paragraphError;
  if (!paragraph) throw new ActionError("NOT_FOUND", "Paragraph not found");

  const checksum = await textChecksum((paragraph as { text: string }).text);

  const { data: created, error } = await db
    .from("annotations")
    .insert({
      user_id: actor.userId,
      paragraph_id: input.paragraph_id,
      article_id: input.article_id,
      char_start: input.char_start,
      char_end: input.char_end,
      color,
      note: input.note ?? null,
      quote: input.quote,
      prefix: input.prefix ?? null,
      suffix: input.suffix ?? null,
      text_checksum: checksum,
      anchor_status: "anchored",
    })
    // El cliente pinta el <mark> con este id sin re-renderizar la ley entera.
    .select("id")
    .single();
  if (error) throw error;
  return { id: (created as { id: string }).id };
}

export const ReanchorAnnotationInput = z.object({
  id: z.string(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().nonnegative(),
  text_checksum: z.string(),
  anchor_status: z.enum(["anchored", "reanchored", "orphaned"] as const satisfies readonly AnchorStatus[]),
});
export type ReanchorAnnotationInput = z.infer<typeof ReanchorAnnotationInput>;

// Lazily persists the result of a client-side resolveAnchor() call so the
// next read picks up the corrected offsets without re-scanning the text.
export async function reanchorAnnotation(
  db: SupabaseClient,
  actor: Actor,
  input: ReanchorAnnotationInput
): Promise<void> {
  if (!actor.userId) return;

  const { error } = await db
    .from("annotations")
    .update({
      char_start: input.char_start,
      char_end: input.char_end,
      text_checksum: input.text_checksum,
      anchor_status: input.anchor_status,
    })
    .eq("id", input.id)
    .eq("user_id", actor.userId);
  if (error) throw error;
}

export const UpdateAnnotationNoteInput = z.object({
  id: z.string(),
  note: z.string().nullable(),
});
export type UpdateAnnotationNoteInput = z.infer<typeof UpdateAnnotationNoteInput>;

export async function updateAnnotationNote(
  db: SupabaseClient,
  actor: Actor,
  input: UpdateAnnotationNoteInput
): Promise<void> {
  requireUser(actor);
  if (actor.tier !== "pro") throw new AuthzError("PRO_REQUIRED", "Pro plan required for notes");

  const { error } = await db
    .from("annotations")
    .update({ note: input.note, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", actor.userId);
  if (error) throw error;
}

export const DeleteAnnotationInput = z.object({
  id: z.string(),
});
export type DeleteAnnotationInput = z.infer<typeof DeleteAnnotationInput>;

export async function deleteAnnotation(
  db: SupabaseClient,
  actor: Actor,
  input: DeleteAnnotationInput
): Promise<void> {
  requireUser(actor);

  const { error } = await db
    .from("annotations")
    .delete()
    .eq("id", input.id)
    .eq("user_id", actor.userId);
  if (error) throw error;
}

export const MigrateAnnotationsInput = z.object({
  oldArticleId: z.string(),
  newArticleId: z.string(),
  action: z.enum(["migrate", "delete"]),
});
export type MigrateAnnotationsInput = z.infer<typeof MigrateAnnotationsInput>;

export async function migrateAnnotations(
  db: SupabaseClient,
  actor: Actor,
  input: MigrateAnnotationsInput
): Promise<void> {
  if (!actor.userId) return;

  if (input.action === "delete") {
    const { error } = await db
      .from("annotations")
      .delete()
      .eq("article_id", input.oldArticleId)
      .eq("user_id", actor.userId);
    if (error) throw error;
    return;
  }

  type AnnRow = {
    paragraph_id: string;
    char_start: number;
    char_end: number;
    color: string;
    note: string | null;
    paragraphs: { text: string } | null;
  };

  const { data: annotations, error: fetchError } = await db
    .from("annotations")
    .select("paragraph_id, char_start, char_end, color, note, paragraphs(text)")
    .eq("article_id", input.oldArticleId)
    .eq("user_id", actor.userId);
  if (fetchError) throw fetchError;
  if (!annotations?.length) return;

  const { data: newParagraphs, error: paraError } = await db
    .from("paragraphs")
    .select("id")
    .eq("article_id", input.newArticleId)
    .order("position")
    .limit(1);
  if (paraError) throw paraError;
  if (!newParagraphs?.[0]) throw new ActionError("NOT_FOUND", "New article has no paragraphs");

  const newParagraphId = newParagraphs[0].id;

  const newAnnotations = (annotations as unknown as AnnRow[]).map((ann) => {
    const paragraphText = ann.paragraphs?.text ?? "";
    const highlightedText = paragraphText.slice(ann.char_start, ann.char_end);
    const note = `> "${highlightedText}"${ann.note ? `\n${ann.note}` : ""}`;
    return {
      user_id: actor.userId,
      paragraph_id: newParagraphId,
      article_id: input.newArticleId,
      color: ann.color,
      char_start: 0,
      char_end: 0,
      note,
    };
  });

  const { error: insertError } = await db.from("annotations").insert(newAnnotations);
  if (insertError) throw insertError;

  const { error: deleteError } = await db
    .from("annotations")
    .delete()
    .eq("article_id", input.oldArticleId)
    .eq("user_id", actor.userId);
  if (deleteError) throw deleteError;
}

export const MarkReformSeenInput = z.object({
  reformId: z.string(),
});
export type MarkReformSeenInput = z.infer<typeof MarkReformSeenInput>;

export async function markReformSeen(
  db: SupabaseClient,
  actor: Actor,
  input: MarkReformSeenInput
): Promise<void> {
  if (!actor.userId) return;

  await db.from("reform_notifications").insert({
    user_id: actor.userId,
    reform_id: input.reformId,
    seen_at: new Date().toISOString(),
  });
}
