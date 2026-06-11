"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { getActor, requireAdmin } from "@/lib/authz"
import { runAction, ActionError, type ActionResult } from "@/lib/action-result"
import type { AuthedTier } from "@/lib/types"

async function requireAdminClient() {
  const supabase = await createServerSupabaseClient()
  const actor = await getActor(supabase)
  requireAdmin(actor)
  return { supabase }
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
): Promise<ActionResult<{ articleId: string; currentText: string } | null>> {
  return runAction(async () => {
    const { supabase } = await requireAdminClient()

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
  })
}

export async function createReformDraft(data: {
  lawId: string
  title: string
  description: string
  articles: { articleId: string; newText: string }[]
}): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { supabase } = await requireAdminClient()

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
    if (error) throw error

    if (data.articles.length > 0) {
      const { error: draftError } = await supabase.from("reform_draft_articles").insert(
        data.articles.map((a) => ({
          reform_id: reform.id,
          article_id: a.articleId,
          new_text: a.newText,
        }))
      )
      if (draftError) throw draftError
    }

    return { id: reform.id }
  })
}

export async function approveReform(reformId: string): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const { supabase } = await requireAdminClient()

    type DraftArticle = { article_id: string; new_text: string }

    const { data: reform, error: fetchError } = await supabase
      .from("law_reforms")
      .select("id, status, reform_draft_articles(article_id, new_text)")
      .eq("id", reformId)
      .single()
    if (fetchError) throw fetchError
    if (reform.status !== "draft") throw new ActionError("CONFLICT", "Esta reforma ya fue publicada")

    const publishedAt = new Date().toISOString()
    const draftArticles = reform.reform_draft_articles as unknown as DraftArticle[]

    for (const draft of draftArticles) {
      const { data: oldArticle, error: artError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", draft.article_id)
        .single()
      if (artError) throw artError

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
      if (insertError) throw insertError

      const paragraphs = textToParagraphs(draft.new_text)
      if (paragraphs.length > 0) {
        const { error: paraError } = await supabase
          .from("paragraphs")
          .insert(paragraphs.map((p) => ({ ...p, article_id: newArticle.id })))
        if (paraError) throw paraError
      }

      const { error: updateError } = await supabase
        .from("articles")
        .update({ is_current: false, superseded_at: publishedAt })
        .eq("id", oldArticle.id)
      if (updateError) throw updateError
    }

    const { error: publishError } = await supabase
      .from("law_reforms")
      .update({ status: "published", published_at: publishedAt })
      .eq("id", reformId)
    if (publishError) throw publishError
  })

  if (result.ok) redirect("/admin")
  return result
}

export async function setUserTier({
  email,
  tier,
  tierExpiresAt,
  tierSource,
}: {
  email: string
  tier: AuthedTier
  tierExpiresAt: string | null
  tierSource: string
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const { supabase } = await requireAdminClient()

    const { data: userId, error: rpcError } = await supabase.rpc(
      "admin_find_user_by_email",
      { email_input: email }
    )
    if (rpcError) throw rpcError
    if (!userId) throw new ActionError("NOT_FOUND", "Usuario no encontrado")

    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        tier,
        tier_expires_at: tierExpiresAt || null,
        tier_source: tierSource,
      },
      { onConflict: "user_id" }
    )
    if (error) throw error
  })
}
