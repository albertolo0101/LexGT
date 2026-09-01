import { describe, it, expect } from 'vitest'
import { addDays, calcularPlazo, easterSunday, holidaysOf, isWorkingDay } from './plazos'

describe('easterSunday', () => {
  it('coincide con las pascuas conocidas', () => {
    expect(easterSunday(2024)).toBe('2024-03-31')
    expect(easterSunday(2025)).toBe('2025-04-20')
    expect(easterSunday(2026)).toBe('2026-04-05')
  })
})

describe('holidaysOf', () => {
  it('incluye Semana Santa derivada de la Pascua', () => {
    const h = holidaysOf(2026)
    expect(h.get('2026-04-02')).toBe('Jueves Santo')
    expect(h.get('2026-04-03')).toBe('Viernes Santo')
    expect(h.get('2026-04-04')).toBe('Sábado Santo')
  })

  it('trae los asuetos fijos del Art. 127 y no el 24 ni el 31 (medio día)', () => {
    const h = holidaysOf(2026)
    expect(h.has('2026-09-15')).toBe(true)
    expect(h.has('2026-10-20')).toBe(true)
    expect(h.has('2026-12-25')).toBe(true)
    expect(h.has('2026-12-24')).toBe(false)
    expect(h.has('2026-12-31')).toBe(false)
  })

  it('la festividad local es opcional', () => {
    expect(holidaysOf(2026).has('2026-08-15')).toBe(false)
    expect(holidaysOf(2026, true).has('2026-08-15')).toBe(true)
  })
})

describe('isWorkingDay', () => {
  it('descarta domingos, sábados y asuetos', () => {
    expect(isWorkingDay('2026-09-13')).toBe(false) // domingo
    expect(isWorkingDay('2026-09-12')).toBe(false) // sábado
    expect(isWorkingDay('2026-09-12', { saturdaysOff: false })).toBe(true)
    expect(isWorkingDay('2026-09-15')).toBe(false) // Independencia
    expect(isWorkingDay('2026-09-16')).toBe(true)
  })
})

describe('calcularPlazo — días hábiles', () => {
  it('empieza a contar el día siguiente al de la notificación (Art. 45 e LOJ)', () => {
    // Notificado el lunes 7 de septiembre de 2026 → cuenta desde el martes 8.
    const r = calcularPlazo({ notifiedOn: '2026-09-07', amount: 3, unit: 'habiles' })
    expect(r.startsOn).toBe('2026-09-08')
    expect(r.dueOn).toBe('2026-09-10')
    expect(r.skipped).toEqual([])
  })

  it('salta fin de semana y el asueto del 15 de septiembre', () => {
    // Cuenta desde el viernes 11 (día 1); sábado 12 y domingo 13 fuera; lunes
    // 14 es el día 2; el martes 15 es asueto; miércoles 16 es el día 3.
    const r = calcularPlazo({ notifiedOn: '2026-09-10', amount: 3, unit: 'habiles' })
    expect(r.dueOn).toBe('2026-09-16')
    expect(r.skipped.map((s) => s.date)).toEqual(['2026-09-12', '2026-09-13', '2026-09-15'])
    expect(r.skipped.at(-1)!.reason).toBe('Día de la Independencia')
  })

  it('cuenta los sábados si el tribunal no los tiene de descanso', () => {
    const r = calcularPlazo({
      notifiedOn: '2026-09-10',
      amount: 3,
      unit: 'habiles',
      saturdaysOff: false,
    })
    expect(r.dueOn).toBe('2026-09-14')
  })

  it('acepta días inhábiles adicionales (tribunal cerrado, Art. 45 d)', () => {
    const r = calcularPlazo({
      notifiedOn: '2026-09-07',
      amount: 3,
      unit: 'habiles',
      extraNonWorkingDays: ['2026-09-09'],
    })
    expect(r.dueOn).toBe('2026-09-11')
    expect(r.skipped).toEqual([{ date: '2026-09-09', reason: 'día inhábil agregado' }])
  })

  it('un plazo de cero días vence el mismo día de la notificación', () => {
    const r = calcularPlazo({ notifiedOn: '2026-09-07', amount: 0, unit: 'habiles' })
    expect(r.dueOn).toBe('2026-09-07')
  })
})

describe('calcularPlazo — calendario, meses y años', () => {
  it('cuenta días corridos desde el día siguiente', () => {
    const r = calcularPlazo({
      notifiedOn: '2026-09-07',
      amount: 10,
      unit: 'calendario',
      moveToNextWorkingDay: false,
    })
    expect(r.dueOn).toBe('2026-09-17')
    expect(r.calendarDays).toBe(10)
  })

  it('los meses vencen la víspera de la fecha en que principiaron (Art. 45 c)', () => {
    // Notificado el 15 de enero → empieza el 16 → un mes vence el 15 de febrero.
    const r = calcularPlazo({
      notifiedOn: '2026-01-15',
      amount: 1,
      unit: 'meses',
      moveToNextWorkingDay: false,
    })
    expect(r.dueOn).toBe('2026-02-15')
  })

  it('un año vence la víspera del mismo día del año siguiente', () => {
    const r = calcularPlazo({
      notifiedOn: '2026-03-10',
      amount: 1,
      unit: 'anios',
      moveToNextWorkingDay: false,
    })
    expect(r.dueOn).toBe('2027-03-10')
  })

  it('corre el vencimiento al siguiente día hábil cuando cae en inhábil', () => {
    // 15 de febrero de 2026 es domingo.
    const r = calcularPlazo({ notifiedOn: '2026-01-15', amount: 1, unit: 'meses' })
    expect(r.dueOn).toBe('2026-02-16')
    expect(r.movedForward).toBe(true)
  })
})

describe('addDays', () => {
  it('cruza fin de mes y de año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
})
