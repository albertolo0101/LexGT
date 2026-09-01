/**
 * Arancel de Abogados, Árbitros, Procuradores, Mandatarios Judiciales,
 * Expertos, Interventores y Depositarios — **Decreto 111-96** del Congreso.
 *
 * El arancel fija **honorarios mínimos**: el profesional y su cliente pueden
 * pactar más, nunca menos. Lo que no está regulado expresamente cae en la
 * regla general de asuntos de cualquier naturaleza.
 *
 * Reglas implementadas (las que el decreto fija con porcentaje o monto):
 *
 * | Asunto | Honorario |
 * |---|---|
 * | Proceso sucesorio (judicial o extrajudicial) | 7% hasta Q50,000; 3% sobre el exceso hasta Q500,000; 1% sobre el exceso (fase administrativa de liquidación y pago de impuestos) |
 * | Jurisdicción voluntaria (salvo sucesorios) | Q800 de base + 5% del monto; si el monto es indeterminado, de Q800 a Q5,000 según su importancia |
 * | Ejecución civil, bancaria, mercantil y económico-coactivo | 10% hasta Q50,000 y 5% sobre el exceso (dirección, primera instancia) |
 * | Asuntos de cualquier naturaleza no regulados expresamente | 15% hasta Q100,000 y 5% sobre el exceso (primera instancia) |
 * | Casación, amparo e inconstitucionalidad (memoriales de interposición y evacuación) | de Q1,500 a Q5,000 según la cuantía o importancia |
 *
 * En **segunda instancia** corresponde la mitad de los honorarios de primera.
 *
 * Cálculo referencial: el decreto es de 1996 y en la práctica los honorarios
 * de mercado son mayores. Verifica siempre contra el texto vigente.
 */

export type AsuntoKey =
  | 'sucesorio'
  | 'jurisdiccion_voluntaria'
  | 'ejecucion'
  | 'general'
  | 'casacion_amparo'

export type Instancia = 'primera' | 'segunda'

export type AsuntoDef = {
  key: AsuntoKey
  label: string
  citation: string
  rule: string
  /** El monto del asunto es indispensable para calcular. */
  needsAmount: boolean
  /** Admite cuantía indeterminada (devuelve un rango). */
  allowsIndeterminate: boolean
  /** La regla de segunda instancia (mitad) aplica a este asunto. */
  hasInstancia: boolean
}

export const ASUNTOS: AsuntoDef[] = [
  {
    key: 'general',
    label: 'Asunto de cualquier naturaleza (regla general)',
    citation: 'Decreto 111-96 — dirección, asuntos no regulados expresamente',
    rule: '15% hasta Q100,000 y 5% sobre el exceso',
    needsAmount: true,
    allowsIndeterminate: false,
    hasInstancia: true,
  },
  {
    key: 'sucesorio',
    label: 'Proceso sucesorio (judicial o extrajudicial)',
    citation: 'Decreto 111-96, Art. 8',
    rule: '7% hasta Q50,000; 3% sobre el exceso hasta Q500,000; 1% sobre el exceso',
    needsAmount: true,
    allowsIndeterminate: false,
    hasInstancia: false,
  },
  {
    key: 'jurisdiccion_voluntaria',
    label: 'Jurisdicción voluntaria (salvo sucesorios)',
    citation: 'Decreto 111-96, Art. 9',
    rule: 'Q800 de base + 5% del monto; cuantía indeterminada: de Q800 a Q5,000',
    needsAmount: false,
    allowsIndeterminate: true,
    hasInstancia: false,
  },
  {
    key: 'ejecucion',
    label: 'Ejecución civil, bancaria, mercantil o económico-coactiva',
    citation: 'Decreto 111-96 — dirección en ejecuciones',
    rule: '10% hasta Q50,000 y 5% sobre el exceso',
    needsAmount: true,
    allowsIndeterminate: false,
    hasInstancia: true,
  },
  {
    key: 'casacion_amparo',
    label: 'Casación, amparo o inconstitucionalidad (memoriales)',
    citation: 'Decreto 111-96 — interposición y evacuación',
    rule: 'De Q1,500 a Q5,000 según la cuantía o importancia del asunto',
    needsAmount: false,
    allowsIndeterminate: true,
    hasInstancia: false,
  },
]

export function asuntoDef(key: AsuntoKey): AsuntoDef {
  return ASUNTOS.find((a) => a.key === key) ?? ASUNTOS[0]
}

