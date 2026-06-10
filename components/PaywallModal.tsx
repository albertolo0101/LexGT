'use client'
import { Ico } from './icons'

const FREE_FEATURES = [
  'Lectura completa de leyes y códigos',
  'Búsqueda de texto completo',
  '1 color de resaltado',
]

const PRO_FEATURES = [
  'Resaltado multicolor (4 colores)',
  'Notas en cualquier párrafo',
  'Organiza tu trabajo en casos',
  'Jurisprudencias relacionadas',
  'Notificaciones de reformas (6 meses)',
]

export default function PaywallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-rule overflow-hidden lex-fade">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-400 hover:text-ink-900 transition-colors z-10"
          aria-label="Cerrar"
        >
          <Ico.x className="w-5 h-5" />
        </button>

        <div className="px-6 pt-8 pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-700 mb-1">LexGT Pro</p>
          <h2 className="font-serif text-2xl text-ink-900">Lleva tu investigación legal más lejos</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-px bg-rule">
          <div className="bg-white p-6">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Free</h3>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                  <Ico.check className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-navy-900 text-white p-6">
            <h3 className="text-sm font-semibold text-gold-300 mb-3">Pro</h3>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-navy-50">
                  <Ico.check className="w-4 h-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 bg-paper-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-sm px-6 py-2.5 transition-colors"
          >
            Actualizar a Pro
          </button>
          <button
            onClick={onClose}
            className="text-sm text-ink-500 hover:text-ink-900 transition-colors"
          >
            Seguir con Free
          </button>
        </div>
      </div>
    </div>
  )
}
