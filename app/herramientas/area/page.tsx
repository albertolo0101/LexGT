import type { Metadata } from 'next'
import ToolHeader from '../ToolHeader'
import AreaClient from './AreaClient'

export const metadata: Metadata = { title: 'Calculadora de área — LexGT' }

export default function AreaPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <ToolHeader
          title="Calculadora de área"
          intro="Dos formas de medir un terreno: por coordenadas (x, y) en metros o por rumbos y distancias, como aparecen en una escritura. El resultado se convierte a varas², hectáreas, manzanas y caballerías."
        />
        <AreaClient />
      </main>
    </div>
  )
}
