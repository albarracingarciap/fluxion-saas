/**
 * Sesiones de comité (B20b, DP-09, decisión 62).
 *
 * Un comité de Organización › Comités convoca sesiones con orden del día
 * (que puede incluir solicitudes de aprobación pendientes del comité),
 * registra asistentes y acuerdos y cierra la sesión: el acta queda bloqueada
 * y se guarda como PDF y como evidencia. Los votos de las solicitudes siguen
 * en Aprobaciones; la sesión solo deja constancia de que se trataron.
 *
 * Módulo puro.
 */

import { effectiveQuorum } from './functions'

export type SessionType = 'ordinary' | 'extraordinary' | 'management_review'
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  ordinary: 'Ordinaria',
  extraordinary: 'Extraordinaria',
  management_review: 'Revisión por la dirección',
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Convocada',
  in_progress: 'En curso',
  completed: 'Celebrada',
  cancelled: 'Cancelada',
}

/** Estado de una solicitud de aprobación tratada en la sesión. */
export const APPROVAL_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada',
}

/** Roles con los que se gestionan las sesiones de cualquier comité. */
export const SESSION_MANAGE_ROLES = ['org_admin', 'sgai_manager', 'caio'] as const

/** Cargos del comité que, además, gestionan las sesiones de su comité. */
export const SESSION_OFFICER_ROLES: ReadonlySet<string> = new Set(['president', 'secretary'])

/** Tipos de sesión que admite un tipo de comité. */
export function sessionTypesFor(committeeType: string): SessionType[] {
  return committeeType === 'director_review'
    ? ['management_review', 'ordinary', 'extraordinary']
    : ['ordinary', 'extraordinary']
}

export type AgendaItem = {
  id: string
  title: string
  notes: string
  /** Solicitud de aprobación pendiente del comité que se trata en este punto. */
  approval_request_id: string | null
  /** Entrada de la revisión por la dirección (ISO/IEC 42001, §9.3.2) que cubre el punto (B20c). */
  input_key?: string | null
  /** Datos de la aplicación para el punto, generados y de solo lectura (B20c). */
  data_summary?: string | null
}

export type Attendee = {
  /** Miembro del comité; null para un invitado. */
  member_id: string | null
  name: string
  committee_role: string | null
  /** Vota y cuenta para el quórum (los asesores y los invitados no). */
  voting: boolean
  present: boolean
}

export type Decision = {
  id: string
  text: string
  agenda_item_id: string | null
  /** Responsable del acuerdo (profiles.id): al cerrar se le crea una tarea. */
  owner_profile_id: string | null
  due_date: string | null
  task_id: string | null
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const textoONull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const lista = (v: unknown): Array<Record<string, unknown>> =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []

export function normalizeAgenda(raw: unknown): AgendaItem[] {
  return lista(raw).map((x, i) => ({
    id: texto(x.id) || `p${i + 1}`,
    title: texto(x.title),
    notes: texto(x.notes),
    approval_request_id: textoONull(x.approval_request_id),
    input_key: textoONull(x.input_key),
    data_summary: textoONull(x.data_summary),
  }))
}

export function normalizeAttendees(raw: unknown): Attendee[] {
  return lista(raw).map((x) => ({
    member_id: textoONull(x.member_id),
    name: texto(x.name),
    committee_role: textoONull(x.committee_role),
    voting: x.voting === true,
    present: x.present === true,
  }))
}

export function normalizeDecisions(raw: unknown): Decision[] {
  return lista(raw).map((x, i) => ({
    id: texto(x.id) || `a${i + 1}`,
    text: texto(x.text),
    agenda_item_id: textoONull(x.agenda_item_id),
    owner_profile_id: textoONull(x.owner_profile_id),
    due_date: textoONull(x.due_date),
    task_id: textoONull(x.task_id),
  }))
}

/**
 * Lista de asistentes a partir de los miembros activos del comité. Conserva lo
 * ya marcado y los invitados; los miembros nuevos entran como ausentes.
 */
export function mergeAttendees(
  members: ReadonlyArray<{ id: string; name: string; committee_role: string }>,
  current: readonly Attendee[],
): Attendee[] {
  const previos = new Map(current.filter((a) => a.member_id).map((a) => [a.member_id, a]))
  const deMiembros = members.map((m) => ({
    member_id: m.id,
    name: m.name,
    committee_role: m.committee_role,
    voting: m.committee_role !== 'advisor',
    present: previos.get(m.id)?.present ?? false,
  }))
  // Un miembro que ya no está en el comité se conserva si constaba como asistente.
  const ids = new Set(members.map((m) => m.id))
  const antiguos = current.filter((a) => a.member_id && !ids.has(a.member_id) && a.present)
  const invitados = current.filter((a) => !a.member_id)
  return [...deMiembros, ...antiguos, ...invitados]
}

/** Quórum de la sesión: miembros con voto presentes frente a los que exige el comité. */
export function sessionQuorum(attendees: readonly Attendee[], committeeQuorum: number | null | undefined) {
  const conVoto = attendees.filter((a) => a.member_id && a.voting)
  const present = conVoto.filter((a) => a.present).length
  const required = effectiveQuorum(committeeQuorum ?? null, conVoto.length)
  return { present, required, met: conVoto.length > 0 && present >= required }
}

/** Qué falta para cerrar la sesión; vacío si se puede cerrar. */
export function closeBlockers(s: {
  status: SessionStatus
  agenda: readonly AgendaItem[]
  attendees: readonly Attendee[]
  decisions: readonly Decision[]
  minutesText: string
}): string[] {
  const faltas: string[] = []
  if (s.status === 'completed' || s.status === 'cancelled') faltas.push('La sesión ya está cerrada.')
  if (!s.agenda.some((p) => p.title.trim())) faltas.push('El orden del día no tiene ningún punto.')
  if (!s.attendees.some((a) => a.present)) faltas.push('Marca quién asistió.')
  if (!s.minutesText.trim()) faltas.push('Redacta el acta.')
  if (s.decisions.some((d) => !d.text.trim())) faltas.push('Hay acuerdos sin texto.')
  if (s.decisions.some((d) => d.due_date && !d.owner_profile_id)) faltas.push('Un acuerdo con fecha límite necesita responsable.')
  return faltas
}

/** «Sesión nº 3 · Ordinaria». */
export function sessionLabel(number: number, type: SessionType): string {
  return `Sesión nº ${number} · ${SESSION_TYPE_LABEL[type] ?? type}`
}
