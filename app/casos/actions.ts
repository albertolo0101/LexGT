"use server"

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor, requirePro } from "@/lib/authz";
import { runAction, type ActionResult } from "@/lib/action-result";
import type { Case } from "@/lib/types";

async function requireProActor() {
  const supabase = await createServerSupabaseClient();
  const actor = await getActor(supabase);
  requirePro(actor);
  return { supabase, userId: actor.userId };
}

export async function createCase(data: {
  title: string;
  description?: string;
  color?: string;
}): Promise<ActionResult<Case>> {
  return runAction(async () => {
    const { supabase, userId } = await requireProActor();

    const { data: newCase, error } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        color: data.color ?? "gray",
      })
      .select("*")
      .single();
    if (error) throw error;

    revalidatePath("/casos");
    return newCase as Case;
  });
}

export async function deleteCase(caseId: string): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const { supabase, userId } = await requireProActor();

    const { error } = await supabase
      .from("cases")
      .delete()
      .eq("id", caseId)
      .eq("user_id", userId);
    if (error) throw error;
  });

  if (result.ok) redirect("/casos");
  return result;
}

export async function addAnnotationToCase({
  caseId,
  annotationId,
}: {
  caseId: string;
  annotationId: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const { supabase } = await requireProActor();

    const { error } = await supabase
      .from("case_annotations")
      .insert({ case_id: caseId, annotation_id: annotationId });

    // unique constraint violation means it's already there — not an error
    if (error && !error.message.includes("duplicate")) throw error;

    revalidatePath("/casos");
  });
}

export async function removeAnnotationFromCase(caseAnnotationId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const { supabase } = await requireProActor();

    const { error } = await supabase
      .from("case_annotations")
      .delete()
      .eq("id", caseAnnotationId);
    if (error) throw error;

    revalidatePath("/casos");
  });
}
