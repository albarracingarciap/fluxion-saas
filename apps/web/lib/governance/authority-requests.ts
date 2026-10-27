/**
 * Requerimientos de la autoridad (B25d, AI Act, Art. 26.12; decisión 4).
 *
 * Una autoridad pide información o exige medidas correctoras con un plazo. Es
 * un objeto propio: no es un incidente y su plazo no es el del Art. 73.
 *
 * Módulo puro.
 */

export type AuthorityRequestKind = 'information' | 'corrective_measures' | 'other'
export type AuthorityRequestStatus = 'received' | 'in_progress' | 'answered' | 'closed'

export const REQUEST_KIND_LABEL: Record<AuthorityRequestKind, string> = {
  information: 'Solicitud de información',
  corrective_measures: 'Medidas correctoras',
  other: 'Otro',
}

export const REQUEST_STATUS_LABEL: Record<AuthorityRequestStatus, string> = {
  received: 'Recibido',
  in_progress: 'En preparación',
  answered: 'Respondido',
  closed: 'Cerrado',
}

export const REQUEST_STATUS_ORDER: AuthorityRequestStatus[] = ['received', 'in_progress', 'answered', 'closed']

/** Días antes del plazo a partir de los que se marca como próximo. */
export const REQUEST_DUE_SOON_DAYS = 5

export type RequestDeadline =
  | { state: 'respondido' }
  | { state: 'sin_plazo' }
  | { state: 'en_plazo' | 'proximo'; daysLeft: number }
  | { state: 'vencido'; daysOverdue: number }

const dia = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)))

/** Plazo de respuesta. `today` y `dueAt` en formato AAAA-MM-DD. */
export function requestDeadline(status: AuthorityRequestStatus, dueAt: string | null, today: string): RequestDeadline {
  if (status === 'answered' || status === 'closed') return { state: 'respondido' }
  if (!dueAt) return { state: 'sin_plazo' }
  const dias = Math.round((dia(dueAt) - dia(today)) / 86_400_000)
  if (dias < 0) return { state: 'vencido', daysOverdue: -dias }
  return { state: dias <= REQUEST_DUE_SOON_DAYS ? 'proximo' : 'en_plazo', daysLeft: dias }
}

export function requestDeadlineLabel(d: RequestDeadline): string {
  switch (d.state) {
    case 'respondido': return 'Respondido'
    case 'sin_plazo': return 'Sin plazo indicado'
    case 'vencido': return `Plazo vencido hace ${d.daysOverdue} ${d.daysOverdue === 1 ? 'día' : 'días'}`
    default: return d.daysLeft === 0 ? 'Vence hoy' : `Quedan ${d.daysLeft} ${d.daysLeft === 1 ? 'día' : 'días'}`
  }
}
