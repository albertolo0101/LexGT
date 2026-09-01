import { describe, it, expect } from 'vitest'
import {
  actoDef,
  calcularTimbres,
  descomponerTimbres,
  timbreFiscal,
  timbreNotarial,
} from './timbres'

describe('timbreNotarial', () => {
  it('cobra 2 por millar sobre el valor del contrato', () => {
    expect(timbreNotarial(actoDef('mutuo'), 50_000)).toBe(100)
  })

  it('respeta el techo de Q300', () => {
    expect(timbreNotarial(actoDef('mutuo'), 500_000)).toBe(300)
    expect(timbreNotarial(actoDef('compraventa_inmueble'), 2_000_000)).toBe(300)
  })

  it('respeta el piso de Q1', () => {
    expect(timbreNotarial(actoDef('mutuo'), 100)).toBe(1)
  })

  it('cobra la cuota fija de Q10 en actas y valor indeterminado', () => {
    expect(timbreNotarial(actoDef('acta_notarial'), 0)).toBe(10)
    expect(timbreNotarial(actoDef('valor_indeterminado'), 999_999)).toBe(10)
  })

  it('es cero sin valor de contrato', () => {
    expect(timbreNotarial(actoDef('mutuo'), 0)).toBe(0)
  })
})

describe('timbreFiscal', () => {
  it('cobra 3% cuando el acto está afecto', () => {
    expect(timbreFiscal('timbre', 25_000)).toBe(750)
  })

  it('no cobra nada si el acto va gravado con IVA o está exento', () => {
    expect(timbreFiscal('iva', 25_000)).toBe(0)
    expect(timbreFiscal('exento', 25_000)).toBe(0)
  })
})

describe('descomponerTimbres', () => {
  it('usa el menor número de timbres', () => {
    const d = descomponerTimbres(136)
    expect(d.timbres).toEqual([
      { valor: 100, cantidad: 1 },
      { valor: 25, cantidad: 1 },
      { valor: 10, cantidad: 1 },
      { valor: 1, cantidad: 1 },
    ])
    expect(d.excedente).toBe(0)
  })

  it('resuelve remanentes donde el algoritmo voraz falla', () => {
    // Q0.30 son tres timbres de Q0.10, no Q0.25 + un remanente imposible.
    const d = descomponerTimbres(0.3)
    expect(d.timbres).toEqual([{ valor: 0.1, cantidad: 3 }])
    expect(d.excedente).toBe(0)
  })

  it('sube al siguiente monto alcanzable cuando el impuesto trae centavos sueltos', () => {
    const d = descomponerTimbres(3.47)
    expect(d.cubierto).toBe(3.5)
    expect(d.excedente).toBe(0.03)
    expect(d.timbres.reduce((s, t) => s + t.valor * t.cantidad, 0)).toBeCloseTo(3.5, 2)
  })

  it('devuelve vacío con monto cero', () => {
    expect(descomponerTimbres(0)).toEqual({ cubierto: 0, excedente: 0, timbres: [] })
  })

  it('cubre montos grandes con timbres de Q100', () => {
    const d = descomponerTimbres(1_250)
    expect(d.timbres[0]).toEqual({ valor: 100, cantidad: 12 })
    expect(d.cubierto).toBe(1_250)
  })
})

describe('calcularTimbres', () => {
  it('mutuo: timbre notarial + timbre fiscal del 3%', () => {
    const r = calcularTimbres({ acto: 'mutuo', contractValue: 100_000 })
    const amounts = Object.fromEntries(r.lines.map((l) => [l.key, l.amount]))
    expect(amounts.notarial).toBe(200)
    expect(amounts.fiscal).toBe(3_000)
    expect(r.total).toBe(3_200)
    expect(r.ivaEstimado).toBeNull()
  })

  it('compraventa de inmueble: IVA en vez de timbre fiscal', () => {
    const r = calcularTimbres({ acto: 'compraventa_inmueble', contractValue: 400_000 })
    expect(r.lines.some((l) => l.key === 'fiscal')).toBe(false)
    expect(r.lines.find((l) => l.key === 'notarial')!.amount).toBe(300)
    expect(r.ivaEstimado).toBe(48_000)
    expect(r.notes.join(' ')).toContain('IVA')
  })

  it('suma el papel sellado de protocolo', () => {
    const r = calcularTimbres({
      acto: 'mandato',
      contractValue: 10_000,
      protocolSheets: 2,
      protocolSheetPrice: 10,
    })
    expect(r.lines.find((l) => l.key === 'protocolo')!.amount).toBe(20)
    expect(r.total).toBe(20 + 20 + 300)
  })

  it('el régimen fiscal se puede forzar', () => {
    const r = calcularTimbres({
      acto: 'compraventa_mueble',
      contractValue: 10_000,
      regimen: 'timbre',
    })
    expect(r.lines.find((l) => l.key === 'fiscal')!.amount).toBe(300)
  })

  it('avisa cuando el 2 por millar toca el techo', () => {
    const r = calcularTimbres({ acto: 'mutuo', contractValue: 1_000_000 })
    expect(r.notes.join(' ')).toContain('Q300.00')
  })
})
