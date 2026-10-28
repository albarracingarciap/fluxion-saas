/**
 * Revisión por la dirección (B20c, DP-09; ISO/IEC 42001, §9.3).
 *
 * Es una sesión del comité Revisión por la Dirección (`session_type =
 * 'management_review'`). Al convocarla, el orden del día se rellena con las
 * entradas de §9.3.2 y los datos de la aplicación que sirven para tratarlas;
 * el último punto recoge los resultados de §9.3.3. Se celebra al menos una vez
 * cada `MANAGEMENT_REVIEW_MONTHS` meses: si no, el cron crea la tarea
 * «Celebrar la revisión por la dirección».
 *
 * Módulo puro.
 */

import type { AgendaItem } from '@/lib/governance/committee-sessions'

import { MANAGEMENT_REVIEW_MONTHS } from './management-system'

/** Puntos del orden del día: entradas de §9.3.2 y resultados de §9.3.3. */
export const MANAGEMENT_REVIEW_INPUTS = [
  { key: 'acciones_previas', title: 'Estado de las acciones de revisiones por la dirección anteriores (§9.3.2 a)' },
  { key: 'cuestiones', title: 'Cambios en las cuestiones externas e internas pertinentes al SGAI (§9.3.2 b)' },
  { key: 'partes_interesadas', title: 'Cambios en las necesidades y expectativas de las partes interesadas (§9.3.2 c)' },
  { key: 'no_conformidades', title: 'Desempeño del SGAI: no conformidades y acciones correctivas (§9.3.2 d 1)' },
  { key: 'seguimiento', title: 'Desempeño del SGAI: resultados de seguimiento y medición (§9.3.2 d 2)' },
  { key: 'auditorias', title: 'Desempeño del SGAI: resultados de auditoría (§9.3.2 d 3)' },
  { key: 'mejora', title: 'Oportunidades de mejora continua (§9.3.2 e)' },
  { key: 'resultados', title: 'Resultados: decisiones de mejora continua y cambios necesarios en el SGAI (§9.3.3)' },
] as const

export type ManagementReviewInputKey = typeof MANAGEMENT_REVIEW_INPUTS[number]['key']

/** Datos de la aplicación desde la revisión anterior (o desde siempre, si no hubo). */
export type ManagementReviewData = {
  /** Fecha de la revisión anterior; null si es la primera. */
  previousReviewAt: string | null
  previousActions: { total: number; done: number; open: number; overdue: number }
  /** `retired`: retirados en total (la aplicación no guarda la fecha de retirada). */
  systems: { active: number; highRisk: number; newSincePrevious: number; retired: number }
  authorityRequests: number
  incidents: { total: number; serious: number; open: number }
  openReevaluations: number
  overdueTreatmentActions: number
  expiredEvidences: number
  sgai: { resolved: number; total: number }
  soa: { lifecycle: string | null; implemented: number; applicable: number }
  /** Estado de la cláusula §9.2 (auditoría interna) en el sistema de gestión. */
  internalAuditStatus: string | null
  literacy: { members: number; withLiteracy: number }
}

const SOA_LIFECYCLE: Record<string, string> = { draft: 'en borrador', under_review: 'en revisión', approved: 'aprobada' }
const STATUS: Record<string, string> = { pending: 'Pendiente', in_progress: 'En curso', resolved: 'Resuelta' }

const desde = (d: ManagementReviewData) =>
  d.previousReviewAt ? `desde la revisión del ${new Date(d.previousReviewAt).toLocaleDateString('es-ES')}` : 'sin revisión anterior'

