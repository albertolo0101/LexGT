import type { Metadata } from 'next'
import ToolHeader from '../ToolHeader'
import PrestacionesClient from './PrestacionesClient'

export const metadata: Metadata = { title: 'Calculadora de prestaciones — LexGT' }

export default function PrestacionesPage() {
  return (
    <div className="min-h-full bg-paper-2">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <ToolHeader
          title="Calculadora de prestaciones"
          intro="Ingresa el tiempo servido (años, meses y días) y el salario mensual ordinario. El cálculo usa la convención 30/360 y se hace en tu navegador."
        />
        <PrestacionesClient />
      </main>
    </div>
  )
}
