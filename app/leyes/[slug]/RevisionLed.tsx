const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatLong(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

/**
 * "LED" de vigencia: el indicador de que el texto que se está leyendo se
 * revisó contra la fuente oficial y en qué fecha. Verde = al día.
 *
 * `revisedAt` es la fecha de la última reforma incorporada; si la ley no
 * registra reformas, la de carga del texto.
 */
export default function RevisionLed({
  revisedAt,
  hasReforms,
}: {
  revisedAt: string
  hasReforms: boolean
}) {
  const fecha = formatLong(revisedAt)

  return (
    <div className="mb-6 flex justify-center">
      <span
        title={`Texto verificado contra la fuente oficial. ${hasReforms ? 'Última reforma incorporada' : 'Última revisión'}: ${fecha}.`}
        className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1"
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="led-green relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-medium text-ink-700">
          Texto al día
          <span className="text-ink-500">
            {' · '}
            {hasReforms ? 'última reforma' : 'revisado'} {fecha}
          </span>
        </span>
      </span>
    </div>
  )
}
