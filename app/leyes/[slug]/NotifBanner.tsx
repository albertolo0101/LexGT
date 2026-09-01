import Link from 'next/link'
import { Ico } from '@/components/icons'

export default function NotifBanner({ lawSlug, show }: { lawSlug: string; show: boolean }) {
  if (!show) return null

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-gold-400/40 bg-gold-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-gold-700">
        <Ico.bell className="w-4 h-4 flex-shrink-0" />
        Esta ley tiene reformas recientes que aún no has revisado.
      </div>
      <Link
        href={`/leyes/${lawSlug}`}
        className="text-xs font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 transition-colors rounded-full px-3 py-1.5 whitespace-nowrap"
      >
        Ver cambios
      </Link>
    </div>
  )
}
