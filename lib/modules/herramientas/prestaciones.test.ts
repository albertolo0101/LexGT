import { describe, it, expect } from 'vitest'
import { calcularPrestaciones, totalServiceDays } from './prestaciones'

describe('totalServiceDays', () => {
  it('cuenta 30/360', () => {
    expect(totalServiceDays({ years: 1, months: 2, days: 15 })).toBe(435)
  })

  it('nunca es negativo', () => {
    expect(totalServiceDays({ years: -3, months: 0, days: 0 })).toBe(0)
  })
})

describe('calcularPrestaciones', () => {
  it('un año exacto paga un mes por cada prestación y 15 días de vacaciones', () => {
    const r = calcularPrestaciones({ monthlySalary: 3000, years: 1, months: 0, days: 0 })
    const amounts = Object.fromEntries(r.lines.map((l) => [l.key, l.amount]))

    expect(amounts.indemnizacion).toBe(3000)
    expect(amounts.aguinaldo).toBe(3000)
    expect(amounts.bono14).toBe(3000)
    expect(amounts.vacaciones).toBe(1500) // 100/día × 15
    expect(r.total).toBe(10500)
  })

  it('prorratea la indemnización sobre toda la antigüedad', () => {
    const r = calcularPrestaciones({ monthlySalary: 4000, years: 3, months: 6, days: 0 })
    const indemnizacion = r.lines.find((l) => l.key === 'indemnizacion')!
    expect(indemnizacion.amount).toBe(14000) // 4000 × 3.5
  })

  it('topa aguinaldo y bono 14 al período anual en curso', () => {
    const r = calcularPrestaciones({ monthlySalary: 4000, years: 5, months: 0, days: 0 })
    const amounts = Object.fromEntries(r.lines.map((l) => [l.key, l.amount]))
    expect(amounts.aguinaldo).toBe(4000)
    expect(amounts.bono14).toBe(4000)
    expect(amounts.vacaciones).toBe(2000)
  })

  it('prorratea el período en curso cuando no llega al año', () => {
    const r = calcularPrestaciones({ monthlySalary: 3600, years: 0, months: 6, days: 0 })
    const amounts = Object.fromEntries(r.lines.map((l) => [l.key, l.amount]))
    expect(amounts.indemnizacion).toBe(1800)
    expect(amounts.aguinaldo).toBe(1800)
    expect(amounts.vacaciones).toBe(900) // 120/día × 15 × 0.5
  })

  it('agrega la línea de vacaciones no gozadas solo si hay días pendientes', () => {
    const sin = calcularPrestaciones({ monthlySalary: 3000, years: 1, months: 0, days: 0 })
    expect(sin.lines.some((l) => l.key === 'vacacionesPendientes')).toBe(false)

    const con = calcularPrestaciones({
      monthlySalary: 3000,
      years: 1,
      months: 0,
      days: 0,
      unusedVacationDays: 10,
    })
    const pendientes = con.lines.find((l) => l.key === 'vacacionesPendientes')!
    expect(pendientes.amount).toBe(1000)
    expect(con.total).toBe(11500)
  })

  it('devuelve ceros con tiempo cero', () => {
    const r = calcularPrestaciones({ monthlySalary: 5000, years: 0, months: 0, days: 0 })
    expect(r.total).toBe(0)
    expect(r.totalDays).toBe(0)
  })
})
