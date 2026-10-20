/**
 * Ciclo de vida único de la evaluación de riesgos (B07, DP-03).
 *
 * La evaluación FMEA y su plan de tratamiento son una sola evaluación de
 * riesgos del sistema:
 *
 *   evaluación  draft ──enviar──▶ in_review ──plan aprobado──▶ approved ──versión nueva aprobada──▶ superseded
 *   plan                 draft ──enviar──▶ in_review ──aprobar──▶ approved ─▶ in_progress ⇄ closed
 *                          ▲                 │                                       │
 *                          └────rechazar─────┘                       versión nueva aprobada ─▶ superseded
 *
 * Las transiciones que dependen de otras tablas las hace la base de datos
 * (`fmea_aplicar_aprobacion_plan` y el trigger `trg_treatment_action_plan_status`,
 * migración 20261020100000). Este módulo recoge las mismas reglas en puro para
 * la interfaz y los tests; si cambian, cambian en los dos sitios.
 *
 * Módulo puro (sin Supabase ni Next).
 */

export type EvaluationState = 'draft' | 'in_review' | 'approved' | 'superseded'

export type PlanStatus = 'draft' | 'in_review' | 'approved' | 'in_progress' | 'closed' | 'superseded'

/** Estados de acción que ya no requieren trabajo. */
export const TERMINAL_ACTION_STATUSES: ReadonlySet<string> = new Set(['completed', 'accepted', 'cancelled'])

/** Planes ya aprobados: los que se ejecutan y en los que no se edita la evaluación. */
export const APPROVED_PLAN_STATUSES: ReadonlySet<string> = new Set(['approved', 'in_progress', 'closed'])

/**
 * Estado de ejecución de un plan según sus acciones. Solo cambia planes
 * aprobados, en ejecución o cerrados: con alguna acción abierta, `in_progress`;
 * sin ninguna (también sin acciones), `closed`.
 */
export function planStatusFromActions(status: PlanStatus, actionStatuses: readonly string[]): PlanStatus {
  if (!APPROVED_PLAN_STATUSES.has(status)) return status
  const abiertas = actionStatuses.filter((s) => !TERMINAL_ACTION_STATUSES.has(s)).length
  return abiertas === 0 ? 'closed' : 'in_progress'
}

const CADENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
}

/** Próxima revisión de una evaluación aprobada, según la cadencia del plan. */
export function nextReviewAt(approvedAt: Date, cadence: string | null | undefined): Date | null {
  const months = cadence ? CADENCE_MONTHS[cadence] : undefined
  if (!months) return null
  const next = new Date(approvedAt.getTime())
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

/**
 * ¿Se puede abrir una versión nueva desde esta evaluación?
 *
 * Solo desde la versión vigente (la última aprobada) y si no hay otra versión
 * en curso: dos borradores a la vez del mismo sistema competirían por
 * sustituir a la misma versión.
 */
export function newVersionBlocker(params: {
  state: EvaluationState
  isLatestVersion: boolean
  hasOpenVersion: boolean
}): string | null {
  if (params.state !== 'approved') return 'Solo se abre una versión nueva desde una evaluación aprobada.'
  if (!params.isLatestVersion) return 'Ya existe una versión posterior de esta evaluación.'
  if (params.hasOpenVersion) return 'Ya hay una versión nueva en curso para este sistema.'
  return null
}

/**
 * Evaluación de referencia de un sistema: la vigente (última aprobada) y, si
 * aún no hay ninguna aprobada, la última versión no sustituida. Es la que
 * alimenta brechas, ficha y documentos: una reevaluación en curso no cambia la
 * posición de riesgo oficial hasta que se aprueba.
 */
export function pickReferenceEvaluation<T extends { state: string; version: number }>(rows: readonly T[]): T | null {
  const byVersion = [...rows].sort((a, b) => b.version - a.version)
  return (
    byVersion.find((row) => row.state === 'approved')
    ?? byVersion.find((row) => row.state !== 'superseded')
    ?? null
  )
}

/** Etiqueta de negocio del estado de la evaluación. */
export function getEvaluationStateLabel(state: string | null | undefined): string {
  switch (state) {
    case 'draft':
      return 'En borrador'
    case 'in_review':
      return 'En revisión'
    case 'approved':
      return 'Aprobada · vigente'
    case 'superseded':
      return 'Sustituida'
    default:
      return 'Sin evaluación'
  }
}
