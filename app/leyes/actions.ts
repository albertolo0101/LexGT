"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function saveAnnotation(data: {
  paragraph_id: string;
  article_id: string;
  char_start: number;
  char_end: number;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("annotations").insert({
    user_id: user.id,
    color: "yellow",
    ...data,
  });
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
