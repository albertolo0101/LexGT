import { describe, it, expect } from 'vitest'
import {
  closureError,
  convertArea,
  legToAzimuth,
  legsToPoints,
  polygonArea,
  polygonPerimeter,
  MANZANA_M2,
} from './area'

describe('polygonArea', () => {
  it('calcula un cuadrado de 10 × 10', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(polygonArea(square)).toBe(100)
    expect(polygonPerimeter(square)).toBe(40)
  })

  it('no depende del sentido del recorrido', () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ]
    expect(polygonArea(cw)).toBe(100)
  })

  it('devuelve 0 con menos de tres puntos', () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe(0)
  })

  it('calcula un triángulo', () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }])).toBe(6)
  })
})

describe('legToAzimuth', () => {
  const leg = (ns: 'N' | 'S', degrees: number, ew: 'E' | 'W') => ({
    ns, degrees, minutes: 0, seconds: 0, ew, distance: 1,
  })

  it('convierte los cuatro cuadrantes', () => {
    expect(legToAzimuth(leg('N', 45, 'E'))).toBe(45)
    expect(legToAzimuth(leg('S', 45, 'E'))).toBe(135)
    expect(legToAzimuth(leg('S', 45, 'W'))).toBe(225)
    expect(legToAzimuth(leg('N', 45, 'W'))).toBe(315)
  })

  it('suma minutos y segundos', () => {
    expect(legToAzimuth({ ns: 'N', degrees: 10, minutes: 30, seconds: 36, ew: 'E', distance: 1 })).toBeCloseTo(10.51, 4)
  })
})

describe('legsToPoints', () => {
  it('cierra un cuadrado de 20 m por rumbos', () => {
    const legs = [
      { ns: 'N' as const, degrees: 90, minutes: 0, seconds: 0, ew: 'E' as const, distance: 20 },
      { ns: 'S' as const, degrees: 0, minutes: 0, seconds: 0, ew: 'E' as const, distance: 20 },
      { ns: 'S' as const, degrees: 90, minutes: 0, seconds: 0, ew: 'W' as const, distance: 20 },
      { ns: 'N' as const, degrees: 0, minutes: 0, seconds: 0, ew: 'W' as const, distance: 20 },
    ]
    const points = legsToPoints(legs)
    expect(points).toHaveLength(4)
    expect(polygonArea(points)).toBeCloseTo(400, 6)
    expect(closureError(legs)).toBeCloseTo(0, 6)
  })

  it('reporta el error de cierre de una poligonal abierta', () => {
    const legs = [
      { ns: 'N' as const, degrees: 90, minutes: 0, seconds: 0, ew: 'E' as const, distance: 20 },
      { ns: 'S' as const, degrees: 0, minutes: 0, seconds: 0, ew: 'E' as const, distance: 20 },
      { ns: 'S' as const, degrees: 90, minutes: 0, seconds: 0, ew: 'W' as const, distance: 15 },
      { ns: 'N' as const, degrees: 0, minutes: 0, seconds: 0, ew: 'W' as const, distance: 20 },
    ]
    expect(closureError(legs)).toBeCloseTo(5, 6)
  })
})

describe('convertArea', () => {
  it('convierte una manzana', () => {
    const c = convertArea(MANZANA_M2)
    expect(c.manzanas).toBeCloseTo(1, 9)
    expect(c.varas2).toBeCloseTo(10_000, 6)
    expect(c.caballerias).toBeCloseTo(1 / 64, 9)
  })

  it('convierte una hectárea', () => {
    expect(convertArea(10_000).hectareas).toBe(1)
  })
})
