'use client'

import { useState, useTransition } from 'react'
import { signOut } from '@/app/auth/actions'
import { formatPrice, planPeriodLabel, type Plan } from '@/lib/billing/types'
import type { AccountSummary } from '@/lib/services/queries/billing'
import { startCheckout } from './actions'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Fallido', className: 'bg-red-50 text-red-700 border-red-200' },
  refunded: { label: 'Reembolsado', className: 'bg-paper-2 text-ink-700 border-rule' },
  canceled: { label: 'Cancelado', className: 'bg-paper-2 text-ink-700 border-rule' },
}

export default function AccountClient({
  summary,
  plans,
  checkoutEnabled,
}: {
  summary: AccountSummary
  plans: Plan[]
  checkoutEnabled: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const isPro = summary.tier === 'pro'
  const expiresSoon =
    summary.tierExpiresAt !== null &&
    new Date(summary.tierExpiresAt).getTime() - Date.now() < 15 * 86_400_000

  const handleCheckout = (planKey: string) => {
    setError(null)
    setPendingPlan(planKey)
    startTransition(async () => {
      const result = await startCheckout(planKey)
      if (!result.ok) {
        setError(result.message)
        setPendingPlan(null)
        return
      }
      window.location.href = result.data.url
    })
  }

  return (
    <div className="space-y-6">
      {/* ── plan vigente ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-rule bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Plan vigente
            </p>
            <p className="mt-1 font-serif text-2xl text-ink-900">
              {isPro ? 'LexGT Pro' : 'LexGT Free'}
            </p>
            <p className="mt-1 text-sm text-ink-700">{summary.email}</p>
          </div>

          <div className="text-right">
            {summary.isLifetime ? (
              <span className="inline-flex items-center rounded-full border border-gold-400 bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700">
                Vitalicio
              </span>
            ) : summary.tierExpiresAt ? (
              <>
                <p className="text-xs text-ink-500">Vence el</p>
                <p className={`text-sm font-medium ${expiresSoon ? 'text-amber-700' : 'text-ink-900'}`}>
                  {formatDate(summary.tierExpiresAt)}
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-500">Sin vencimiento</p>
            )}
          </div>
        </div>

        {isPro && expiresSoon && !summary.isLifetime && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Tu plan vence pronto. Renuévalo para no perder notas, casos ni colores.
          </p>
        )}
      </section>

      {/* ── planes ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-rule bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink-900">
          {isPro ? 'Renovar o cambiar de plan' : 'Pasar a Pro'}
        </h2>
        <p className="mb-4 text-xs text-ink-700">
          Pro habilita los cuatro colores de resaltado, las notas, los casos y una ventana de
          reformas de seis meses.
        </p>

        {plans.length === 0 ? (
          <p className="text-sm text-ink-500">
            Todavía no hay planes publicados. Escríbenos y te activamos el acceso.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className="flex flex-col justify-between rounded-lg border border-rule p-4 transition-colors hover:border-gold-400"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{plan.name}</p>
                  <p className="mt-1 font-serif text-xl text-navy-800">
                    {formatPrice(plan.price_cents, plan.currency)}
                  </p>
                  <p className="text-[11px] text-ink-500">{planPeriodLabel(plan)}</p>
                </div>
                <button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={!checkoutEnabled || pendingPlan !== null}
                  className="mt-4 rounded-full bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-40"
                >
                  {pendingPlan === plan.key ? 'Abriendo…' : 'Contratar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!checkoutEnabled && (
          <p className="mt-4 rounded-lg bg-paper-2 px-3 py-2 text-xs text-ink-700">
            Los pagos en línea todavía no están habilitados. Mientras tanto, escríbenos y activamos
            tu plan a mano.
          </p>
        )}

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </section>

      {/* ── pagos y facturas ─────────────────────────────────────── */}
      <section className="rounded-xl border border-rule bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Pagos y facturas</h2>

        {summary.payments.length === 0 ? (
          <p className="text-sm text-ink-700">Todavía no tienes pagos registrados.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {summary.payments.map((payment) => {
              const badge = PAYMENT_STATUS[payment.status] ?? PAYMENT_STATUS.pending
              const invoice = summary.invoicesByPayment[payment.id]
              return (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900">
                      {formatPrice(payment.amount_cents, payment.currency)}
                      <span className="ml-2 text-xs text-ink-500">
                        {payment.plan_key ?? 'manual'} · {payment.provider}
                      </span>
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice?.pdf_url && invoice.status === 'issued' && (
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-medium text-navy-700 underline-offset-2 hover:underline"
                      >
                        Factura {invoice.serie}-{invoice.numero}
                      </a>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── historial y sesión ───────────────────────────────────── */}
      <section className="rounded-xl border border-rule bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Historial del plan</h2>
        {summary.history.length === 0 ? (
          <p className="text-sm text-ink-700">Sin cambios registrados.</p>
        ) : (
          <ul className="space-y-2">
            {summary.history.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-4 text-xs">
                <span className="text-ink-900">
                  {event.from_tier ?? 'nuevo'} → <strong>{event.to_tier}</strong>
                  <span className="ml-2 text-ink-500">
                    {event.source === 'payment' ? 'por pago' : event.source === 'admin' ? 'por LexGT' : event.source}
                  </span>
                </span>
                <span className="whitespace-nowrap text-ink-500">{formatDate(event.created_at)}</span>
              </li>
            ))}
          </ul>
        )}

        <form action={signOut} className="mt-5 border-t border-rule pt-4">
          <button
            type="submit"
            className="text-xs font-medium text-ink-700 transition-colors hover:text-red-600"
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  )
}
