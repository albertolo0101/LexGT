/**
 * Cálculo de prestaciones laborales (Guatemala) a partir del tiempo servido
 * expresado en años, meses y días — no en fechas: la herramienta pública pide
 * el tiempo ya contado, que es como llega en la práctica de bufete.
 *
 * Módulo puro: sin `server-only`, sin acceso a datos. Lo usa la página
 * `/herramientas/prestaciones` en el cliente y los tests de Vitest.
 *
 * Convención 30/360 (mes de 30 días, año comercial de 360), la usual para
 * prorratear prestaciones en Guatemala — la misma que `calc-laboral`.
 */

export type PrestacionesInput = {
  /** Salario mensual ordinario en quetzales. */
  monthlySalary: number
  years: number
  months: number
  days: number
  /** Días de vacaciones no gozadas de períodos anteriores (opcional). */
  unusedVacationDays?: number
}

export type PrestacionLine = {
  key: 'indemnizacion' | 'aguinaldo' | 'bono14' | 'vacaciones' | 'vacacionesPendientes'
  label: string
  basis: string
  amount: number
}

export type PrestacionesResult = {
  totalDays: number
  dailySalary: number
  /** Tiempo total servido en años (fracción incluida). */
  serviceFactor: number
  /** Fracción del período anual en curso, tope 1 — base de aguinaldo/bono 14. */
  periodFactor: number
  lines: PrestacionLine[]
  total: number
}

const DAYS_PER_YEAR = 360
const DAYS_PER_MONTH = 30

/** Redondeo a centavos de quetzal. */
export function roundQ(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function totalServiceDays(input: Pick<PrestacionesInput, 'years' | 'months' | 'days'>): number {
  return Math.max(
    0,
    Math.trunc(input.years) * DAYS_PER_YEAR +
      Math.trunc(input.months) * DAYS_PER_MONTH +
      Math.trunc(input.days)
  )
}

/**
 * Desglose de prestaciones al terminar la relación laboral:
 *
 * - **Indemnización** (Art. 82 Código de Trabajo): un mes de salario por año
 *   de servicios continuos, prorrateada por el tiempo total.
 * - **Aguinaldo** (Decreto 76-78): 100% del salario mensual por año; aquí se
 *   liquida la parte proporcional del período en curso.
 * - **Bonificación anual (Bono 14, Decreto 42-92)**: mismo cálculo que el
 *   aguinaldo, con su propio período.
 * - **Vacaciones** (Art. 130): 15 días por año, proporcionales al período.
 * - **Vacaciones no gozadas**: días pendientes de períodos anteriores, a
 *   salario diario.
 *
 * Aguinaldo y bono 14 se prorratean sobre el período anual en curso (tope de
 * 360 días), no sobre toda la antigüedad: los períodos anteriores ya se
 * pagaron en su fecha.
 */
export function calcularPrestaciones(input: PrestacionesInput): PrestacionesResult {
  const salary = Math.max(0, input.monthlySalary)
  const totalDays = totalServiceDays(input)
  const dailySalary = salary / DAYS_PER_MONTH
  const serviceFactor = totalDays / DAYS_PER_YEAR
  const periodFactor = Math.min(totalDays, DAYS_PER_YEAR) / DAYS_PER_YEAR
  const pendingDays = Math.max(0, input.unusedVacationDays ?? 0)

  const lines: PrestacionLine[] = [
    {
      key: 'indemnizacion',
      label: 'Indemnización',
      basis: 'Art. 82 CT — un mes de salario por año servido',
      amount: roundQ(salary * serviceFactor),
    },
    {
      key: 'aguinaldo',
      label: 'Aguinaldo proporcional',
      basis: 'Decreto 76-78 — período en curso',
      amount: roundQ(salary * periodFactor),
    },
    {
      key: 'bono14',
      label: 'Bono 14 proporcional',
      basis: 'Decreto 42-92 — período en curso',
      amount: roundQ(salary * periodFactor),
    },
    {
      key: 'vacaciones',
      label: 'Vacaciones proporcionales',
      basis: 'Art. 130 CT — 15 días por año',
      amount: roundQ(dailySalary * 15 * periodFactor),
    },
  ]

  if (pendingDays > 0) {
    lines.push({
      key: 'vacacionesPendientes',
      label: 'Vacaciones no gozadas',
      basis: `${pendingDays} día${pendingDays === 1 ? '' : 's'} a salario diario`,
      amount: roundQ(dailySalary * pendingDays),
    })
  }

  return {
    totalDays,
    dailySalary: roundQ(dailySalary),
    serviceFactor,
    periodFactor,
    lines,
    total: roundQ(lines.reduce((sum, line) => sum + line.amount, 0)),
  }
}

export { formatQ } from './format'
