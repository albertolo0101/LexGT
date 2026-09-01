import 'server-only'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase-public'
import { getLawContent, type LawContent } from '@/lib/services/queries/reading'

export const LAW_CONTENT_TAG = 'law-content'

// Subir esta versión cuando cambie la FORMA de `LawContent` (campos nuevos,
// rótulos calculados distinto, orden). El caché sobrevive a los deploys, así
// que sin esto un cambio de render se queda invisible hasta que venza la
// ventana — pasó al cambiar el rótulo de las secciones.
const CACHE_VERSION = 'v2'

export function lawContentTag(slug: string) {
  return `law-content:${slug}`
}

/**
 * Contenido de una ley, cacheado.
 *
 * Traer el Código Civil completo son 6 llamadas paginadas a PostgREST y ~540 KB
 * de texto: medido, ~6 s desde una laptop y el costo dominante de la vista de
 * lectura. Es contenido público e idéntico para todos los usuarios, así que se
 * cachea una vez y se comparte; la capa por usuario (highlights, notas,
 * reformas) siempre se consulta fresca.
 *
 * Invalidación: las Server Actions que cambian texto (publicar/aprobar reforma,
 * corregir un párrafo) llaman `revalidateTag(LAW_CONTENT_TAG)` — tienen el id
 * de la ley pero no el slug, y los cambios de contenido son raros, así que
 * invalidar todo sale más barato que resolver el slug. Cargas del extractor
 * hechas fuera de la app entran cuando vence la ventana.
 */
export const getCachedLawContent = (slug: string): Promise<LawContent | null> =>
  unstable_cache(
    async () => getLawContent(createPublicClient(), slug),
    [LAW_CONTENT_TAG, CACHE_VERSION, slug],
    { tags: [LAW_CONTENT_TAG, lawContentTag(slug)], revalidate: 600 }
  )()
