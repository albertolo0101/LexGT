import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requireAdmin } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";
import type { AuthedTier } from "@/lib/types";

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
