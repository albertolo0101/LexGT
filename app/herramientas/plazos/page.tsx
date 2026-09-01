import type { Metadata } from 'next'
import ToolHeader from '../ToolHeader'
import PlazosClient from './PlazosClient'

export const metadata: Metadata = { title: 'Calculadora de plazos — LexGT' }

export default function PlazosPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <ToolHeader
          title="Calculadora de plazos"
          intro="Vencimiento de un plazo contado en días hábiles según el Art. 45 de la Ley del Organismo Judicial: sin domingos, sin sábados de descanso y sin asuetos."
        />
        <PlazosClient />
      </main>
    </div>
  )
}
