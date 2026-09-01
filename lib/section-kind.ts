export const KIND_LABEL: Record<string, string> = {
  libro: 'Libro',
  titulo: 'Título',
  capitulo: 'Capítulo',
  seccion: 'Sección',
  subseccion: 'Subsección',
  parte: 'Parte',
  parrafo: 'Párrafo',
  articulo: 'Artículo',
  disposiciones: 'Disposiciones',
}

const KIND_WORD = /^(libros?|t[ií]tulos?|cap[ií]tulos?|secci[oó]n|subsecci[oó]n|partes?|p[áa]rrafos?|art[ií]culos?|disposiciones)\b/i

/**
 * Rótulo y título de una sección para el índice y el documento.
 *
 * Ojo con la forma del dato: en la mayoría de las leyes `number` ya trae la
 * palabra del tipo ("LIBRO PRIMERO", "CAPITULO I"), así que anteponer
 * `KIND_LABEL` produciría "Libro LIBRO PRIMERO". En otras (Código de Trabajo)
 * `number` es null y el tipo vive dentro de `heading`. Y `heading` puede venir
 * vacío. Esta función cubre los tres casos.
 */
export function sectionDisplay(section: {
  kind: string
  number: string | null
  heading: string | null
}): { label: string; title: string } {
  const number = (section.number ?? '').trim()
  const heading = (section.heading ?? '').trim()
  const kindLabel = KIND_LABEL[section.kind] ?? section.kind

  if (number) {
    const label = KIND_WORD.test(number) ? number : `${kindLabel} ${number}`
    // Sin heading, el número ES el título ("LIBRO SEGUNDO" a secas).
    return heading ? { label, title: heading } : { label: '', title: label }
  }

  // Sin número: el tipo suele venir dentro del heading ("CAPÍTULO ÚNICO …"),
  // y anteponer el rótulo lo repetiría.
  if (heading) return KIND_WORD.test(heading) ? { label: '', title: heading } : { label: kindLabel, title: heading }

  return { label: '', title: kindLabel }
}
