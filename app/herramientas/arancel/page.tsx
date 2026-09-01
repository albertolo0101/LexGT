import type { Metadata } from 'next'
import ToolHeader from '../ToolHeader'
import ArancelClient from './ArancelClient'

export const metadata: Metadata = { title: 'Calculadora de arancel — LexGT' }

export default function ArancelPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ToolHeader
          title="Calculadora de arancel"
          intro="Honorarios profesionales mínimos según el Decreto 111-96. Elige el tipo de asunto y la cuantía; el arancel fija un piso, no un techo."
        />
        <ArancelClient />
      </main>
    </div>
  )
}
