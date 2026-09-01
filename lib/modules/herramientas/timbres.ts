/**
 * Timbres notariales y fiscales (Guatemala).
 *
 * **Timbre notarial — Ley del Timbre Forense y Timbre Notarial, Decreto 82-96:**
 * - Contratos de valor determinado: **2 por millar** (0.2%) sobre el valor,
 *   con mínimo de Q1.00 y máximo de Q300.00.
 * - Contratos de valor indeterminado y protocolaciones: **Q10.00**.
 * - Actas notariales y legalización de firmas: **Q10.00**.
 * El timbre se adhiere en la primera hoja del testimonio especial que va al
 * Archivo General de Protocolos (o en el documento / al margen del acta).
 *
 * **Timbre fiscal — Ley del Impuesto de Timbres Fiscales y de Papel Sellado
 * Especial para Protocolos, Decreto 37-92:** tarifa al valor del **3%** sobre
 * el valor del acto o contrato afecto. Los actos gravados con **IVA** no pagan
 * timbre fiscal: los dos impuestos son excluyentes. Algunos documentos tienen
 * cuota fija en vez de la tarifa al valor (Art. 5 del decreto); esos no están
 * en esta calculadora.
 *
 * **Papel sellado especial para protocolos:** se cobra por hoja; el valor por
 * hoja es un parámetro de la calculadora porque cambia con el tiempo — no una
 * constante escondida.
 *
 * Todo esto es **referencial**: verifica siempre contra el texto vigente.
 */

export const TIMBRE_NOTARIAL_MILLAR = 0.002
export const TIMBRE_NOTARIAL_MIN = 1
export const TIMBRE_NOTARIAL_MAX = 300
export const TIMBRE_NOTARIAL_FIJO = 10
export const TIMBRE_FISCAL_TARIFA = 0.03
export const IVA_TARIFA = 0.12
/** Valor por hoja de papel sellado especial para protocolos (editable en la UI). */
export const PAPEL_PROTOCOLO_DEFAULT = 10

/** Denominaciones de timbres de uso común, en quetzales, de mayor a menor. */
export const DENOMINACIONES = [100, 50, 25, 10, 5, 1, 0.5, 0.25, 0.1]

export type ActoKey =
  | 'compraventa_inmueble'
  | 'compraventa_mueble'
  | 'donacion'
  | 'mutuo'
  | 'arrendamiento'
  | 'mandato'
  | 'promesa'
  | 'sociedad'
  | 'valor_indeterminado'
  | 'acta_notarial'
  | 'legalizacion_firmas'

export type ActoDef = {
  key: ActoKey
  label: string
  /** Cómo se calcula el timbre notarial. */
  notarial: 'millar' | 'fijo' | 'ninguno'
  /** Régimen fiscal sugerido; el usuario puede cambiarlo. */
  fiscal: 'timbre' | 'iva' | 'exento'
  note?: string
}

export const ACTOS: ActoDef[] = [
  {
    key: 'compraventa_inmueble',
    label: 'Compraventa de bien inmueble',
    notarial: 'millar',
    fiscal: 'iva',
    note: 'La compraventa de inmuebles está gravada con IVA, no con timbre fiscal.',
  },
  { key: 'compraventa_mueble', label: 'Compraventa de bien mueble o derechos', notarial: 'millar', fiscal: 'iva' },
  { key: 'donacion', label: 'Donación entre vivos', notarial: 'millar', fiscal: 'timbre' },
  { key: 'mutuo', label: 'Mutuo / reconocimiento de deuda', notarial: 'millar', fiscal: 'timbre' },
  { key: 'arrendamiento', label: 'Arrendamiento', notarial: 'millar', fiscal: 'timbre' },
  { key: 'mandato', label: 'Mandato', notarial: 'millar', fiscal: 'timbre' },
  { key: 'promesa', label: 'Promesa de contrato', notarial: 'millar', fiscal: 'timbre' },
  { key: 'sociedad', label: 'Constitución de sociedad', notarial: 'millar', fiscal: 'timbre' },
  {
    key: 'valor_indeterminado',
    label: 'Contrato de valor indeterminado / protocolación',
    notarial: 'fijo',
    fiscal: 'exento',
    note: 'Timbre notarial de Q10.00 por tratarse de valor indeterminado.',
  },
  { key: 'acta_notarial', label: 'Acta notarial', notarial: 'fijo', fiscal: 'exento' },
  { key: 'legalizacion_firmas', label: 'Legalización de firmas', notarial: 'fijo', fiscal: 'exento' },
]

