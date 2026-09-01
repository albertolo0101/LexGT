"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { revalidateTag } from "next/cache"
import { LAW_CONTENT_TAG } from "@/lib/cache/law-content"
import { getActor } from "@/lib/authz"
import { runAction, type ActionResult } from "@/lib/action-result"
import * as adminService from "@/lib/services/admin"
import * as reformsService from "@/lib/services/reforms"
import type { AuthedTier } from "@/lib/types"

export async function findArticle(
  lawId: string,
  number: string
): Promise<ActionResult<{ articleId: string; currentText: string } | null>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = adminService.FindArticleInput.parse({ lawId, number })
    return adminService.findArticle(supabase, actor, input)
  })
}

export async function createReformDraft(data: {
  lawId: string
  title: string
  description: string
  articles: { articleId: string; newText: string }[]
}): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = reformsService.CreateReformDraftInput.parse(data)
    return reformsService.createReformDraft(supabase, actor, input)
  })
}

export async function approveReform(reformId: string): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = reformsService.ApproveReformInput.parse({ reformId })
    await reformsService.approveReform(supabase, actor, input)
    revalidateTag(LAW_CONTENT_TAG)
  })

  if (result.ok) redirect("/admin")
  return result
}

export async function correctParagraphText(data: {
  paragraphId: string
  newText: string
}): Promise<ActionResult<{ reanchored: number; orphaned: number }>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = adminService.CorrectParagraphTextInput.parse(data)
    const result = await adminService.correctParagraphText(supabase, actor, input)
    revalidateTag(LAW_CONTENT_TAG)
    return result
  })
}

export async function setUserTier(data: {
  email: string
  tier: AuthedTier
  tierExpiresAt: string | null
  tierSource: string
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient()
    const actor = await getActor(supabase)
    const input = adminService.SetUserTierInput.parse(data)
    await adminService.setUserTier(supabase, actor, input)
  })
}
