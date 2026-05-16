"use server"

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getUserTier } from "@/lib/get-user-tier";
import type { Case } from "@/lib/types";

async function requirePro() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const tier = await getUserTier(supabase);
  if (tier !== "pro") throw new Error("Pro plan required for casos");
  return { supabase, user };
}

export async function createCase(data: {
  title: string;
  description?: string;
  color?: string;
}): Promise<Case> {
  const { supabase, user } = await requirePro();

  const { data: newCase, error } = await supabase
    .from("cases")
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description ?? null,
      color: data.color ?? "gray",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/casos");
  return newCase as Case;
}

export async function deleteCase(caseId: string) {
  const { supabase, user } = await requirePro();

  const { error } = await supabase
    .from("cases")
    .delete()
    .eq("id", caseId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  redirect("/casos");
}

export async function addAnnotationToCase({
  caseId,
  annotationId,
}: {
  caseId: string;
  annotationId: string;
}) {
  const { supabase } = await requirePro();

  const { error } = await supabase
    .from("case_annotations")
    .insert({ case_id: caseId, annotation_id: annotationId });

  // unique constraint violation means it's already there — not an error
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);

  revalidatePath("/casos");
}

export async function removeAnnotationFromCase(caseAnnotationId: string) {
  const { supabase } = await requirePro();

  const { error } = await supabase
    .from("case_annotations")
    .delete()
    .eq("id", caseAnnotationId);
  if (error) throw new Error(error.message);

  revalidatePath("/casos");
}
