'use client';

import { AlertTriangle, CheckCircle2, Clock, MinusCircle } from 'lucide-react';

import type { IncidentRow } from './actions';

/**
 * El reloj del artículo 73.
 *
 * Se pinta con el color del tiempo consumido, no del absoluto: quedan "2 días"
 * significa cosas muy distintas en un plazo de 2 y en uno de 15.
 */
export function DeadlineClock({ incident, size = 'sm' }: {
  incident: Pick<IncidentRow, 'notification_status' | 'notification_deadline' | 'became_aware_at' | 'notified_at' | 'is_serious'>
  size?: 'sm' | 'lg'
}) {
  const text = size === 'lg' ? 'text-[14px]' : 'text-[12.5px]'
  const icon = size === 'lg' ? 16 : 13

  if (incident.notification_status === 'complete_sent') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-sora ${text} text-gr`}>
        <CheckCircle2 size={icon} /> Notificado a la autoridad
      </span>
    )
  }

  if (!incident.is_serious || !incident.notification_deadline) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-sora ${text} text-lttm`}>
        <MinusCircle size={icon} />
        {incident.notification_status === 'not_required'
          ? 'Sin obligación de notificar'
          : 'Sin clasificar — el plazo no ha empezado'}
      </span>
    )
  }

  const start = new Date(incident.became_aware_at).getTime()
  const end   = new Date(incident.notification_deadline).getTime()
  const now   = Date.now()

  const overdue = now > end
  const elapsed = Math.min(Math.max((now - start) / (end - start), 0), 1)

  const hours = Math.round((end - now) / 3_600_000)
  const restante = Math.abs(hours) >= 48
    ? `${Math.floor(Math.abs(hours) / 24)} días`
    : `${Math.abs(hours)} h`

  const color = overdue ? 'text-re' : elapsed >= 0.8 ? 'text-re' : elapsed >= 0.5 ? 'text-or' : 'text-gr'
  const bar   = overdue || elapsed >= 0.8 ? 'bg-re' : elapsed >= 0.5 ? 'bg-or' : 'bg-gr'

  const partial = incident.notification_status === 'initial_sent'

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1.5 font-sora ${text} ${color}`}>
        {overdue ? <AlertTriangle size={icon} /> : <Clock size={icon} />}
        {overdue
          ? `Plazo vencido hace ${restante}`
          : `Quedan ${restante} para notificar`}
        {partial && <span className="text-lttm">· notificación inicial enviada</span>}
      </span>

      <div className="h-1 w-full max-w-[240px] rounded-full bg-ltb overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.round(elapsed * 100)}%` }} />
      </div>

      <span className="font-plex text-[10.5px] text-lttm">
        Vence el {new Date(incident.notification_deadline).toLocaleString('es-ES')} · Art. 73 AI Act
      </span>
    </div>
  )
}
