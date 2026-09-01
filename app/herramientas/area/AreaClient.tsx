'use client'
import { useMemo, useState } from 'react'
import {
  closureError,
  convertArea,
  formatNumber,
  legsToPoints,
  polygonArea,
  polygonPerimeter,
  type Leg,
  type Point,
} from '@/lib/modules/herramientas/area'
import { Ico } from '@/components/icons'

type Mode = 'coordenadas' | 'rumbos'

type CoordRow = { x: string; y: string }
type LegRow = { ns: 'N' | 'S'; degrees: string; minutes: string; seconds: string; ew: 'E' | 'W'; distance: string }

// Sin ancho: `w-full` y `w-12` son la misma utilidad de Tailwind y el orden en
// la hoja generada —no en el atributo— decide cuál gana. El ancho lo pone cada
// campo.
const FIELD_BASE =
  'rounded-lg border border-rule bg-white px-2.5 py-1.5 text-sm text-ink-900 placeholder-ink-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500'
const FIELD = `${FIELD_BASE} w-full`
const FIELD_CELL = `${FIELD_BASE} w-full px-1 text-center`
// Rejilla de una fila de rumbo: nº, N/S, grados, minutos, segundos, E/O,
// distancia y el botón de borrar. La cabecera usa la misma plantilla.
const LEG_GRID = 'grid grid-cols-[1rem_3.2rem_1fr_1fr_1fr_3.2rem_1.8fr_1rem] items-center gap-1.5'

