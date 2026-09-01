// Catálogo de herramientas. Una sola fuente para el menú de la barra superior
// (`components/ToolsMenu.tsx`) y el índice `/herramientas`.
export type ToolEntry = {
  slug: string
  name: string
  description: string
  /** Nombre de un icono de `components/icons.tsx`. */
  icon: 'gavel' | 'layers' | 'scroll' | 'bookmark' | 'bell'
}

export const TOOLS: ToolEntry[] = [
  {
    slug: 'prestaciones',
    name: 'Calculadora de prestaciones',
    description: 'Indemnización, aguinaldo, bono 14 y vacaciones por tiempo servido.',
    icon: 'gavel',
  },
  {
    slug: 'plazos',
    name: 'Calculadora de plazos',
    description: 'Vencimiento en días hábiles según el Art. 45 de la LOJ, sin asuetos ni fines de semana.',
    icon: 'bell',
  },
  {
    slug: 'timbres',
    name: 'Calculadora de timbres',
    description: 'Timbre notarial y fiscal de un contrato, con las denominaciones a adherir.',
    icon: 'bookmark',
  },
  {
    slug: 'arancel',
    name: 'Calculadora de arancel',
    description: 'Honorarios profesionales mínimos del Decreto 111-96 según el tipo de asunto.',
    icon: 'scroll',
  },
  {
    slug: 'area',
    name: 'Calculadora de área',
    description: 'Área de un polígono por coordenadas o por rumbos y distancias.',
    icon: 'layers',
  },
]
