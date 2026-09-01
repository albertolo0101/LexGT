export type NoteItem = {
  id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  note: string
  quote: string
  articleNumber: string
  articleHeading: string | null
}

export type OrphanedAnnotation = {
  id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  note: string | null
  quote: string
  articleNumber: string
  articleHeading: string | null
}
