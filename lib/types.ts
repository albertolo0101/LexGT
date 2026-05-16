export type Law = {
  id: string
  slug: string
  short_name: string
  full_name: string
  decree: string | null
  enacted_on: string | null
  is_active: boolean
  created_at: string
}

export type Section = {
  id: string
  law_id: string
  parent_id: string | null
  kind: 'libro' | 'titulo' | 'capitulo' | 'seccion' | 'parte'
  number: string | null
  heading: string
  position: number
  created_at: string
}

export type Article = {
  id: string
  law_id: string
  section_id: string | null
  number: string
  heading: string | null
  position: number
  is_current: boolean
  version: number
  superseded_by: string | null
  effective_on: string | null
  created_at: string
}

export type Paragraph = {
  id: string
  article_id: string
  position: number
  text: string
  created_at: string
}

export type ArticleWithParagraphs = Article & { paragraphs: Paragraph[] }

export type SectionNode = Section & { children: SectionNode[] }
