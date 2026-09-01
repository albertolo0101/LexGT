'use client'
import { useMemo, useState } from 'react'
import {
  ACTOS,
  actoDef,
  calcularTimbres,
  PAPEL_PROTOCOLO_DEFAULT,
  type ActoDef,
  type ActoKey,
} from '@/lib/modules/herramientas/timbres'
import { formatQ } from '@/lib/modules/herramientas/format'
import { CARD, FIELD, LABEL, NOTE, RESULT_BOX } from '../ui'

function toNumber(raw: string): number {
  const n = Number(raw.replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

const REGIMENES: { value: ActoDef['fiscal']; label: string }[] = [
  { value: 'timbre', label: 'Afecto a timbre fiscal (3%)' },
  { value: 'iva', label: 'Gravado con IVA (12%) — sin timbre fiscal' },
  { value: 'exento', label: 'Exento / sin valor determinado' },
]

export default function TimbresClient() {
  const [acto, setActo] = useState<ActoKey>('compraventa_inmueble')
  const [value, setValue] = useState('')
  const [regimenOverride, setRegimenOverride] = useState<ActoDef['fiscal'] | null>(null)
  const [sheets, setSheets] = useState('')
  const [sheetPrice, setSheetPrice] = useState(String(PAPEL_PROTOCOLO_DEFAULT))

  const def = actoDef(acto)
  const regimen = regimenOverride ?? def.fiscal

  const result = useMemo(
    () =>
      calcularTimbres({
        acto,
        contractValue: toNumber(value),
        regimen,
        protocolSheets: toNumber(sheets),
        protocolSheetPrice: toNumber(sheetPrice),
      }),
    [acto, value, regimen, sheets, sheetPrice]
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Documento</h2>

        <div className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="acto">
              Tipo de documento
            </label>
            <select
              id="acto"
              value={acto}
              onChange={(e) => {
                setActo(e.target.value as ActoKey)
                setRegimenOverride(null)
              }}
              className={FIELD}
            >
              {ACTOS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL} htmlFor="valor">
              Valor del contrato (Q)
            </label>
            <input
              id="valor"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.notarial === 'fijo' ? 'No aplica' : '150000'}
              disabled={def.notarial === 'fijo'}
              className={`${FIELD} disabled:bg-paper-2 disabled:text-ink-400`}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="regimen">
              Régimen fiscal
            </label>
            <select
              id="regimen"
              value={regimen}
              onChange={(e) => setRegimenOverride(e.target.value as ActoDef['fiscal'])}
              className={FIELD}
            >
              {REGIMENES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="hojas">
                Hojas de protocolo
              </label>
              <input
                id="hojas"
                inputMode="numeric"
                value={sheets}
                onChange={(e) => setSheets(e.target.value)}
                placeholder="0"
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="precio-hoja">
                Valor por hoja (Q)
              </label>
              <input
                id="precio-hoja"
                inputMode="decimal"
                value={sheetPrice}
                onChange={(e) => setSheetPrice(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>
        </div>

        <p className={`mt-5 border-t border-rule pt-4 ${NOTE}`}>
          Timbre notarial: Decreto 82-96 — 2 por millar sobre el valor del contrato, mínimo Q1.00 y
          máximo Q300.00; Q10.00 en actas notariales, legalización de firmas, protocolaciones y
          contratos de valor indeterminado. Timbre fiscal: Decreto 37-92 — 3% sobre el valor del acto
          afecto. Los documentos con cuota fija del Art. 5 del 37-92 no están incluidos. Cálculo
          referencial.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Timbres a adherir</h2>

        {result.lines.length === 0 ? (
          <p className="text-sm text-ink-500">
            Ingresa el valor del contrato para calcular los timbres.
          </p>
        ) : (
          <>
            <div className={`mb-4 ${RESULT_BOX}`}>
              <p className="text-xs text-navy-100/80">Total</p>
              <p className="font-serif text-2xl text-gold-200">{formatQ(result.total)}</p>
            </div>

            <div className="space-y-4">
              {result.lines.map((line) => (
                <div key={line.key} className="rounded-lg border border-rule p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{line.label}</p>
                      <p className="text-[11px] text-ink-500">{line.basis}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-ink-900">
                      {formatQ(line.amount)}
                    </p>
                  </div>

                  {line.descomposicion && line.descomposicion.timbres.length > 0 && (
                    <div className="mt-2 border-t border-rule pt-2">
                      <ul className="flex flex-wrap gap-1.5">
                        {line.descomposicion.timbres.map((t) => (
                          <li
                            key={t.valor}
                            className="rounded border border-gold-400/60 bg-gold-50 px-2 py-0.5 text-[11px] text-gold-700"
                          >
                            {t.cantidad} × {formatQ(t.valor)}
                          </li>
                        ))}
                      </ul>
                      {line.descomposicion.excedente > 0 && (
                        <p className="mt-1.5 text-[11px] text-amber-700">
                          No hay timbres para el remanente exacto: se cubren{' '}
                          {formatQ(line.descomposicion.cubierto)} ({formatQ(line.descomposicion.excedente)} de
                          más).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {result.ivaEstimado !== null && (
              <p className="mt-4 rounded-lg bg-paper-2 px-3 py-2 text-[11px] text-ink-700">
                IVA estimado del acto (12%): <strong>{formatQ(result.ivaEstimado)}</strong> — se paga
                por declaración, no con timbres.
              </p>
            )}

            {result.notes.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {result.notes.map((note, i) => (
                  <li key={i} className={NOTE}>
                    · {note}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
