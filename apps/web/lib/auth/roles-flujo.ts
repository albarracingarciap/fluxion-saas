/**
 * Roles del circuito de evaluación de riesgos (decisión DP-01, 2026-10-19).
 *
 * Fuente: «Mapa de aprobaciones por objeto» en
 * docs/producto/plan-resolucion-gaps.md (Parte I, §5). Regla general: quien
 * prepara no aprueba, y el DPO es consultivo (emite dictamen, no edita ni
 * aprueba planes de tratamiento).
 *
 * Las comprobaciones miran todos los roles del miembro (`profiles.roles`,
 * B23a). El bloque B11 llevará las aprobaciones a Flujos de aprobación con
 * políticas por defecto.
 */
import type { OrgRole } from '@/lib/types/auth'
import { hasAnyRole, type RoleHolder } from './roles'

/** Preparan la evaluación de riesgos y el plan de tratamiento: Analista de riesgos y Responsable del sistema. */
export const PLAN_PREPARER_ROLES: readonly OrgRole[] = ['risk_analyst', 'system_owner']

/**
 * Resuelven la segunda revisión del FMEA. No figura en el mapa de DP-01; por
 * coherencia con la segunda línea de defensa se asigna al Responsable del
 * SGAI, siempre distinto del evaluador (confirmado el 2026-10-20).
 */
export const FMEA_SECOND_REVIEW_ROLES: readonly OrgRole[] = ['sgai_manager']

/** Acepta el miembro (con su lista de roles) o un rol suelto. */
type QuienOrol = RoleHolder | string

function comoHolder(quien: QuienOrol): RoleHolder {
  return typeof quien === 'string' ? { role: quien } : quien
}

export function canPrepareTreatmentPlan(quien: QuienOrol): boolean {
  return hasAnyRole(comoHolder(quien), PLAN_PREPARER_ROLES)
}

export function canResolveFmeaSecondReview(quien: QuienOrol): boolean {
  return hasAnyRole(comoHolder(quien), FMEA_SECOND_REVIEW_ROLES)
}

/**
 * Aprobador de la AISIA hasta B11/B15. DP-01 la asigna al Comité de IA, que
 * solo se puede expresar con una política de Flujos de aprobación; mientras
 * tanto aprueba el Responsable del SGAI, como en el expediente (B09).
 */
export const AISIA_APPROVER_ROLES: readonly OrgRole[] = ['sgai_manager']

/**
 * Por qué esta persona no puede aprobar o rechazar la AISIA; null si puede.
 * `preparerProfileIds`: quien la creó y quien la envió (profiles.id).
 */
export function aisiaApprovalBlocker(params: {
  actor: QuienOrol
  actorProfileId: string
  preparerProfileIds: readonly (string | null | undefined)[]
}): string | null {
  if (!hasAnyRole(comoHolder(params.actor), AISIA_APPROVER_ROLES)) {
    return 'Solo el Responsable del SGAI puede aprobar o rechazar la AISIA.'
  }
  if (params.preparerProfileIds.includes(params.actorProfileId)) {
    return 'Quien prepara la AISIA no puede aprobarla ni rechazarla.'
  }
  return null
}

