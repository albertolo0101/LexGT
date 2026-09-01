import { describe, it, expect } from 'vitest'
import { applyBrackets, calcularHonorarios } from './arancel'

describe('applyBrackets', () => {
  it('parte el monto en tramos', () => {
    const lines = applyBrackets(150_000, [
      { upTo: 100_000, rate: 0.15 },
      { upTo: null, rate: 0.05 },
    ])
    expect(lines.map((l) => l.amount)).toEqual([15_000, 2_500])
  })

  it('no emite tramos vacíos', () => {
    const lines = applyBrackets(40_000, [
      { upTo: 100_000, rate: 0.15 },
      { upTo: null, rate: 0.05 },
    ])
    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(6_000)
  })
})

describe('calcularHonorarios', () => {
  it('regla general: 15% hasta Q100,000 y 5% del exceso', () => {
    const r = calcularHonorarios({ asunto: 'general', amount: 250_000 })
    expect(r.min).toBe(15_000 + 7_500)
    expect(r.max).toBeNull()
  })

  it('segunda instancia es la mitad', () => {
    const primera = calcularHonorarios({ asunto: 'general', amount: 250_000 })
    const segunda = calcularHonorarios({ asunto: 'general', amount: 250_000, instancia: 'segunda' })
    expect(segunda.min).toBe(primera.min / 2)
    expect(segunda.notes.join(' ')).toContain('segunda instancia')
  })

  it('ejecución: 10% hasta Q50,000 y 5% del exceso', () => {
    const r = calcularHonorarios({ asunto: 'ejecucion', amount: 150_000 })
    expect(r.min).toBe(5_000 + 5_000)
  })

  it('sucesorio: 7% / 3% / 1% por tramos', () => {
    const r = calcularHonorarios({ asunto: 'sucesorio', amount: 600_000 })
    // 50,000×7% = 3,500 · 450,000×3% = 13,500 · 100,000×1% = 1,000
    expect(r.lines.map((l) => l.amount)).toEqual([3_500, 13_500, 1_000])
    expect(r.min).toBe(18_000)
  })

  it('sucesorio pequeño solo usa el primer tramo', () => {
    const r = calcularHonorarios({ asunto: 'sucesorio', amount: 30_000 })
    expect(r.min).toBe(2_100)
  })

  it('la segunda instancia no aplica al sucesorio', () => {
    const r = calcularHonorarios({ asunto: 'sucesorio', amount: 30_000, instancia: 'segunda' })
    expect(r.min).toBe(2_100)
  })

  it('jurisdicción voluntaria: Q800 de base + 5%', () => {
    const r = calcularHonorarios({ asunto: 'jurisdiccion_voluntaria', amount: 20_000 })
    expect(r.min).toBe(1_800)
    expect(r.lines).toHaveLength(2)
  })

  it('jurisdicción voluntaria de cuantía indeterminada devuelve el rango del arancel', () => {
    const r = calcularHonorarios({ asunto: 'jurisdiccion_voluntaria', amount: null })
    expect(r.min).toBe(800)
    expect(r.max).toBe(5_000)
  })

  it('casación y amparo devuelven el rango fijo', () => {
    const r = calcularHonorarios({ asunto: 'casacion_amparo', amount: null })
    expect(r.min).toBe(1_500)
    expect(r.max).toBe(5_000)
  })

  it('pide la cuantía cuando hace falta', () => {
    const r = calcularHonorarios({ asunto: 'general', amount: null })
    expect(r.min).toBe(0)
    expect(r.notes.join(' ')).toContain('cuantía')
  })

  it('siempre recuerda que son honorarios mínimos', () => {
    const r = calcularHonorarios({ asunto: 'general', amount: 10_000 })
    expect(r.notes.join(' ')).toContain('MÍNIMOS')
  })
})
