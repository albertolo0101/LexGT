import { createServerSupabaseClient } from "@/lib/supabase-server"
import NewReformForm from "./NewReformForm"

export default async function NuevaReformaPage() {
  const supabase = await createServerSupabaseClient()
  const { data: laws } = await supabase
    .from("laws")
    .select("id, short_name")
    .eq("is_active", true)
    .order("short_name")

  return <NewReformForm laws={laws ?? []} />
}
