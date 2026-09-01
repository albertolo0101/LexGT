/**
 * Fecha en que el catálogo se revisó por última vez contra el **Diario de
 * Centro América** (diario oficial). Es una sola fecha para todas las leyes:
 * lo que el lector afirma es "hasta aquí revisamos el diario oficial", no
 * cuándo se tocó ese texto en particular.
 *
 * **Actualizar esta constante cada vez que se cierre una revisión del diario**
 * (es lo único que hay que tocar; el LED del lector la lee de aquí).
 */
export const GAZETTE_REVIEWED_ON = '2026-08-31'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "31 de agosto de 2026" — sin `Date` local para que no cambie por zona horaria. */
export function formatRevisionDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} de ${MONTHS[month - 1]} de ${year}`
}