export function actoDef(key: ActoKey): ActoDef {
  return ACTOS.find((a) => a.key === key) ?? ACTOS[0]
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Timbre notarial: 2 por millar con piso Q1.00 y techo Q300.00 (Decreto 82-96). */
export function timbreNotarial(acto: ActoDef, contractValue: number): number {
  if (acto.notarial === 'ninguno') return 0
  if (acto.notarial === 'fijo') return TIMBRE_NOTARIAL_FIJO
  if (contractValue <= 0) return 0
  const raw = contractValue * TIMBRE_NOTARIAL_MILLAR
  return round2(Math.min(TIMBRE_NOTARIAL_MAX, Math.max(TIMBRE_NOTARIAL_MIN, raw)))
}

/** Timbre fiscal: 3% del valor, salvo que el acto vaya gravado con IVA o exento. */
export function timbreFiscal(regimen: ActoDef['fiscal'], contractValue: number): number {
  if (regimen !== 'timbre' || contractValue <= 0) return 0
  return round2(contractValue * TIMBRE_FISCAL_TARIFA)
}

export type Denominacion = { valor: number; cantidad: number }

export type Descomposicion = {
  /** Monto efectivamente cubierto por los timbres (≥ el impuesto). */
  cubierto: number
  /** Diferencia por redondeo, cuando no hay timbres para el remanente exacto. */
  excedente: number
  timbres: Denominacion[]
}

const CENTS = (q: number) => Math.round(q * 100)

/**
 * Cuántos timbres de cada denominación hay que adherir para cubrir un monto.
 *
 * La denominación más pequeña es de diez centavos, así que hay montos que no se
 * pueden cubrir exactamente (Q3.47, por ejemplo). En ese caso se sube al
 * siguiente monto alcanzable y se reporta el excedente: adherir de más es
 * válido, adherir de menos no.
 *
 * Los timbres de Q100 se toman de forma directa y el resto (siempre menor a
 * Q100) se resuelve con programación dinámica, que sí garantiza el mínimo
 * número de timbres — el algoritmo voraz falla con estas denominaciones
 * (Q0.30 = tres de Q0.10, no Q0.25 + un remanente imposible).
 */
export function descomponerTimbres(
  amount: number,
  denominaciones: number[] = DENOMINACIONES
): Descomposicion {
  const target = CENTS(amount)
  if (target <= 0) return { cubierto: 0, excedente: 0, timbres: [] }

  const denomsCents = [...denominaciones].map(CENTS).sort((a, b) => b - a)
  const big = denomsCents[0]
  const useBig = Math.floor(target / big)
  let rest = target - useBig * big

  const smalls = denomsCents.filter((d) => d < big)
  const limit = rest + big // margen para redondear hacia arriba
  const best = new Array<number>(limit + 1).fill(Infinity)
  const pick = new Array<number>(limit + 1).fill(0)
  best[0] = 0
  for (let value = 1; value <= limit; value++) {
    for (const d of smalls) {
      if (d <= value && best[value - d] + 1 < best[value]) {
        best[value] = best[value - d] + 1
        pick[value] = d
      }
    }
  }

  let reachable = rest
  while (reachable <= limit && best[reachable] === Infinity) reachable += 1
  let extraBig = 0
  if (reachable > limit) {
    // No hay combinación alcanzable en el margen: se cubre con un timbre más
    // de la denominación mayor.
    extraBig = 1
    reachable = 0
  }
  rest = reachable

  const counts = new Map<number, number>()
  const addTimbre = (valueCents: number, qty = 1) =>
    counts.set(valueCents, (counts.get(valueCents) ?? 0) + qty)

  if (useBig + extraBig > 0) addTimbre(big, useBig + extraBig)
  let cursor = rest
  while (cursor > 0) {
    const d = pick[cursor]
    addTimbre(d)
    cursor -= d
  }

  const cubiertoCents = useBig * big + extraBig * big + rest
  const timbres = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([valor, cantidad]) => ({ valor: valor / 100, cantidad }))

  return {
    cubierto: cubiertoCents / 100,
    excedente: round2((cubiertoCents - target) / 100),
    timbres,
  }
}

