import Link from 'next/link'

/**
 * Pestañas de Incidentes (B25d): los incidentes y los requerimientos de la
 * autoridad comparten módulo y roles, pero no plazos (decisión 4).
 */
export function IncidentesPestanas({ activa, requerimientosAbiertos }: {
  activa: 'incidentes' | 'requerimientos'
  /** Requerimientos sin responder, para el contador de la pestaña. */
  requerimientosAbiertos: number
}) {
  const cls = (on: boolean) =>
    `px-3.5 py-2 font-sora text-[13px] border-b-2 -mb-px transition-colors ${
      on ? 'border-brand-cyan text-ltt font-medium' : 'border-transparent text-lttm hover:text-ltt'
    }`
  return (
    <div className="max-w-[1100px] w-full mx-auto flex gap-1 border-b border-ltb mb-6">
      <Link href="/incidentes" className={cls(activa === 'incidentes')}>Incidentes</Link>
      <Link href="/incidentes?tab=requerimientos" className={cls(activa === 'requerimientos')}>
        Requerimientos
        {requerimientosAbiertos > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-ordim text-or font-plex text-[10px]">{requerimientosAbiertos}</span>
        )}
      </Link>
    </div>
  )
}
