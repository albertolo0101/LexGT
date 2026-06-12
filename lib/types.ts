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
  kind: 'libro' | 'titulo' | 'capitulo' | 'seccion' | 'parte' | 'parrafo' | 'subseccion' | 'articulo' | 'disposiciones'
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

export type AnchorStatus = 'anchored' | 'reanchored' | 'orphaned'

export type Annotation = {
  id: string
  user_id: string
  paragraph_id: string
  article_id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  char_start: number
  char_end: number
  note: string | null
  is_pinned_to_old_version: boolean
  quote: string | null
  prefix: string | null
  suffix: string | null
  text_checksum: string | null
  anchor_status: AnchorStatus
  created_at: string
  updated_at: string
}

export type LawReform = {
  id: string
  law_id: string
  title: string
  description: string | null
  published_at: string
  created_at: string
}

export type ReformNotification = {
  id: string
  user_id: string
  reform_id: string
  seen_at: string | null
}

export type Tier = 'anonymous' | 'free' | 'pro'
export type AuthedTier = Exclude<Tier, 'anonymous'>

export type UserProfile = {
  user_id: string
  tier: AuthedTier
  tier_expires_at: string | null
  tier_source: string
  created_at: string
}

export type Case = {
  id: string
  user_id: string
  title: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export type CaseAnnotation = {
  id: string
  case_id: string
  annotation_id: string
  created_at: string
}

export type LawCollection = {
  id: number
  slug: string
  name: string
  description: string | null
  position: number
  is_default: boolean
}

export type LawCollectionItem = {
  id: number
  collection_id: number
  law_id: string  // uuid — references laws.id
  position: number
}