export type TimbresInput = {
  acto: ActoKey
  contractValue: number
  /** Régimen fiscal efectivo (por defecto el sugerido para el acto). */
  regimen?: ActoDef['fiscal']
  /** Hojas de papel sellado especial para protocolos. */
  protocolSheets?: number
  /** Valor por hoja de papel de protocolo. */
  protocolSheetPrice?: number
}

export type TimbresLine = {
  key: 'notarial' | 'fiscal' | 'protocolo'
  label: string
  basis: string
  amount: number
  /** Desglose por denominación (solo para los que se adhieren). */
  descomposicion?: Descomposicion
}

export type TimbresResult = {
  lines: TimbresLine[]
  total: number
  ivaEstimado: number | null
  notes: string[]
}

export function calcularTimbres(input: TimbresInput): TimbresResult {
  const acto = actoDef(input.acto)
  const regimen = input.regimen ?? acto.fiscal
  const value = Math.max(0, input.contractValue)
  const sheets = Math.max(0, Math.trunc(input.protocolSheets ?? 0))
  const sheetPrice = Math.max(0, input.protocolSheetPrice ?? PAPEL_PROTOCOLO_DEFAULT)

  const notarial = timbreNotarial(acto, value)
  const fiscal = timbreFiscal(regimen, value)

  const lines: TimbresLine[] = []
  if (notarial > 0) {
    lines.push({
      key: 'notarial',
      label: 'Timbre notarial',
      basis:
        acto.notarial === 'fijo'
          ? 'Decreto 82-96 — cuota fija de Q10.00'
          : 'Decreto 82-96 — 2 por millar (mínimo Q1.00, máximo Q300.00)',
      amount: notarial,
      descomposicion: descomponerTimbres(notarial),
    })
  }
  if (fiscal > 0) {
    lines.push({
      key: 'fiscal',
      label: 'Timbre fiscal',
      basis: 'Decreto 37-92 — 3% sobre el valor del acto',
      amount: fiscal,
      descomposicion: descomponerTimbres(fiscal),
    })
  }
  if (sheets > 0) {
    lines.push({
      key: 'protocolo',
      label: 'Papel sellado especial para protocolos',
      basis: `${sheets} hoja${sheets === 1 ? '' : 's'} × ${sheetPrice.toFixed(2)}`,
      amount: round2(sheets * sheetPrice),
    })
  }

  const notes: string[] = []
  if (acto.note) notes.push(acto.note)
  if (regimen === 'iva') {
    notes.push('Acto gravado con IVA (12%): no lleva timbre fiscal — los dos impuestos son excluyentes.')
  }
  if (acto.notarial === 'millar' && value > 0 && value * TIMBRE_NOTARIAL_MILLAR > TIMBRE_NOTARIAL_MAX) {
    notes.push('El 2 por millar superó el techo de Q300.00, así que el timbre notarial se topó ahí.')
  }
  if (acto.notarial === 'millar' && value > 0 && value * TIMBRE_NOTARIAL_MILLAR < TIMBRE_NOTARIAL_MIN) {
    notes.push('El 2 por millar quedó bajo el mínimo de Q1.00, así que se cobra el mínimo.')
  }

  return {
    lines,
    total: round2(lines.reduce((sum, l) => sum + l.amount, 0)),
    ivaEstimado: regimen === 'iva' && value > 0 ? round2(value * IVA_TARIFA) : null,
    notes,
  }
}
