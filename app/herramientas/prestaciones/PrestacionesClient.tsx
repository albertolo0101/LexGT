'use client'
import { useMemo, useState } from 'react'
import { calcularPrestaciones, formatQ } from '@/lib/modules/herramientas/prestaciones'

const FIELD =
  'w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink-900 placeholder-ink-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500'
const LABEL = 'mb-1 block text-xs font-medium text-ink-900'

function toNumber(raw: string): number {
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function PrestacionesClient() {
  const [salary, setSalary] = useState('')
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [days, setDays] = useState('')
  const [vacationDays, setVacationDays] = useState('')

  const result = useMemo(
    () =>
      calcularPrestaciones({
        monthlySalary: toNumber(salary),
        years: toNumber(years),
        months: toNumber(months),
        days: toNumber(days),
        unusedVacationDays: toNumber(vacationDays),
      }),
    [salary, years, months, days, vacationDays]
  )

  const hasInput = toNumber(salary) > 0 && result.totalDays > 0

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-xl border border-rule bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Datos</h2>

        <div className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="salario">
              Salario mensual ordinario (Q)
            </label>
            <input
              id="salario"
              inputMode="decimal"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="3500.00"
              className={FIELD}
            />
          </div>

          <div>
            <p className={LABEL}>Tiempo servido</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'anios', label: 'Años', value: years, set: setYears },
                { id: 'meses', label: 'Meses', value: months, set: setMonths },
                { id: 'dias', label: 'Días', value: days, set: setDays },
              ].map((f) => (
                <div key={f.id}>
                  <input
                    id={f.id}
                    inputMode="numeric"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="0"
                    aria-label={f.label}
                    className={FIELD}
                  />
                  <span className="mt-1 block text-center text-[11px] text-ink-500">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="vacaciones">
              Días de vacaciones no gozadas (opcional)
            </label>
            <input
              id="vacaciones"
              inputMode="numeric"
              value={vacationDays}
              onChange={(e) => setVacationDays(e.target.value)}
              placeholder="0"
              className={FIELD}
            />
          </div>
        </div>

        <p className="mt-5 border-t border-rule pt-4 text-[11px] leading-relaxed text-ink-500">
          Cálculo referencial. Aguinaldo y bono 14 se prorratean sobre el período anual en curso
          (los períodos anteriores ya se pagaron en su fecha). No contempla causa justa de despido
          (Art. 77), ventajas económicas ni promedio de salarios variables.
        </p>
      </section>

      <section className="rounded-xl border border-rule bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Resultado</h2>

        {!hasInput ? (
          <p className="text-sm text-ink-500">
            Ingresa un salario y el tiempo servido para ver el desglose.
          </p>
        ) : (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-paper-2 px-3 py-2">
                <dt className="text-ink-500">Tiempo total</dt>
                <dd className="text-sm font-medium text-ink-900">
                  {result.totalDays} días ({result.serviceFactor.toFixed(2)} años)
                </dd>
              </div>
              <div className="rounded-lg bg-paper-2 px-3 py-2">
                <dt className="text-ink-500">Salario diario</dt>
                <dd className="text-sm font-medium text-ink-900">{formatQ(result.dailySalary)}</dd>
              </div>
            </dl>

            <ul className="divide-y divide-rule">
              {result.lines.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900">{line.label}</p>
                    <p className="text-[11px] text-ink-500">{line.basis}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-medium text-ink-900">
                    {formatQ(line.amount)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-navy-900 px-4 py-3 text-white">
              <span className="text-sm font-medium">Total a pagar</span>
              <span className="font-serif text-lg text-gold-200">{formatQ(result.total)}</span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
