"use server"

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getActor } from "@/lib/authz";
import { runAction, type ActionResult } from "@/lib/action-result";
import * as casesService from "@/lib/services/cases";
import type { Case } from "@/lib/types";

export async function createCase(data: {
  title: string;
  description?: string;
  color?: string;
}): Promise<ActionResult<Case>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = casesService.CreateCaseInput.parse(data);
    const newCase = await casesService.createCase(supabase, actor, input);

    revalidatePath("/casos");
    return newCase;
  });
}

export async function deleteCase(caseId: string): Promise<ActionResult<void>> {
  const result = await runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = casesService.DeleteCaseInput.parse({ caseId });
    await casesService.deleteCase(supabase, actor, input);
  });

  if (result.ok) redirect("/casos");
  return result;
}

export async function addAnnotationToCase(data: {
  caseId: string;
  annotationId: string;
}): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = casesService.AddAnnotationToCaseInput.parse(data);
    await casesService.addAnnotationToCase(supabase, actor, input);

    revalidatePath("/casos");
  });
}

export async function removeAnnotationFromCase(caseAnnotationId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const supabase = await createServerSupabaseClient();
    const actor = await getActor(supabase);
    const input = casesService.RemoveAnnotationFromCaseInput.parse({ caseAnnotationId });
    await casesService.removeAnnotationFromCase(supabase, actor, input);

    revalidatePath("/casos");
  });
}
