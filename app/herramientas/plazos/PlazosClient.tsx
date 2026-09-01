'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  calcularPlazo,
  formatLongDate,
  type PlazoUnit,
} from '@/lib/modules/herramientas/plazos'
import { CARD, FIELD, LABEL, NOTE, RESULT_BOX } from '../ui'

const UNITS: { value: PlazoUnit; label: string }[] = [
  { value: 'habiles', label: 'Días hábiles' },
  { value: 'calendario', label: 'Días calendario' },
  { value: 'meses', label: 'Meses' },
  { value: 'anios', label: 'Años' },
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default function PlazosClient() {
  const [notifiedOn, setNotifiedOn] = useState('')
  const [amount, setAmount] = useState('3')
  const [unit, setUnit] = useState<PlazoUnit>('habiles')
  const [saturdaysOff, setSaturdaysOff] = useState(true)
  const [includeLocalHoliday, setIncludeLocalHoliday] = useState(false)
  const [extraRaw, setExtraRaw] = useState('')

  // La fecha de hoy se pone al montar: calcularla en el render rompería la
  // hidratación (el servidor no está en la zona horaria del lector).
  useEffect(() => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    setNotifiedOn(local.toISOString().slice(0, 10))
  }, [])

  const extraNonWorkingDays = useMemo(
    () =>
      extraRaw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => ISO_DATE.test(s)),
    [extraRaw]
  )

  const parsedAmount = Number(amount)
  const valid = ISO_DATE.test(notifiedOn) && Number.isFinite(parsedAmount) && parsedAmount > 0

  const result = useMemo(() => {
    if (!valid) return null
    return calcularPlazo({
      notifiedOn,
      amount: parsedAmount,
      unit,
      saturdaysOff,
      includeLocalHoliday,
      extraNonWorkingDays,
    })
  }, [valid, notifiedOn, parsedAmount, unit, saturdaysOff, includeLocalHoliday, extraNonWorkingDays])

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Datos</h2>

        <div className="space-y-4">
          <div>
            <label className={LABEL} htmlFor="notificacion">
              Fecha de la última notificación
            </label>
            <input
              id="notificacion"
              type="date"
              value={notifiedOn}
              onChange={(e) => setNotifiedOn(e.target.value)}
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="cantidad">
                Plazo
              </label>
              <input
                id="cantidad"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="unidad">
                Unidad
              </label>
              <select
                id="unidad"
                value={unit}
                onChange={(e) => setUnit(e.target.value as PlazoUnit)}
                className={FIELD}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-ink-900">
              <input
                type="checkbox"
                checked={saturdaysOff}
                onChange={(e) => setSaturdaysOff(e.target.checked)}
                className="h-3.5 w-3.5 accent-navy-800"
              />
              Sábados inhábiles (jornada de 40 horas)
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-900">
              <input
                type="checkbox"
                checked={includeLocalHoliday}
                onChange={(e) => setIncludeLocalHoliday(e.target.checked)}
                className="h-3.5 w-3.5 accent-navy-800"
              />
              Incluir la festividad de la localidad (15 de agosto, ciudad de Guatemala)
            </label>
          </div>

          <div>
            <label className={LABEL} htmlFor="extra">
              Días inhábiles adicionales
            </label>
            <textarea
              id="extra"
              value={extraRaw}
              onChange={(e) => setExtraRaw(e.target.value)}
              rows={2}
              placeholder="2026-10-05, 2026-10-06"
              className={`${FIELD} resize-y`}
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Formato AAAA-MM-DD, separados por coma o salto de línea. Sirve para los días en que el
              tribunal permaneció cerrado (Art. 45 d de la LOJ).
            </p>
          </div>
        </div>

        <p className={`mt-5 border-t border-rule pt-4 ${NOTE}`}>
          El cómputo arranca el día siguiente al de la última notificación (
          <Link href="/leyes/ley-del-organismo-judicial#articulo-45" className="font-medium text-navy-700 underline-offset-2 hover:underline">
            Art. 45 e de la Ley del Organismo Judicial
          </Link>
          ) y no cuenta domingos, sábados de descanso ni asuetos (Art. 45 d LOJ y{' '}
          <Link href="/leyes/codigo-de-trabajo#articulo-127" className="font-medium text-navy-700 underline-offset-2 hover:underline">
            Art. 127 del Código de Trabajo
          </Link>
          ). El 24 y el 31 de diciembre son asueto de medio día, así que
          se cuentan como hábiles. Cálculo referencial: confirma siempre con el tribunal.
        </p>
      </section>

      <section className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Vencimiento</h2>

        {!result ? (
          <p className="text-sm text-ink-500">Ingresa la fecha de notificación y el plazo.</p>
        ) : (
          <>
            <div className={`mb-4 ${RESULT_BOX}`}>
              <p className="text-xs text-navy-100/80">El plazo vence el</p>
              <p className="font-serif text-xl text-gold-200 first-letter:uppercase">{formatLongDate(result.dueOn)}</p>
            </div>

            <dl className="divide-y divide-rule text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-ink-700">Empieza a correr</dt>
                <dd className="text-right font-medium text-ink-900">{formatLongDate(result.startsOn)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-ink-700">Días de calendario transcurridos</dt>
                <dd className="font-medium text-ink-900">{result.calendarDays}</dd>
              </div>
              {result.movedForward && (
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-ink-700">Vencimiento corrido</dt>
                  <dd className="font-medium text-ink-900">Cayó en día inhábil</dd>
                </div>
              )}
            </dl>

            {result.skipped.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                  Días omitidos ({result.skipped.length})
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto">
                  {result.skipped.map((s) => (
                    <li key={s.date} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-ink-700">{formatLongDate(s.date)}</span>
                      <span className="whitespace-nowrap text-ink-500">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
