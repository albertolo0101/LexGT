// Tokens de color de caso — 6 colores
export type CaseColorKey = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple'

export const CASE_COLORS: Record<CaseColorKey, { solid: string; border: string; soft: string; ink: string; label: string }> = {
  gray:   { solid: '#6B7280', border: '#6B7280', soft: '#F1F2F4', ink: '#374151', label: 'Gray' },
  blue:   { solid: '#1F5FCF', border: '#1F5FCF', soft: '#E7EDFA', ink: '#1747A0', label: 'Blue' },
  green:  { solid: '#2F8F5E', border: '#2F8F5E', soft: '#E4F1EA', ink: '#206B45', label: 'Green' },
  red:    { solid: '#B84545', border: '#B84545', soft: '#F6E5E5', ink: '#8A3232', label: 'Red' },
  amber:  { solid: '#D69317', border: '#D69317', soft: '#FBEFD6', ink: '#9B6B10', label: 'Amber' },
  purple: { solid: '#7C4FCC', border: '#7C4FCC', soft: '#EDE5FA', ink: '#5A3699', label: 'Purple' },
}

export function caseColorToken(color: string) {
  return CASE_COLORS[color as CaseColorKey] ?? CASE_COLORS.gray
}

// Tokens de color de highlight (4)
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'

export const HL_TOKENS: Record<HighlightColor, { swatch: string; label: string; free: boolean }> = {
  yellow: { swatch: '#FBE38A', label: 'Yellow', free: true },
  green:  { swatch: '#BDE5BB', label: 'Green', free: false },
  blue:   { swatch: '#B7D5F2', label: 'Blue', free: false },
  pink:   { swatch: '#F4B9D3', label: 'Pink', free: false },
}

export const HL_COLORS: Record<HighlightColor, string> = {
  yellow: 'var(--color-hl-yellow)',
  green: 'var(--color-hl-green)',
  blue: 'var(--color-hl-blue)',
  pink: 'var(--color-hl-pink)',
}

// Clases del <mark> de un highlight. Las usan tanto el render de servidor
// (ParagraphText) como el <mark> optimista que ReaderSurface inserta en el DOM
// al guardar, así que deben existir literalmente aquí para que Tailwind las
// incluya en el bundle.
export const HL_MARK_CLASS: Record<HighlightColor, string> = {
  yellow: 'bg-hl-yellow rounded-sm cursor-pointer',
  green: 'bg-hl-green rounded-sm cursor-pointer',
  blue: 'bg-hl-blue rounded-sm cursor-pointer',
  pink: 'bg-hl-pink rounded-sm cursor-pointer',
}
