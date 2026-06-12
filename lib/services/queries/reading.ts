import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Actor } from '@/lib/authz'
import { getPendingReforms } from '@/lib/get-pending-reforms'
import { resolveAnchor, textChecksum } from '@/lib/anchoring'
import type {
  Annotation,
  Article,
  ArticleWithParagraphs,
  Law,
  LawReform,
  Section,
  SectionNode,
} from '@/lib/types'
import type { NoteItem, OrphanedAnnotation, SiblingSection } from '@/app/leyes/[slug]/[section_id]/types'

function buildTree(sections: Section[]): SectionNode[] {
  const map = new Map<string, SectionNode>()
  for (const s of sections) map.set(s.id, { ...s, children: [] })

  const roots: SectionNode[] = []
  for (const s of sections) {
    const node = map.get(s.id)!
    if (s.parent_id && map.has(s.parent_id)) {
      map.get(s.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export type LawToc = {
  law: Law
  tree: SectionNode[]
  directArticles: Article[]
}

// Metadata mínima para <title> de la página de tabla de contenidos.
export async function getLawMeta(db: SupabaseClient, slug: string): Promise<{ shortName: string } | null> {
  const { data } = await db.from('laws').select('short_name').eq('slug', slug).single()
  return data ? { shortName: data.short_name as string } : null
}

// Metadata mínima para <title> de la página de lectura de sección.
export async function getSectionMeta(
  db: SupabaseClient,
  slug: string,
  sectionId: string
): Promise<{ lawShortName: string; sectionHeading: string } | null> {
  const [{ data: law }, { data: section }] = await Promise.all([
    db.from('laws').select('short_name').eq('slug', slug).single(),
    db.from('sections').select('heading').eq('id', sectionId).single(),
  ])
  if (!law || !section) return null
  return { lawShortName: law.short_name as string, sectionHeading: section.heading as string }
}

// Tabla de contenidos de una ley: árbol de secciones, o lista plana de artículos
// si la ley no tiene secciones (p.ej. decretos cortos).
export async function getLawToc(db: SupabaseClient, slug: string): Promise<LawToc | null> {
  const { data: lawRow } = await db.from('laws').select('*').eq('slug', slug).single()
  const law = lawRow as Law | null
  if (!law) return null

  const { data: sectionsRaw, error: sectionsError } = await db
    .from('sections')
    .select('*')
    .eq('law_id', law.id)
    .order('position')

  if (sectionsError) throw sectionsError

  const sections = (sectionsRaw as Section[]) ?? []
  const hasSections = sections.length > 0

  let directArticles: Article[] = []
  if (!hasSections) {
    const { data: articles, error: articlesError } = await db
      .from('articles')
      .select('id, number, heading, position')
      .eq('law_id', law.id)
      .eq('is_current', true)
      .order('position')
    if (articlesError) throw articlesError
    directArticles = (articles as Article[]) ?? []
  }

  return {
    law,
    tree: hasSections ? buildTree(sections) : [],
    directArticles,
  }
}

type AnnotationNoteRow = {
  id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  note: string | null
  char_start: number
  char_end: number
  paragraphs: { text: string } | null
  articles: { number: string; heading: string | null; section_id: string | null }
}

export type SectionReadingBundle = {
  law: Law
  section: Section
  parentSection: Section | null
  prevSection: SiblingSection | null
  nextSection: SiblingSection | null
  articles: ArticleWithParagraphs[]
  articleStubs: { id: string; number: string; heading: string | null }[]
  annotationsByParagraph: Record<string, Annotation[]>
  notes: NoteItem[]
  orphanedAnnotations: OrphanedAnnotation[]
  reforms: LawReform[]
  hasUnseenReform: boolean
  isAuthenticated: boolean
}

// Vista de lectura de una sección: ley, sección, artículos (con párrafos), navegación
// entre hermanos, reformas de la ley, highlights/notas del usuario y reformas pendientes.
export async function getSectionReadingBundle(
  db: SupabaseClient,
  actor: Actor,
  slug: string,
  sectionId: string
): Promise<SectionReadingBundle | null> {
  const [{ data: lawRow }, { data: sectionRow }, { data: articlesRaw, error: articlesError }] =
    await Promise.all([
      db.from('laws').select('*').eq('slug', slug).single(),
      db.from('sections').select('*').eq('id', sectionId).single(),
      db
        .from('articles')
        .select('*, paragraphs(*)')
        .eq('section_id', sectionId)
        .eq('is_current', true)
        .order('position'),
    ])

  const law = lawRow as Law | null
  const section = sectionRow as Section | null

  if (!law || !section) return null
  if (articlesError) throw articlesError

  const articles = ((articlesRaw as ArticleWithParagraphs[]) ?? []).map((a) => ({
    ...a,
    paragraphs: [...a.paragraphs].sort((x, y) => x.position - y.position),
  }))

  const articleIds = articles.map((a) => a.id)

  const [
    { data: parentSectionRow },
    { data: siblingsRaw },
    { data: reformsRaw },
    { data: highlightAnnotationsRaw },
    { data: notesRaw },
    { reformsByLaw },
  ] = await Promise.all([
    section.parent_id
      ? db.from('sections').select('*').eq('id', section.parent_id).single()
      : Promise.resolve({ data: null }),
    section.parent_id
      ? db
          .from('sections')
          .select('id, kind, number, heading, position')
          .eq('law_id', law.id)
          .eq('parent_id', section.parent_id)
          .order('position')
      : db
          .from('sections')
          .select('id, kind, number, heading, position')
          .eq('law_id', law.id)
          .is('parent_id', null)
          .order('position'),
    db.from('law_reforms').select('*').eq('law_id', law.id).order('published_at', { ascending: false }),
    actor.userId && articleIds.length > 0
      ? db.from('annotations').select('*').in('article_id', articleIds)
      : Promise.resolve({ data: [] }),
    actor.userId
      ? db
          .from('annotations')
          .select(
            'id, color, note, char_start, char_end, paragraph_id, article_id, paragraphs(text), articles!inner(number, heading, section_id, law_id, is_current)'
          )
          .eq('user_id', actor.userId)
          .eq('articles.law_id', law.id)
          .eq('articles.is_current', true)
          .not('note', 'is', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    getPendingReforms(db, actor.tier, actor.userId),
  ])

  const parentSection = parentSectionRow as Section | null
  const siblings = (siblingsRaw ?? []) as SiblingSection[]
  const reforms = (reformsRaw ?? []) as LawReform[]

  const paragraphTextById = new Map<string, string>()
  const articleByParagraphId = new Map<string, Article>()
  for (const a of articles) {
    for (const p of a.paragraphs) {
      paragraphTextById.set(p.id, p.text)
      articleByParagraphId.set(p.id, a)
    }
  }

  const annotations = (highlightAnnotationsRaw ?? []) as Annotation[]
  const orphanedAnnotations: OrphanedAnnotation[] = []
  const reanchorUpdates: Promise<unknown>[] = []
  const annotationsByParagraph: Record<string, Annotation[]> = {}
  const checksumByParagraph = new Map<string, Promise<string>>()

  for (const ann of annotations) {
    const paragraphText = paragraphTextById.get(ann.paragraph_id)
    if (paragraphText === undefined) {
      ;(annotationsByParagraph[ann.paragraph_id] ??= []).push(ann)
      continue
    }

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
        sectionId: article?.section_id ?? null,
      })
      continue
    }

    const resolvedAnn: Annotation = { ...ann, char_start: resolved.start, char_end: resolved.end, anchor_status: resolved.status }
    ;(annotationsByParagraph[resolvedAnn.paragraph_id] ??= []).push(resolvedAnn)
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
      sectionId: row.articles.section_id,
    }
  })

  const currentIndex = siblings.findIndex((s) => s.id === section.id)
  const prevSection = currentIndex > 0 ? siblings[currentIndex - 1] : null
  const nextSection = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

  const articleStubs = articles.map((a) => ({ id: a.id, number: a.number, heading: a.heading }))
  const hasUnseenReform = reformsByLaw.has(law.id)

  return {
    law,
    section,
    parentSection,
    prevSection,
    nextSection,
    articles,
    articleStubs,
    annotationsByParagraph,
    notes,
    orphanedAnnotations,
    reforms,
    hasUnseenReform,
    isAuthenticated: !!actor.userId,
  }
}
