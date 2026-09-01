/**
 * Cómputo de plazos legales (Guatemala).
 *
 * Base: **Ley del Organismo Judicial (Decreto 2-89), Art. 45**, que está
 * cargada en LexGT (`/leyes/ley-del-organismo-judicial#articulo-45`):
 *
 * - inciso d) «En los plazos que se computen por días no se incluirán los días
 *   inhábiles. Son inhábiles los días de feriado que se declaren oficialmente,
 *   los domingos y los sábados cuando por adopción de jornada continua de
 *   trabajo o de jornada semanal de trabajo no menor de cuarenta (40) horas, se
 *   tengan como días de descanso y los días en que por cualquier causa el
 *   tribunal hubiese permanecido cerrado en el curso de todas las horas
 *   laborales.»
 * - inciso e) «Todo plazo debe computarse a partir del día siguiente al de la
 *   última notificación […]».
 * - inciso c) los meses y años se rigen por el calendario gregoriano y
 *   «terminarán […] la víspera de la fecha en que han principiado a contarse».
 *
 * Los asuetos son los del **Art. 127 del Código de Trabajo** (también cargado):
 * 1 de enero; Jueves, Viernes y Sábado Santos; 1 de mayo; 30 de junio; 15 de
 * septiembre; 20 de octubre; 1 de noviembre; 25 de diciembre; más la festividad
 * de la localidad. El 24 y el 31 de diciembre son asueto de **medio día** (a
 * partir de las 12:00), así que aquí cuentan como hábiles.
 *
 * El inciso d) contempla expresamente los días en que el tribunal estuvo
 * cerrado por cualquier causa: por eso el cálculo acepta fechas inhábiles
 * adicionales (vacaciones judiciales, asuetos declarados, suspensiones).
 *
 * Módulo puro: sin `Date` local — todas las fechas se manejan como `YYYY-MM-DD`
 * en UTC para que el resultado no cambie con la zona horaria del navegador.
 */

export type PlazoUnit = 'habiles' | 'calendario' | 'meses' | 'anios'

export type PlazoOptions = {
  /** Fecha de la última notificación, `YYYY-MM-DD`. */
  notifiedOn: string
  /** Cantidad de días, meses o años del plazo. */
  amount: number
  unit: PlazoUnit
  /** Sábados inhábiles (jornada de 40 horas). Por defecto sí. */
  saturdaysOff?: boolean
  /** Incluir la festividad de la localidad (15 de agosto, ciudad de Guatemala). */
  includeLocalHoliday?: boolean
  /** Fechas inhábiles adicionales (`YYYY-MM-DD`): cierres del tribunal, asuetos. */
  extraNonWorkingDays?: string[]
  /**
   * Si el vencimiento cae en día inhábil (solo aplica a calendario/meses/años),
   * correrlo al siguiente día hábil. Por defecto sí.
   */
  moveToNextWorkingDay?: boolean
}

export type SkippedDay = { date: string; reason: string }

export type PlazoResult = {
  /** Primer día del cómputo: el siguiente al de la notificación (Art. 45 e). */
  startsOn: string
  /** Fecha en que vence el plazo. */
  dueOn: string
  /** Días de calendario entre la notificación y el vencimiento. */
  calendarDays: number
  /** Días inhábiles omitidos dentro del plazo. */
  skipped: SkippedDay[]
  /** Se movió el vencimiento por caer en día inhábil. */
  movedForward: boolean
}

const MS_DAY = 86_400_000

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(parseDate(iso).getTime() + days * MS_DAY))
}

/** "lunes 15 de septiembre de 2026" */
export function formatLongDate(iso: string): string {
  const d = parseDate(iso)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}

/** Domingo de Resurrección (algoritmo gregoriano anónimo). */
export function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Asuetos de un año, con su nombre. Art. 127 del Código de Trabajo + Semana
 * Santa (jueves, viernes y sábado, que dependen de la Pascua).
 */
