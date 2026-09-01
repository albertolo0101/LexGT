import { redirect } from "next/navigation";
import { sectionAnchor } from "@/lib/anchors";

// La vista de lectura pasó de "una sección por página" a "la ley completa en
// scroll continuo". Esta ruta sobrevive solo para enlaces viejos (marcadores,
// resultados de búsqueda cacheados) y los manda al ancla correspondiente.
export default async function LegacySectionRedirect({
  params,
}: {
  params: Promise<{ slug: string; section_id: string }>;
}) {
  const { slug, section_id } = await params;
  redirect(`/leyes/${slug}#${sectionAnchor(section_id)}`);
}
