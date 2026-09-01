'use client'
import { useMemo, useState } from 'react'
import {
  ASUNTOS,
  asuntoDef,
  calcularHonorarios,
  type AsuntoKey,
  type Instancia,
} from '@/lib/modules/herramientas/arancel'
import { formatQ } from '@/lib/modules/herramientas/format'
import { CARD, FIELD, LABEL, NOTE, RESULT_BOX } from '../ui'

function toNumber(raw: string): number | null {
  const clean = raw.replace(/,/g, '').trim()
  if (clean === '') return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

export default function ArancelClient() {
  const [asunto, setAsunto] = useState<AsuntoKey>('general')
  const [amount, setAmount] = useState('')
  const [instancia, setInstancia] = useState<Instancia>('primera')

  const def = asuntoDef(asunto)
  const parsedAmount = toNumber(amount)

  const result = useMemo(
    () => calcularHonorarios({ asunto, amount: parsedAmount, instancia }),
    [asunto, parsedAmount, instancia]
  )

  const hasResult = result.min > 0

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Datos</h2>

        <div className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="asunto">
              Tipo de asunto
            </label>
            <select
              id="asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value as AsuntoKey)}
              className={FIELD}
            >
              {ASUNTOS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-500">
              {def.citation} — {def.rule}
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="cuantia">
              Cuantía del asunto (Q)
              {def.allowsIndeterminate && (
                <span className="font-normal text-ink-500"> — déjala vacía si es indeterminada</span>
              )}
            </label>
            <input
              id="cuantia"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={def.allowsIndeterminate ? 'Indeterminada' : '100000'}
              className={FIELD}
            />
          </div>

          {def.hasInstancia && (
            <div>
              <p className={LABEL}>Instancia</p>
              <div className="inline-flex rounded-lg border border-rule p-1">
                {(
                  [
                    ['primera', 'Primera'],
                    ['segunda', 'Segunda (mitad)'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setInstancia(id)}
                    className={[
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      instancia === id ? 'bg-navy-900 text-white' : 'text-ink-700 hover:text-ink-900',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className={`mt-5 border-t border-rule pt-4 ${NOTE}`}>
          Base: Decreto 111-96 (Arancel de Abogados, Árbitros, Procuradores, Mandatarios Judiciales,
          Expertos, Interventores y Depositarios). Cálculo referencial de honorarios mínimos; el
          decreto es de 1996 y los honorarios de mercado suelen ser mayores.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Honorarios sugeridos</h2>

        {!hasResult ? (
          <p className="text-sm text-ink-500">
            {def.needsAmount
              ? 'Ingresa la cuantía del asunto para ver el honorario mínimo.'
              : 'Elige un tipo de asunto para ver el honorario del arancel.'}
          </p>
        ) : (
          <>
            <div className={`mb-4 ${RESULT_BOX}`}>
              <p className="text-xs text-navy-100/80">
                {result.max === null ? 'Honorario mínimo' : 'Rango del arancel'}
              </p>
              <p className="font-serif text-2xl text-gold-200">
                {result.max === null
                  ? formatQ(result.min)
                  : `${formatQ(result.min)} – ${formatQ(result.max)}`}
              </p>
            </div>

            {result.lines.length > 0 && (
              <ul className="divide-y divide-rule">
                {result.lines.map((line, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-2">
                    <span className="text-xs text-ink-700">{line.label}</span>
                    <span className="whitespace-nowrap text-sm font-medium text-ink-900">
                      {formatQ(line.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <ul className="mt-4 space-y-1.5">
              {result.notes.map((note, i) => (
                <li key={i} className={NOTE}>
                  · {note}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
