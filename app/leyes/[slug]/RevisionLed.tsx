import { GAZETTE_REVIEWED_ON, formatRevisionDate } from '@/lib/revision'

/**
 * "LED" de vigencia: indica que el catálogo está revisado contra el Diario de
 * Centro América y hasta qué fecha. La fecha es la misma en todas las leyes
 * (ver `lib/revision.ts`) — no es la de la última reforma de esta ley.
 */
export default function RevisionLed() {
  const fecha = formatRevisionDate(GAZETTE_REVIEWED_ON)

  return (
    <div className="mb-6 flex justify-center">
      <span
        title={`Todo el catálogo de LexGT está revisado contra el Diario de Centro América publicado hasta el ${fecha}.`}
        className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1"
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="led-green relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-medium text-ink-700">
          Texto al día
          <span className="text-ink-500">
            {' · Diario de Centro América revisado al '}
            {fecha}
          </span>
        </span>
      </span>
    </div>
  )
}
