import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import { getPendingReforms } from '@/lib/get-pending-reforms'
import { resolveAnchor, textChecksum } from '@/lib/anchoring'
import { articleAnchor, sectionAnchor } from '@/lib/anchors'
import { sectionDisplay } from '@/lib/section-kind'
import type { Annotation, Law, LawReform } from '@/lib/types'
import type { NoteItem, OrphanedAnnotation } from '@/app/leyes/[slug]/types'

// PostgREST corta cualquier respuesta en 1,000 filas (`db.max_rows`). El Código
// Civil tiene 1,996 artículos y 2,894 párrafos, así que toda lectura a escala de
// ley DEBE paginarse o devuelve una ley truncada en silencio.
const PAGE_SIZE = 1000

async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }
}

// Metadata mínima para <title>.
export async function getLawMeta(db: SupabaseClient, slug: string): Promise<{ shortName: string } | null> {
  const { data } = await db.from('laws').select('short_name').eq('slug', slug).single()
  return data ? { shortName: data.short_name as string } : null
}

type SectionRow = {
  id: string
  parent_id: string | null
  kind: string
  number: string | null
  heading: string
  position: number
}

type ArticleRow = {
  id: string
  number: string
  heading: string | null
  position: number
  section_id: string | null
}

type ParagraphRow = { id: string; article_id: string; position: number; text: string }

type AnnotationNoteRow = {
  id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  note: string | null
  char_start: number
  char_end: number
  paragraphs: { text: string } | null
  articles: { number: string; heading: string | null }
}

export type DocParagraph = { id: string; text: string }

export type DocArticle = {
  id: string
  number: string
  heading: string | null
  anchor: string
  paragraphs: DocParagraph[]
}

export type DocNode =
  | { kind: 'section'; id: string; anchor: string; label: string; heading: string; depth: number }
  | { kind: 'article'; article: DocArticle }

export type TocEntry = { id: string; anchor: string; label: string; heading: string; depth: number }

/** Contenido público de una ley: idéntico para todos, cacheable. */
export type LawContent = {
  law: Law
  nodes: DocNode[]
  toc: TocEntry[]
  articleCount: number
}

/** Capa por usuario: highlights, notas y reformas. Nunca cacheable. */
export type LawUserLayer = {
  annotationsByParagraph: Record<string, Annotation[]>
  notes: NoteItem[]
  orphanedAnnotations: OrphanedAnnotation[]
  reforms: LawReform[]
  hasUnseenReform: boolean
  isAuthenticated: boolean
}

// El orden de lectura sale de `articles.position` (numeración global de la ley,
// única y confiable) y NO de `sections.position`, que en 7 leyes tiene
// colisiones conocidas del extractor (ver docs/ROADMAP.md §Datos). Los
// encabezados de sección se emiten cuando el artículo en curso cambia de rama
// del árbol, así que el índice queda siempre en el mismo orden que el documento.
function buildDocument(
  sections: SectionRow[],
  articles: ArticleRow[],
  paragraphsByArticle: Map<string, DocParagraph[]>
) {
  const sectionById = new Map(sections.map((s) => [s.id, s]))
  const nodes: DocNode[] = []
  const toc: TocEntry[] = []
  const emitted = new Set<string>()

  for (const article of articles) {
    const chain: SectionRow[] = []
    let cursor = article.section_id ? sectionById.get(article.section_id) : undefined
    const guard = new Set<string>()
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id)
      chain.unshift(cursor)
      cursor = cursor.parent_id ? sectionById.get(cursor.parent_id) : undefined
    }

    chain.forEach((section, depth) => {
      if (emitted.has(section.id)) return
      emitted.add(section.id)
      const { label, title } = sectionDisplay(section)
      const entry = { id: section.id, anchor: sectionAnchor(section.id), label, heading: title, depth }
      nodes.push({ kind: 'section', ...entry })
      toc.push(entry)
    })

    nodes.push({
      kind: 'article',
      article: {
        id: article.id,
        number: article.number,
        heading: article.heading,
        anchor: articleAnchor(article.number),
        paragraphs: paragraphsByArticle.get(article.id) ?? [],
      },
    })
  }

  return { nodes, toc }
}

/**
 * Documento completo de una ley: secciones, artículos y párrafos en orden de
 * lectura. No depende del usuario, así que se sirve cacheado desde
 * `lib/cache/law-content.ts` — esta función es la que hace el trabajo caro
 * (hasta 6 llamadas paginadas para el Código Civil).
 */