export function holidaysOf(year: number, includeLocalHoliday = false): Map<string, string> {
  const easter = easterSunday(year)
  const holidays = new Map<string, string>([
    [`${year}-01-01`, 'Año Nuevo'],
    [addDays(easter, -3), 'Jueves Santo'],
    [addDays(easter, -2), 'Viernes Santo'],
    [addDays(easter, -1), 'Sábado Santo'],
    [`${year}-05-01`, 'Día del Trabajo'],
    [`${year}-06-30`, 'Día del Ejército'],
    [`${year}-09-15`, 'Día de la Independencia'],
    [`${year}-10-20`, 'Día de la Revolución'],
    [`${year}-11-01`, 'Día de Todos los Santos'],
    [`${year}-12-25`, 'Navidad'],
  ])
  if (includeLocalHoliday) {
    holidays.set(`${year}-08-15`, 'Festividad de la localidad (ciudad de Guatemala)')
  }
  return holidays
}

type WorkingDayContext = {
  saturdaysOff: boolean
  includeLocalHoliday: boolean
  extra: Set<string>
  holidayCache: Map<number, Map<string, string>>
}

function nonWorkingReason(iso: string, ctx: WorkingDayContext): string | null {
  const day = parseDate(iso).getUTCDay()
  if (day === 0) return 'domingo'
  if (day === 6 && ctx.saturdaysOff) return 'sábado'
  if (ctx.extra.has(iso)) return 'día inhábil agregado'

  const year = Number(iso.slice(0, 4))
  let holidays = ctx.holidayCache.get(year)
  if (!holidays) {
    holidays = holidaysOf(year, ctx.includeLocalHoliday)
    ctx.holidayCache.set(year, holidays)
  }
  return holidays.get(iso) ?? null
}

export function isWorkingDay(iso: string, options: Partial<PlazoOptions> = {}): boolean {
  return nonWorkingReason(iso, contextOf(options)) === null
}

function contextOf(options: Partial<PlazoOptions>): WorkingDayContext {
  return {
    saturdaysOff: options.saturdaysOff ?? true,
    includeLocalHoliday: options.includeLocalHoliday ?? false,
    extra: new Set(options.extraNonWorkingDays ?? []),
    holidayCache: new Map(),
  }
}

/** Suma meses de calendario conservando el día (o el último día del mes). */
function addMonths(iso: string, months: number): string {
  const d = parseDate(iso)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + months
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(year, month, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return toISO(target)
}

/**
 * Vencimiento de un plazo. El cómputo arranca el día siguiente al de la
 * notificación (Art. 45 e LOJ); en plazos por días hábiles se saltan domingos,
 * sábados (si son de descanso), asuetos y los días inhábiles agregados.
 */
export function calcularPlazo(options: PlazoOptions): PlazoResult {
  const ctx = contextOf(options)
  const amount = Math.max(0, Math.trunc(options.amount))
  const startsOn = addDays(options.notifiedOn, 1)
  const skipped: SkippedDay[] = []
  let movedForward = false
  let dueOn: string

  if (options.unit === 'habiles') {
    let counted = 0
    let cursor = startsOn
    dueOn = startsOn
    // Se avanza día por día contando solo los hábiles; el vencimiento es el
    // día hábil número `amount`.
    while (counted < amount) {
      const reason = nonWorkingReason(cursor, ctx)
      if (reason) skipped.push({ date: cursor, reason })
      else {
        counted += 1
        dueOn = cursor
      }
      if (counted < amount) cursor = addDays(cursor, 1)
    }
    if (amount === 0) dueOn = options.notifiedOn
  } else {
    if (options.unit === 'calendario') dueOn = addDays(startsOn, amount - 1)
    // Art. 45 c): meses y años terminan la víspera de la fecha en que
    // principiaron a contarse.
    else if (options.unit === 'meses') dueOn = addDays(addMonths(startsOn, amount), -1)
    else dueOn = addDays(addMonths(startsOn, amount * 12), -1)

    if (amount === 0) dueOn = options.notifiedOn

    if (options.moveToNextWorkingDay ?? true) {
      while (true) {
        const reason = nonWorkingReason(dueOn, ctx)
        if (!reason) break
        skipped.push({ date: dueOn, reason })
        dueOn = addDays(dueOn, 1)
        movedForward = true
      }
    }
  }

  const calendarDays = Math.round(
    (parseDate(dueOn).getTime() - parseDate(options.notifiedOn).getTime()) / MS_DAY
  )

  return { startsOn, dueOn, calendarDays, skipped, movedForward }
}
