// Anclas (#fragment) de la vista de lectura. Toda la ley se renderiza en una
// sola página, así que estos ids son el único mecanismo de navegación interna:
// la tabla de contenidos, los resultados de búsqueda y el panel de notas deben
// generarlos con estas funciones para que coincidan con el DOM.

// Los números de artículo pueden traer sufijos ("326 Bis") y un id de HTML no
// admite espacios.
export function articleAnchor(number: string): string {
  const slug = number
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `articulo-${slug || "sn"}`;
}

export function sectionAnchor(sectionId: string): string {
  return `seccion-${sectionId}`;
}