export type Bracket = { upTo: number | null; rate: number }

export type HonorarioLine = { label: string; amount: number }

export type HonorarioResult = {
  /** Honorario mínimo del arancel. */
  min: number
  /** Tope del rango cuando el arancel fija uno (asuntos de cuantía indeterminada). */
  max: number | null
  lines: HonorarioLine[]
  citation: string
  rule: string
  notes: string[]
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Aplica una escala por tramos sobre el monto y devuelve una línea por tramo. */
export function applyBrackets(amount: number, brackets: Bracket[]): HonorarioLine[] {
  const lines: HonorarioLine[] = []
  let floor = 0
  for (const bracket of brackets) {
    if (amount <= floor) break
    const ceiling = bracket.upTo ?? amount
    const taxable = Math.min(amount, ceiling) - floor
    if (taxable > 0) {
      const label =
        bracket.upTo === null
          ? `${(bracket.rate * 100).toFixed(0)}% sobre el exceso de Q${floor.toLocaleString('es-GT')}`
          : floor === 0
            ? `${(bracket.rate * 100).toFixed(0)}% sobre los primeros Q${ceiling.toLocaleString('es-GT')}`
            : `${(bracket.rate * 100).toFixed(0)}% de Q${floor.toLocaleString('es-GT')} a Q${ceiling.toLocaleString('es-GT')}`
      lines.push({ label, amount: round2(taxable * bracket.rate) })
    }
    floor = ceiling
  }
  return lines
}

const BRACKETS: Partial<Record<AsuntoKey, Bracket[]>> = {
  general: [
    { upTo: 100_000, rate: 0.15 },
    { upTo: null, rate: 0.05 },
  ],
  ejecucion: [
    { upTo: 50_000, rate: 0.1 },
    { upTo: null, rate: 0.05 },
  ],
  sucesorio: [
    { upTo: 50_000, rate: 0.07 },
    { upTo: 500_000, rate: 0.03 },
    { upTo: null, rate: 0.01 },
  ],
}

export type HonorariosInput = {
  asunto: AsuntoKey
  /** Cuantía del litigio o valor del asunto; `null` si es indeterminada. */
  amount: number | null
  instancia?: Instancia
}

export function calcularHonorarios(input: HonorariosInput): HonorarioResult {
  const def = asuntoDef(input.asunto)
  const amount = input.amount === null ? null : Math.max(0, input.amount)
  const instancia = input.instancia ?? 'primera'
  const notes: string[] = []
  let lines: HonorarioLine[] = []
  let min = 0
  let max: number | null = null

  if (def.key === 'casacion_amparo') {
    min = 1_500
    max = 5_000
    lines = [{ label: 'Rango del arancel según la importancia del asunto', amount: min }]
  } else if (def.key === 'jurisdiccion_voluntaria') {
    if (amount === null || amount === 0) {
      min = 800
      max = 5_000
      lines = [{ label: 'Cuantía indeterminada: de Q800 a Q5,000 según su importancia', amount: min }]
    } else {
      lines = [
        { label: 'Base del arancel', amount: 800 },
        { label: '5% sobre el monto del asunto', amount: round2(amount * 0.05) },
      ]
      min = round2(lines.reduce((sum, l) => sum + l.amount, 0))
    }
  } else {
    const brackets = BRACKETS[def.key]!
    if (amount === null || amount === 0) {
      notes.push('Ingresa la cuantía del asunto para calcular el honorario mínimo.')
    } else {
      lines = applyBrackets(amount, brackets)
      min = round2(lines.reduce((sum, l) => sum + l.amount, 0))
    }
  }

  if (def.hasInstancia && instancia === 'segunda') {
    lines = lines.map((l) => ({ ...l, amount: round2(l.amount / 2) }))
    min = round2(min / 2)
    if (max !== null) max = round2(max / 2)
    notes.push('En segunda instancia corresponde la mitad de los honorarios de primera instancia.')
  }

  if (def.key === 'sucesorio') {
    notes.push(
      'El tramo del 1% corresponde a la fase administrativa de liquidación y pago de los impuestos que cause la sucesión.'
    )
  }

  notes.push('El arancel fija honorarios MÍNIMOS: se puede pactar más con el cliente, nunca menos.')

  return { min, max, lines, citation: def.citation, rule: def.rule, notes }
}
