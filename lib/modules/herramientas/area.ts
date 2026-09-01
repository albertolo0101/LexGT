/**
 * Cálculo de área de un polígono (medidas de terreno, Guatemala).
 *
 * Dos entradas posibles, ambas puras y sin dependencias:
 *
 * 1. **Coordenadas** — pares (x, y) en metros, en el orden del perímetro.
 *    El área sale por la fórmula del zapatero (shoelace).
 * 2. **Rumbos y distancias** — el levantamiento clásico de escritura: cada
 *    lado como rumbo (N 45°30'00" E) y distancia. Se convierte a coordenadas
 *    y se cae en el mismo cálculo.
 *
 * Las unidades agrarias guatemaltecas se derivan todas de la vara castellana
 * de 0.835905 m: 1 manzana = 10,000 varas², 1 caballería = 64 manzanas.
 */

export type Point = { x: number; y: number }

/** Área en m² del polígono cerrado que describen los puntos (shoelace). */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** Perímetro en metros, cerrando del último punto al primero. */
export function polygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return sum
}

export type Leg = {
  /** Norte o Sur: primera letra del rumbo. */
  ns: 'N' | 'S'
  degrees: number
  minutes: number
  seconds: number
  /** Este u Oeste: última letra del rumbo. */
  ew: 'E' | 'W'
  /** Distancia del lado, en metros. */
  distance: number
}

/** Rumbo por cuadrante → azimut (0° = Norte, creciendo hacia el Este). */
export function legToAzimuth(leg: Leg): number {
  const angle = leg.degrees + leg.minutes / 60 + leg.seconds / 3600
  if (leg.ns === 'N') return leg.ew === 'E' ? angle : 360 - angle
  return leg.ew === 'E' ? 180 - angle : 180 + angle
}

/**
 * Poligonal: recorre los lados desde el origen (0, 0) y devuelve un vértice
 * por lado. El último vértice es el cierre calculado; si el levantamiento es
 * exacto coincide con el origen (ver `closureError`).
 */
export function legsToPoints(legs: Leg[]): Point[] {
  const points: Point[] = [{ x: 0, y: 0 }]
  let x = 0
  let y = 0
  for (const leg of legs) {
    const az = (legToAzimuth(leg) * Math.PI) / 180
    x += leg.distance * Math.sin(az)
    y += leg.distance * Math.cos(az)
    points.push({ x, y })
  }
  // El punto de cierre repite el origen: no es un vértice del polígono.
  points.pop()
  return points
}

/** Distancia en metros entre el punto de cierre de la poligonal y el origen. */
export function closureError(legs: Leg[]): number {
  let x = 0
  let y = 0
  for (const leg of legs) {
    const az = (legToAzimuth(leg) * Math.PI) / 180
    x += leg.distance * Math.sin(az)
    y += leg.distance * Math.cos(az)
  }
  return Math.hypot(x, y)
}

// Vara castellana usada en las medidas agrarias guatemaltecas.
export const VARA_M = 0.835905
export const VARA2_M2 = VARA_M * VARA_M
export const MANZANA_M2 = 10_000 * VARA2_M2
export const CABALLERIA_M2 = 64 * MANZANA_M2
export const HECTAREA_M2 = 10_000

export type AreaConversions = {
  m2: number
  varas2: number
  hectareas: number
  manzanas: number
  caballerias: number
}

export function convertArea(m2: number): AreaConversions {
  return {
    m2,
    varas2: m2 / VARA2_M2,
    hectareas: m2 / HECTAREA_M2,
    manzanas: m2 / MANZANA_M2,
    caballerias: m2 / CABALLERIA_M2,
  }
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
