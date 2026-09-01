import type { Metadata } from 'next'
import Link from 'next/link'
import { Ico } from '@/components/icons'
import { TOOLS } from '@/lib/tools'

export const metadata: Metadata = { title: 'Herramientas — LexGT' }

export default function HerramientasPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gold-700">LexGT</p>
        <h1 className="font-serif text-3xl text-ink-900">Herramientas</h1>
        <p className="mt-2 text-sm text-ink-700">
          Cálculos de uso diario. Todo corre en tu navegador: nada de lo que escribas se guarda.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = Ico[tool.icon]
            return (
              <Link
                key={tool.slug}
                href={`/herramientas/${tool.slug}`}
                className="group rounded-xl border border-rule bg-white p-5 transition-colors hover:border-gold-400"
              >
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700 transition-colors group-hover:bg-gold-50 group-hover:text-gold-700">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-medium text-ink-900">{tool.name}</p>
                <p className="mt-1 text-sm text-ink-700">{tool.description}</p>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
