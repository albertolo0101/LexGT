export type NoteItem = {
  id: string
  color: 'yellow' | 'green' | 'blue' | 'pink'
  note: string
  quote: string
  articleNumber: string
  articleHeading: string | null
  sectionId: string | null
}

export type SiblingSection = {
  id: string
  kind: string
  number: string | null
  heading: string
  position: number
}
