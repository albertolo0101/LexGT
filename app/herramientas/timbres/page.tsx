import type { Metadata } from 'next'
import ToolHeader from '../ToolHeader'
import TimbresClient from './TimbresClient'

export const metadata: Metadata = { title: 'Calculadora de timbres — LexGT' }

export default function TimbresPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ToolHeader
          title="Calculadora de timbres"
          intro="Timbre notarial (Decreto 82-96) y timbre fiscal (Decreto 37-92) de un contrato, con el desglose de cuántos timbres de cada denominación hay que adherir."
        />
        <TimbresClient />
      </main>
    </div>
  )
}