export async function getLawContent(db: SupabaseClient, slug: string): Promise<LawContent | null> {
  const { data: lawRow } = await db.from('laws').select('*').eq('slug', slug).single()
  const law = lawRow as Law | null
  if (!law) return null

  const [sections, articles, paragraphs] = await Promise.all([
    fetchAllRows<SectionRow>((from, to) =>
      db
        .from('sections')
        .select('id, parent_id, kind, number, heading, position')
        .eq('law_id', law.id)
        .order('position')
        .range(from, to)
    ),
    fetchAllRows<ArticleRow>((from, to) =>
      db
        .from('articles')
        .select('id, number, heading, position, section_id')
        .eq('law_id', law.id)
        .eq('is_current', true)
        .order('position')
        .range(from, to)
    ),
    fetchAllRows<ParagraphRow>((from, to) =>
      db
        .from('paragraphs')
        .select('id, article_id, position, text, articles!inner(law_id, is_current)')
        .eq('articles.law_id', law.id)
        .eq('articles.is_current', true)
        .order('article_id')
        .order('position')
        .range(from, to)
    ),
  ])

  const paragraphsByArticle = new Map<string, DocParagraph[]>()
  for (const p of paragraphs) {
    const list = paragraphsByArticle.get(p.article_id)
    if (list) list.push({ id: p.id, text: p.text })
    else paragraphsByArticle.set(p.article_id, [{ id: p.id, text: p.text }])
  }

  const { nodes, toc } = buildDocument(sections, articles, paragraphsByArticle)

  return { law, nodes, toc, articleCount: articles.length }
}

/**
 * Capa de usuario sobre un `LawContent` ya resuelto: highlights re-anclados
 * contra el texto vigente, notas, anotaciones huérfanas y reformas.
 */
export async function getLawUserLayer(
  db: SupabaseClient,
  actor: Actor,
  content: LawContent
): Promise<LawUserLayer> {
  const { law, nodes } = content

  const paragraphTextById = new Map<string, string>()
  const articleByParagraphId = new Map<string, DocArticle>()
  for (const node of nodes) {
    if (node.kind !== 'article') continue
    for (const p of node.article.paragraphs) {
      paragraphTextById.set(p.id, p.text)
      articleByParagraphId.set(p.id, node.article)
    }
  }

  const [{ data: reformsRaw }, { data: notesRaw }, { reformsByLaw }, rawAnnotations] = await Promise.all([
    db.from('law_reforms').select('*').eq('law_id', law.id).order('published_at', { ascending: false }),
    actor.userId
      ? db
          .from('annotations')
          .select(
            'id, color, note, char_start, char_end, paragraph_id, article_id, paragraphs(text), articles!inner(number, heading, law_id, is_current)'
          )
          .eq('user_id', actor.userId)
          .eq('articles.law_id', law.id)
          .eq('articles.is_current', true)
          .not('note', 'is', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    getPendingReforms(db, actor.tier, actor.userId),
    actor.userId
      ? fetchAllRows<Annotation & { articles?: unknown }>((from, to) =>
          db
            .from('annotations')
            .select('*, articles!inner(law_id, is_current)')
            .eq('articles.law_id', law.id)
            .eq('articles.is_current', true)
            .order('created_at')
            .range(from, to)
        )
      : Promise.resolve([] as (Annotation & { articles?: unknown })[]),
  ])

  const orphanedAnnotations: OrphanedAnnotation[] = []
  const reanchorUpdates: Promise<unknown>[] = []
  const annotationsByParagraph: Record<string, Annotation[]> = {}
  const checksumByParagraph = new Map<string, Promise<string>>()

  for (const raw of rawAnnotations) {
    // `articles` viene del join que filtra por ley; no se manda al cliente.
    const { articles, ...ann } = raw
    void articles
    const paragraphText = paragraphTextById.get(ann.paragraph_id)
    if (paragraphText === undefined) continue

    const resolved = await resolveAnchor(paragraphText, ann)

    if (
      resolved.status !== ann.anchor_status ||
      resolved.start !== ann.char_start ||
      resolved.end !== ann.char_end
    ) {
      let checksumPromise = checksumByParagraph.get(ann.paragraph_id)
      if (!checksumPromise) {
        checksumPromise = textChecksum(paragraphText)
        checksumByParagraph.set(ann.paragraph_id, checksumPromise)
      }
      reanchorUpdates.push(
        checksumPromise.then((checksum) =>
          db
            .from('annotations')
            .update({
              char_start: resolved.start,
              char_end: resolved.end,
              text_checksum: checksum,
              anchor_status: resolved.status,
            })
            .eq('id', ann.id)
        )
      )
    }

    if (resolved.status === 'orphaned') {
      const article = articleByParagraphId.get(ann.paragraph_id)
      orphanedAnnotations.push({
        id: ann.id,
        color: ann.color,
        note: ann.note,
        quote: ann.quote ?? '',
        articleNumber: article?.number ?? '',
        articleHeading: article?.heading ?? null,
      })
      continue
    }

    ;(annotationsByParagraph[ann.paragraph_id] ??= []).push({
      ...ann,
      char_start: resolved.start,
      char_end: resolved.end,
      anchor_status: resolved.status,
    })
  }

  if (reanchorUpdates.length > 0) await Promise.allSettled(reanchorUpdates)

  const notes: NoteItem[] = (notesRaw ?? []).map((raw) => {
    const row = raw as unknown as AnnotationNoteRow
    const text = row.paragraphs?.text ?? ''
    return {
      id: row.id,
      color: row.color,
      note: row.note ?? '',
      quote: text.slice(row.char_start, row.char_end),
      articleNumber: row.articles.number,
      articleHeading: row.articles.heading,
    }
  })

  return {
    annotationsByParagraph,
    notes,
    orphanedAnnotations,
    reforms: (reformsRaw ?? []) as LawReform[],
    hasUnseenReform: reformsByLaw.has(law.id),
    isAuthenticated: !!actor.userId,
  }
}
