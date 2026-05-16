"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import type { Tier } from "@/lib/types"

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== "admin") {
    throw new Error("No autorizado")
  }
  return { supabase, user }
}

function textToParagraphs(text: string): { text: string; position: number }[] {
  return text
    .split(/\n\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, position: i + 1 }))
}

export async function findArticle(
  lawId: string,
  number: string
): Promise<{ articleId: string; currentText: string } | null> {
  const { supabase } = await requireAdmin()

  const { data: article } = await supabase
    .from("articles")
    .select("id, paragraphs(text, position)")
    .eq("law_id", lawId)
    .eq("number", number)
    .eq("is_current", true)
    .single()

  if (!article) return null

  type Para = { text: string; position: number }
  const sorted = (article.paragraphs as unknown as Para[])
    .slice()
    .sort((a, b) => a.position - b.position)

  return {
    articleId: article.id,
    currentText: sorted.map((p) => p.text).join("\n\n"),
  }
}

export async function createReformDraft(data: {
  lawId: string
  title: string
  description: string
  articles: { articleId: string; newText: string }[]
}): Promise<{ id: string }> {
  const { supabase } = await requireAdmin()

  const { data: reform, error } = await supabase
    .from("law_reforms")
    .insert({
      law_id: data.lawId,
      title: data.title,
      description: data.description || null,
      status: "draft",
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)

  if (data.articles.length > 0) {
    const { error: draftError } = await supabase.from("reform_draft_articles").insert(
      data.articles.map((a) => ({
        reform_id: reform.id,
        article_id: a.articleId,
        new_text: a.newText,
      }))
    )
    if (draftError) throw new Error(draftError.message)
  }

  return { id: reform.id }
}

export async function approveReform(reformId: string) {
  const { supabase } = await requireAdmin()

  type DraftArticle = { article_id: string; new_text: string }

  const { data: reform, error: fetchError } = await supabase
    .from("law_reforms")
    .select("id, status, reform_draft_articles(article_id, new_text)")
    .eq("id", reformId)
    .single()
  if (fetchError) throw new Error(fetchError.message)
  if (reform.status !== "draft") throw new Error("Esta reforma ya fue publicada")

  const publishedAt = new Date().toISOString()
  const draftArticles = reform.reform_draft_articles as unknown as DraftArticle[]

  for (const draft of draftArticles) {
    const { data: oldArticle, error: artError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", draft.article_id)
      .single()
    if (artError) throw new Error(artError.message)

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
        previous_version_id: oldArticle.id,
        reform_id: reformId,
        effective_on: publishedAt,
      })
      .select("id")
      .single()
    if (insertError) throw new Error(insertError.message)

    const paragraphs = textToParagraphs(draft.new_text)
    if (paragraphs.length > 0) {
      const { error: paraError } = await supabase
        .from("paragraphs")
        .insert(paragraphs.map((p) => ({ ...p, article_id: newArticle.id })))
      if (paraError) throw new Error(paraError.message)
    }

    const { error: updateError } = await supabase
      .from("articles")
      .update({ is_current: false, superseded_at: publishedAt })
      .eq("id", oldArticle.id)
    if (updateError) throw new Error(updateError.message)
  }

  const { error: publishError } = await supabase
    .from("law_reforms")
    .update({ status: "published", published_at: publishedAt })
    .eq("id", reformId)
  if (publishError) throw new Error(publishError.message)

  redirect("/admin")
}

export async function setUserTier({
  email,
  tier,
  tierExpiresAt,
  tierSource,
}: {
  email: string
  tier: Tier
  tierExpiresAt: string | null
  tierSource: string
}) {
  const { supabase } = await requireAdmin()

  const { data: userId, error: rpcError } = await supabase.rpc(
    "admin_find_user_by_email",
    { email_input: email }
  )
  if (rpcError) throw new Error(rpcError.message)
  if (!userId) throw new Error("Usuario no encontrado")

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      tier,
      tier_expires_at: tierExpiresAt || null,
      tier_source: tierSource,
    },
    { onConflict: "user_id" }
  )
  if (error) throw new Error(error.message)
}
