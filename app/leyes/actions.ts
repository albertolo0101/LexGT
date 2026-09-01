"use server"

import { revalidateTag } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { LAW_CONTENT_TAG } from "@/lib/cache/law-content";
import { getActor } from "@/lib/authz";
import { runAction, type ActionResult } from "@/lib/action-result";
import * as annotationsService from "@/lib/services/annotations";
import * as reformsService from "@/lib/services/reforms";

export async function saveAnnotation(data: {
  paragraph_id: string;
  article_id: string;
  char_start: number;
  char_end: number;
  quote: string;
  prefix?: string | null;
  suffix?: string | null;
  color?: string;
  note?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.SaveAnnotationInput.parse(data);
    return annotationsService.saveAnnotation(supabase, actor, input);
  });
}

export async function reanchorAnnotation(data: {
  id: string;
  char_start: number;
  char_end: number;
  text_checksum: string;
  anchor_status: "anchored" | "reanchored" | "orphaned";
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.ReanchorAnnotationInput.parse(data);
    await annotationsService.reanchorAnnotation(supabase, actor, input);
  });
}

export async function updateAnnotationNote(id: string, note: string | null): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.UpdateAnnotationNoteInput.parse({ id, note });
    await annotationsService.updateAnnotationNote(supabase, actor, input);
  });
}

export async function deleteAnnotation(id: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.DeleteAnnotationInput.parse({ id });
    await annotationsService.deleteAnnotation(supabase, actor, input);
  });
}

export async function migrateAnnotations(data: {
  oldArticleId: string;
  newArticleId: string;
  action: "migrate" | "delete";
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.MigrateAnnotationsInput.parse(data);
    await annotationsService.migrateAnnotations(supabase, actor, input);
  });
}

export async function markReformSeen(reformId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = annotationsService.MarkReformSeenInput.parse({ reformId });
    await annotationsService.markReformSeen(supabase, actor, input);
  });
}

export async function publishReform(data: {
  lawId: string;
  title: string;
  description?: string;
  publishedAt: string;
  affectedArticleIds: string[];
  newParagraphsByArticle: Record<string, { text: string; position: number }[]>;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = reformsService.PublishReformInput.parse(data);
    await reformsService.publishReform(supabase, actor, input);
    revalidateTag(LAW_CONTENT_TAG);
  });
}
