import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requireAdmin } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import { ANCHOR_CONTEXT_LENGTH, resolveAnchor, textChecksum } from "@/lib/anchoring";
import type { AnchorStatus, AuthedTier } from "@/lib/types";

export const FindArticleInput = z.object({
  lawId: z.string(),
  number: z.string(),
});
export type FindArticleInput = z.infer<typeof FindArticleInput>;

export async function findArticle(
  db: SupabaseClient,
  actor: Actor,
  input: FindArticleInput
): Promise<{ articleId: string; currentText: string } | null> {
  requireAdmin(actor);

  const { data: article } = await db
    .from("articles")
    .select("id, paragraphs(text, position)")
    .eq("law_id", input.lawId)
    .eq("number", input.number)
    .eq("is_current", true)
    .single();

  if (!article) return null;

  type Para = { text: string; position: number };
  const sorted = (article.paragraphs as unknown as Para[])
    .slice()
    .sort((a, b) => a.position - b.position);

  return {
    articleId: article.id,
    currentText: sorted.map((p) => p.text).join("\n\n"),
  };
}

export const CorrectParagraphTextInput = z.object({
  paragraphId: z.string(),
  newText: z.string(),
});
export type CorrectParagraphTextInput = z.infer<typeof CorrectParagraphTextInput>;

type AnchoredAnnotationRow = {
  id: string;
  char_start: number;
  char_end: number;
  quote: string | null;
  prefix: string | null;
  suffix: string | null;
  text_checksum: string | null;
  anchor_status: AnchorStatus;
};

// Typo/correction path for paragraphs.text — distinct from reforms. Re-anchors
// every annotation on the paragraph against the corrected text so highlights
// don't silently orphan when an admin or the extractor fixes a typo.
export async function correctParagraphText(
  db: SupabaseClient,
  actor: Actor,
  input: CorrectParagraphTextInput
): Promise<{ reanchored: number; orphaned: number }> {
  requireAdmin(actor);

  const { data: annotationsRaw, error: fetchError } = await db
    .from("annotations")
    .select("id, char_start, char_end, quote, prefix, suffix, text_checksum, anchor_status")
    .eq("paragraph_id", input.paragraphId);
  if (fetchError) throw fetchError;

  const { error: updateError } = await db
    .from("paragraphs")
    .update({ text: input.newText })
    .eq("id", input.paragraphId);
  if (updateError) throw updateError;

  const checksum = await textChecksum(input.newText);

  let reanchored = 0;
  let orphaned = 0;

  for (const ann of (annotationsRaw ?? []) as AnchoredAnnotationRow[]) {
    const resolved = await resolveAnchor(input.newText, ann);
    if (resolved.status === "reanchored") reanchored++;
    if (resolved.status === "orphaned") orphaned++;

    const updates: Record<string, unknown> = {
      char_start: resolved.start,
      char_end: resolved.end,
      text_checksum: checksum,
      anchor_status: resolved.status,
    };
    if (resolved.status === "reanchored") {
      updates.quote = input.newText.slice(resolved.start, resolved.end);
      updates.prefix = input.newText.slice(Math.max(0, resolved.start - ANCHOR_CONTEXT_LENGTH), resolved.start);
      updates.suffix = input.newText.slice(resolved.end, resolved.end + ANCHOR_CONTEXT_LENGTH);
    }

    const { error } = await db.from("annotations").update(updates).eq("id", ann.id);
    if (error) throw error;
  }

  return { reanchored, orphaned };
}

export const SetUserTierInput = z.object({
  email: z.string().email(),
  tier: z.enum(["free", "pro"]),
  tierExpiresAt: z.string().nullable(),
  tierSource: z.string(),
});
export type SetUserTierInput = z.infer<typeof SetUserTierInput> & { tier: AuthedTier };

export async function setUserTier(
  db: SupabaseClient,
  actor: Actor,
  input: SetUserTierInput
): Promise<void> {
  requireAdmin(actor);

  const { data: userId, error: rpcError } = await db.rpc("admin_find_user_by_email", {
    email_input: input.email,
  });
  if (rpcError) throw rpcError;
  if (!userId) throw new ActionError("NOT_FOUND", "Usuario no encontrado");

  const { error } = await db.from("user_profiles").upsert(
    {
      user_id: userId,
      tier: input.tier,
      tier_expires_at: input.tierExpiresAt || null,
      tier_source: input.tierSource,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