/** Resumen de datos de cada punto; null en los que no tienen datos de la aplicación. */
export function managementReviewSummary(key: string, d: ManagementReviewData): string | null {
  switch (key) {
    case 'acciones_previas':
      return d.previousReviewAt
        ? `Acuerdos con tarea de la revisión del ${new Date(d.previousReviewAt).toLocaleDateString('es-ES')}: ${d.previousActions.total}; completados ${d.previousActions.done}, abiertos ${d.previousActions.open} (${d.previousActions.overdue} vencidos).`
        : 'Primera revisión por la dirección: no hay acciones anteriores.'
    case 'cuestiones':
      return `Sistemas de IA en uso: ${d.systems.active} (${d.systems.highRisk} de alto riesgo). Altas ${desde(d)}: ${d.systems.newSincePrevious}. Retirados: ${d.systems.retired}.`
    case 'partes_interesadas':
      return `Requerimientos de la autoridad recibidos ${desde(d)}: ${d.authorityRequests}.`
    case 'no_conformidades':
      return `Incidentes ${desde(d)}: ${d.incidents.total} (${d.incidents.serious} graves); abiertos ahora: ${d.incidents.open}. Acciones de tratamiento vencidas: ${d.overdueTreatmentActions}.`
    case 'seguimiento':
      return [
        `Cláusulas del sistema de gestión resueltas: ${d.sgai.resolved} de ${d.sgai.total}.`,
        `Declaración de Aplicabilidad ${d.soa.lifecycle ? SOA_LIFECYCLE[d.soa.lifecycle] ?? d.soa.lifecycle : 'sin iniciar'}: ${d.soa.implemented} de ${d.soa.applicable} controles aplicables implantados.`,
        `Reevaluaciones abiertas: ${d.openReevaluations}. Evidencias caducadas: ${d.expiredEvidences}.`,
        `Alfabetización en IA: ${d.literacy.withLiteracy} de ${d.literacy.members} miembros activos.`,
      ].join('\n')
    case 'auditorias':
      return `Auditoría interna (§9.2) en el sistema de gestión: ${d.internalAuditStatus ? STATUS[d.internalAuditStatus] ?? d.internalAuditStatus : 'sin registrar'}.`
    default:
      return null
  }
}

/** Orden del día de una revisión por la dirección, con los datos de la aplicación. */
export function managementReviewAgenda(d: ManagementReviewData): AgendaItem[] {
  return MANAGEMENT_REVIEW_INPUTS.map((p, i) => ({
    id: `rd${i + 1}`,
    title: p.title,
    notes: '',
    approval_request_id: null,
    input_key: p.key,
    data_summary: managementReviewSummary(p.key, d),
  }))
}

/** Recalcula los datos de los puntos de §9.3.2 sin tocar lo redactado. */
export function refreshManagementReviewAgenda(agenda: readonly AgendaItem[], d: ManagementReviewData): AgendaItem[] {
  // Una sesión que se convocó con otro tipo no tiene los puntos: se añaden delante.
  if (!agenda.some((p) => p.input_key)) return [...managementReviewAgenda(d), ...agenda]
  return agenda.map((p) => (p.input_key ? { ...p, data_summary: managementReviewSummary(p.input_key, d) } : p))
}

function sumarMeses(iso: string, meses: number): string {
  const f = new Date(iso)
  f.setUTCMonth(f.getUTCMonth() + meses)
  return f.toISOString()
}

/** Días de antelación con que se crea la tarea (y plazo de la primera revisión). */
export const REVIEW_NOTICE_DAYS = 30

/**
 * Si toca crear la tarea y su fecha límite: 12 meses después de la última
 * revisión, avisando `REVIEW_NOTICE_DAYS` días antes. Sin revisión anterior,
 * toca ya, con ese mismo plazo.
 */
export function managementReviewDue(lastReviewAt: string | null, nowIso: string): { due: boolean; dueDate: string } {
  if (!lastReviewAt) {
    const f = new Date(nowIso)
    f.setUTCDate(f.getUTCDate() + REVIEW_NOTICE_DAYS)
    return { due: true, dueDate: f.toISOString().slice(0, 10) }
  }
  const vence = new Date(sumarMeses(lastReviewAt, MANAGEMENT_REVIEW_MONTHS))
  const aviso = new Date(vence)
  aviso.setUTCDate(aviso.getUTCDate() - REVIEW_NOTICE_DAYS)
  return { due: aviso.toISOString() <= nowIso, dueDate: vence.toISOString().slice(0, 10) }
}

/** La organización sigue ISO/IEC 42001: lo declara como marco aplicable o ha constituido el comité. */
export function followsIso42001(normativeModules: readonly string[] | null | undefined, hasDirectorReviewCommittee: boolean): boolean {
  return hasDirectorReviewCommittee || (normativeModules ?? []).some((m) => /42001/.test(m))
}

export const MANAGEMENT_REVIEW_TASK_TITLE = 'Celebrar la revisión por la dirección (ISO/IEC 42001, §9.3)'
