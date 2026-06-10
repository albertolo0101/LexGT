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

export function sectionLabel(section: { kind: string; number: string | null }): string {
  const label = KIND_LABEL[section.kind] ?? section.kind
  return section.number ? `${label} ${section.number}` : label
}
