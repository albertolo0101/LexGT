"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserTier } from "@/lib/get-user-tier";

export async function saveAnnotation(data: {
  paragraph_id: string;
  article_id: string;
  char_start: number;
  char_end: number;
  color?: string;
  note?: string | null;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const color = data.color ?? "yellow";
  if (color !== "yellow") {
    const tier = await getUserTier(supabase);
    if (tier !== "pro") throw new Error("Pro plan required for colored highlights");
  }

  const { error } = await supabase.from("annotations").insert({
    user_id: user.id,
    paragraph_id: data.paragraph_id,
    article_id: data.article_id,
    char_start: data.char_start,
    char_end: data.char_end,
    color,
    note: data.note ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateAnnotationNote(id: string, note: string | null) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const tier = await getUserTier(supabase);
  if (tier !== "pro") throw new Error("Pro plan required for notes");

  const { error } = await supabase
    .from("annotations")
    .update({ note, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteAnnotation(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("annotations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function migrateAnnotations({
  oldArticleId,
  newArticleId,
  action,
}: {
  oldArticleId: string;
  newArticleId: string;
  action: "migrate" | "delete";
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (action === "delete") {
    const { error } = await supabase
      .from("annotations")
      .delete()
      .eq("article_id", oldArticleId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return;
  }

  // action === "migrate"
  type AnnRow = {
    paragraph_id: string;
    char_start: number;
    char_end: number;
    color: string;
    note: string | null;
    paragraphs: { text: string } | null;
  };

  const { data: annotations, error: fetchError } = await supabase
    .from("annotations")
    .select("paragraph_id, char_start, char_end, color, note, paragraphs(text)")
    .eq("article_id", oldArticleId)
    .eq("user_id", user.id);
  if (fetchError) throw new Error(fetchError.message);
  if (!annotations?.length) return;

  const { data: newParagraphs, error: paraError } = await supabase
    .from("paragraphs")
    .select("id")
    .eq("article_id", newArticleId)
    .order("position")
    .limit(1);
  if (paraError) throw new Error(paraError.message);
  if (!newParagraphs?.[0]) throw new Error("New article has no paragraphs");

  const newParagraphId = newParagraphs[0].id;

  const newAnnotations = (annotations as unknown as AnnRow[]).map((ann) => {
    const paragraphText = ann.paragraphs?.text ?? "";
    const highlightedText = paragraphText.slice(ann.char_start, ann.char_end);
    const note = `> "${highlightedText}"${ann.note ? `\n${ann.note}` : ""}`;
    return {
      user_id: user.id,
      paragraph_id: newParagraphId,
      article_id: newArticleId,
      color: ann.color,
      char_start: 0,
      char_end: 0,
      note,
    };
  });

  const { error: insertError } = await supabase
    .from("annotations")
    .insert(newAnnotations);
  if (insertError) throw new Error(insertError.message);

  const { error: deleteError } = await supabase
    .from("annotations")
    .delete()
    .eq("article_id", oldArticleId)
    .eq("user_id", user.id);
  if (deleteError) throw new Error(deleteError.message);
}

export async function markReformSeen(reformId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("reform_notifications").insert({
    user_id: user.id,
    reform_id: reformId,
    seen_at: new Date().toISOString(),
  });
}

export async function publishReform({
  lawId,
  title,
  description,
  publishedAt,
  affectedArticleIds,
  newParagraphsByArticle,
}: {
  lawId: string;
  title: string;
  description?: string;
  publishedAt: string;
  affectedArticleIds: string[];
  newParagraphsByArticle: Record<string, { text: string; position: number }[]>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: reform, error: reformError } = await supabase
    .from("law_reforms")
    .insert({ law_id: lawId, title, description, published_at: publishedAt })
    .select("id")
    .single();
  if (reformError) throw new Error(reformError.message);

  for (const oldArticleId of affectedArticleIds) {
    const { data: oldArticle, error: fetchError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", oldArticleId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const { data: newArticle, error: insertError } = await supabase
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
        previous_version_id: oldArticleId,
        reform_id: reform.id,
        effective_on: publishedAt,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    const paragraphs = newParagraphsByArticle[oldArticleId] ?? [];
    if (paragraphs.length > 0) {
      const { error: paraError } = await supabase
        .from("paragraphs")
        .insert(paragraphs.map((p) => ({ ...p, article_id: newArticle.id })));
      if (paraError) throw new Error(paraError.message);
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update({ is_current: false, superseded_at: new Date().toISOString() })
      .eq("id", oldArticleId);
    if (updateError) throw new Error(updateError.message);
  }
}