const num = (raw: string) => {
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const emptyCoord: CoordRow = { x: '', y: '' }
const emptyLeg: LegRow = { ns: 'N', degrees: '', minutes: '', seconds: '', ew: 'E', distance: '' }

// Dibujo del polígono, normalizado a la caja del SVG.
function PolygonPreview({ points }: { points: Point[] }) {
  if (points.length < 3) return null
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const width = Math.max(...xs) - minX || 1
  const height = Math.max(...ys) - minY || 1
  const scale = 180 / Math.max(width, height)
  const offX = (200 - width * scale) / 2
  const offY = (200 - height * scale) / 2
  // El eje Y del SVG crece hacia abajo; el del terreno hacia el norte.
  const project = (p: Point) => ({
    cx: (p.x - minX) * scale + offX,
    cy: 200 - ((p.y - minY) * scale + offY),
  })
  const d = points
    .map((p, i) => {
      const { cx, cy } = project(p)
      return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(2)} ${cy.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 200 200" className="mt-4 h-40 w-full" role="img" aria-label="Vista del polígono">
      <path d={`${d} Z`} fill="rgba(200,162,75,0.18)" stroke="#15315a" strokeWidth={1.5} />
      {points.map((p, i) => {
        const { cx, cy } = project(p)
        return <circle key={i} cx={cx} cy={cy} r={2.5} fill="#c8a24b" />
      })}
    </svg>
  )
}

export default function AreaClient() {
  const [mode, setMode] = useState<Mode>('coordenadas')
  const [coords, setCoords] = useState<CoordRow[]>([{ ...emptyCoord }, { ...emptyCoord }, { ...emptyCoord }])
  const [legs, setLegs] = useState<LegRow[]>([{ ...emptyLeg }, { ...emptyLeg }, { ...emptyLeg }])

  const parsedLegs: Leg[] = useMemo(
    () =>
      legs
        .filter((l) => num(l.distance) > 0)
        .map((l) => ({
          ns: l.ns,
          ew: l.ew,
          degrees: num(l.degrees),
          minutes: num(l.minutes),
          seconds: num(l.seconds),
          distance: num(l.distance),
        })),
    [legs]
  )

  const points: Point[] = useMemo(() => {
    if (mode === 'coordenadas') {
      return coords
        .filter((c) => c.x.trim() !== '' && c.y.trim() !== '')
        .map((c) => ({ x: num(c.x), y: num(c.y) }))
    }
    return legsToPoints(parsedLegs)
  }, [mode, coords, parsedLegs])

  const area = polygonArea(points)
  const perimeter =
    mode === 'rumbos' ? parsedLegs.reduce((sum, l) => sum + l.distance, 0) : polygonPerimeter(points)
  const conversions = convertArea(area)
  const closure = mode === 'rumbos' && parsedLegs.length >= 3 ? closureError(parsedLegs) : null

  const updateCoord = (i: number, key: keyof CoordRow, value: string) =>
    setCoords((rows) => rows.map((r, j) => (i === j ? { ...r, [key]: value } : r)))

  const updateLeg = (i: number, key: keyof LegRow, value: string) =>
    setLegs((rows) => rows.map((r, j) => (i === j ? { ...r, [key]: value } : r)))

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-rule bg-white p-1">
        {(
          [
            ['coordenadas', 'Coordenadas'],
            ['rumbos', 'Rumbos y distancias'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              mode === id ? 'bg-navy-900 text-white' : 'text-ink-700 hover:text-ink-900',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-rule bg-white p-5">
          {mode === 'coordenadas' ? (
            <>
              <h2 className="mb-1 text-sm font-semibold text-ink-900">Vértices (metros)</h2>
              <p className="mb-4 text-[11px] text-ink-500">
                En orden alrededor del perímetro. X crece al este, Y al norte. No repitas el primer punto.
              </p>
              <div className="space-y-2">
                {coords.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-xs text-ink-500">{i + 1}</span>
                    <input
                      inputMode="decimal"
                      value={row.x}
                      onChange={(e) => updateCoord(i, 'x', e.target.value)}
                      placeholder="X"
                      aria-label={`X del vértice ${i + 1}`}
                      className={FIELD}
                    />
                    <input
                      inputMode="decimal"
                      value={row.y}
                      onChange={(e) => updateCoord(i, 'y', e.target.value)}
                      placeholder="Y"
                      aria-label={`Y del vértice ${i + 1}`}
                      className={FIELD}
                    />
                    <button
                      onClick={() => setCoords((rows) => (rows.length > 3 ? rows.filter((_, j) => j !== i) : rows))}
                      disabled={coords.length <= 3}
                      className="p-1 text-ink-400 transition-colors hover:text-red-600 disabled:opacity-30"
                      aria-label={`Eliminar vértice ${i + 1}`}
                    >
                      <Ico.x className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCoords((rows) => [...rows, { ...emptyCoord }])}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy-700 transition-colors hover:text-navy-900"
              >
                <Ico.plus className="h-3.5 w-3.5" /> Agregar vértice
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-1 text-sm font-semibold text-ink-900">Lados</h2>
              <p className="mb-4 text-[11px] text-ink-500">
                Rumbo por cuadrante y distancia en metros. Ejemplo: N 45° 30&apos; 00&quot; E · 32.50 m.
              </p>
              <div className={`${LEG_GRID} mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-500`}>
                <span />
                <span className="text-center">N/S</span>
                <span className="text-center">Gr</span>
                <span className="text-center">Min</span>
                <span className="text-center">Seg</span>
                <span className="text-center">E/O</span>
                <span className="text-center">Dist. m</span>
                <span />
              </div>
              <div className="space-y-2">
                {legs.map((row, i) => (
                  <div key={i} className={LEG_GRID}>
                    <span className="text-xs text-ink-500">{i + 1}</span>
                    <select
                      value={row.ns}
                      onChange={(e) => updateLeg(i, 'ns', e.target.value)}
                      aria-label={`Norte o sur del lado ${i + 1}`}
                      className={FIELD_CELL}
                    >
                      <option value="N">N</option>
                      <option value="S">S</option>
                    </select>
                    <input
                      inputMode="decimal"
                      value={row.degrees}
                      onChange={(e) => updateLeg(i, 'degrees', e.target.value)}
                      placeholder="0"
                      aria-label={`Grados del lado ${i + 1}`}
                      className={FIELD_CELL}
                    />
                    <input
                      inputMode="decimal"
                      value={row.minutes}
                      onChange={(e) => updateLeg(i, 'minutes', e.target.value)}
                      placeholder="0"
                      aria-label={`Minutos del lado ${i + 1}`}
                      className={FIELD_CELL}
                    />
                    <input
                      inputMode="decimal"
                      value={row.seconds}
                      onChange={(e) => updateLeg(i, 'seconds', e.target.value)}
                      placeholder="0"
                      aria-label={`Segundos del lado ${i + 1}`}
                      className={FIELD_CELL}
                    />
                    <select
                      value={row.ew}
                      onChange={(e) => updateLeg(i, 'ew', e.target.value)}
                      aria-label={`Este u oeste del lado ${i + 1}`}
                      className={FIELD_CELL}
                    >
                      <option value="E">E</option>
                      <option value="W">O</option>
                    </select>
                    <input
                      inputMode="decimal"
                      value={row.distance}
                      onChange={(e) => updateLeg(i, 'distance', e.target.value)}
                      placeholder="0.00"
                      aria-label={`Distancia del lado ${i + 1}`}
                      className={`${FIELD_BASE} w-full px-2`}
                    />
                    <button
                      onClick={() => setLegs((rows) => (rows.length > 3 ? rows.filter((_, j) => j !== i) : rows))}
                      disabled={legs.length <= 3}
                      className="text-ink-400 transition-colors hover:text-red-600 disabled:opacity-30"
                      aria-label={`Eliminar lado ${i + 1}`}
                    >
                      <Ico.x className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLegs((rows) => [...rows, { ...emptyLeg }])}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy-700 transition-colors hover:text-navy-900"
              >
                <Ico.plus className="h-3.5 w-3.5" /> Agregar lado
              </button>
            </>
          )}
        </section>

        <section className="rounded-xl border border-rule bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-900">Resultado</h2>

          {points.length < 3 || area === 0 ? (
            <p className="text-sm text-ink-500">
              {mode === 'coordenadas'
                ? 'Ingresa al menos tres vértices para calcular el área.'
                : 'Ingresa al menos tres lados con distancia para calcular el área.'}
            </p>
          ) : (
            <>
              <div className="mb-4 rounded-lg bg-navy-900 px-4 py-3 text-white">
                <p className="text-xs text-navy-100/80">Área</p>
                <p className="font-serif text-2xl text-gold-200">{formatNumber(conversions.m2)} m²</p>
              </div>

              <dl className="divide-y divide-rule text-sm">
                {[
                  ['Varas²', formatNumber(conversions.varas2)],
                  ['Hectáreas', formatNumber(conversions.hectareas, 4)],
                  ['Manzanas', formatNumber(conversions.manzanas, 4)],
                  ['Caballerías', formatNumber(conversions.caballerias, 6)],
                  ['Perímetro', `${formatNumber(perimeter)} m`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-ink-700">{label}</dt>
                    <dd className="font-medium text-ink-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {closure !== null && (
                <p
                  className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${
                    closure < 0.5 ? 'bg-paper-2 text-ink-700' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  Error de cierre: {formatNumber(closure, 3)} m
                  {closure >= 0.5 && ' — revisa rumbos y distancias; la poligonal no cierra.'}
                </p>
              )}

              <PolygonPreview points={points} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
