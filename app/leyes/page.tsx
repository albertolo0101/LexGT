import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Metadata } from "next"
import { getActor } from "@/lib/authz"
import { getLawCatalog } from "@/lib/services/queries/laws"
import LeyesIndexClient from "./LeyesIndexClient"

export const metadata: Metadata = {
  title: "Leyes — LexGT",
  description: "Legislación de Guatemala",
}

export default async function LeyesPage() {
  const supabase = await createServerSupabaseClient()
  const actor = await getActor(supabase)

  const { laws, reformsByLaw, articleCounts, articlePairsByReform, totalPending } =
    await getLawCatalog(supabase, actor)

  return (
    <LeyesIndexClient
      laws={laws}
      reformsByLaw={reformsByLaw}
      articleCounts={articleCounts}
      articlePairsByReform={articlePairsByReform}
      tier={actor.tier}
      totalPending={totalPending}
    />
  )
}
