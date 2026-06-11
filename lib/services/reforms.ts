import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "@/lib/authz";
import { requireAdmin } from "@/lib/authz";
import { ActionError } from "@/lib/action-result";

function textToParagraphs(text: string): { text: string; position: number }[] {
  return text
    .split(/\n\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, position: i + 1 }));
}

// Supersedes an article with a new version: copies the row, attaches the new
// paragraphs, and marks the old row as no longer current. Shared by
// publishReform and approveReform — both create a new article version tied
// to a law_reforms row, just sourced from different inputs.
async function supersedeArticle(
  db: SupabaseClient,
  params: {
    oldArticleId: string;
    reformId: string;
    publishedAt: string;
    paragraphs: { text: string; position: number }[];
  }
): Promise<void> {
  const { data: oldArticle, error: fetchError } = await db
    .from("articles")
    .select("*")
    .eq("id", params.oldArticleId)
    .single();
  if (fetchError) throw fetchError;

  const { data: newArticle, error: insertError } = await db
    .from("articles")
    .insert({
      law_id: oldArticle.law_id,
      section_id: oldArticle.section_id,
      number: oldArticle.number,
      heading: oldArticle.heading,
      position: oldArticle.position,
      is_current: true,
      version: oldArticle.version + 1,
      version_number: (oldArticle.version_number ?? 1) + 1,
      previous_version_id: oldArticle.id,
      reform_id: params.reformId,
      effective_on: params.publishedAt,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  if (params.paragraphs.length > 0) {
    const { error: paraError } = await db
      .from("paragraphs")
      .insert(params.paragraphs.map((p) => ({ ...p, article_id: newArticle.id })));
    if (paraError) throw paraError;
  }

  const { error: updateError } = await db
    .from("articles")
    .update({ is_current: false, superseded_at: params.publishedAt })
    .eq("id", oldArticle.id);
  if (updateError) throw updateError;
}

export const PublishReformInput = z.object({
  lawId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  publishedAt: z.string(),
  affectedArticleIds: z.array(z.string()),
  newParagraphsByArticle: z.record(z.string(), z.array(z.object({ text: z.string(), position: z.number() }))),
});
export type PublishReformInput = z.infer<typeof PublishReformInput>;

export async function publishReform(
  db: SupabaseClient,
  actor: Actor,
  input: PublishReformInput
): Promise<void> {
  requireAdmin(actor);

  const { data: reform, error: reformError } = await db
    .from("law_reforms")
    .insert({
      law_id: input.lawId,
      title: input.title,
      description: input.description,
      published_at: input.publishedAt,
    })
    .select("id")
    .single();
  if (reformError) throw reformError;

  for (const oldArticleId of input.affectedArticleIds) {
    await supersedeArticle(db, {
      oldArticleId,
      reformId: reform.id,
      publishedAt: input.publishedAt,
      paragraphs: input.newParagraphsByArticle[oldArticleId] ?? [],
    });
  }
}

export const CreateReformDraftInput = z.object({
  lawId: z.string(),
  title: z.string(),
  description: z.string(),
  articles: z.array(z.object({ articleId: z.string(), newText: z.string() })),
});
export type CreateReformDraftInput = z.infer<typeof CreateReformDraftInput>;

export async function createReformDraft(
  db: SupabaseClient,
  actor: Actor,
  input: CreateReformDraftInput
): Promise<{ id: string }> {
  requireAdmin(actor);

  const { data: reform, error } = await db
    .from("law_reforms")
    .insert({
      law_id: input.lawId,
      title: input.title,
      description: input.description || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw error;

  if (input.articles.length > 0) {
    const { error: draftError } = await db.from("reform_draft_articles").insert(
      input.articles.map((a) => ({
        reform_id: reform.id,
        article_id: a.articleId,
        new_text: a.newText,
      }))
    );
    if (draftError) throw draftError;
  }

  return { id: reform.id };
}

export const ApproveReformInput = z.object({
  reformId: z.string(),
});
export type ApproveReformInput = z.infer<typeof ApproveReformInput>;

export async function approveReform(
  db: SupabaseClient,
  actor: Actor,
  input: ApproveReformInput
): Promise<void> {
  requireAdmin(actor);

  type DraftArticle = { article_id: string; new_text: string };

  const { data: reform, error: fetchError } = await db
    .from("law_reforms")
    .select("id, status, reform_draft_articles(article_id, new_text)")
    .eq("id", input.reformId)
    .single();
  if (fetchError) throw fetchError;
  if (reform.status !== "draft") throw new ActionError("CONFLICT", "Esta reforma ya fue publicada");

  const publishedAt = new Date().toISOString();
  const draftArticles = reform.reform_draft_articles as unknown as DraftArticle[];

  for (const draft of draftArticles) {
    await supersedeArticle(db, {
      oldArticleId: draft.article_id,
      reformId: input.reformId,
      publishedAt,
      paragraphs: textToParagraphs(draft.new_text),
    });
  }

  const { error: publishError } = await db
    .from("law_reforms")
    .update({ status: "published", published_at: publishedAt })
    .eq("id", input.reformId);
  if (publishError) throw publishError;
}
