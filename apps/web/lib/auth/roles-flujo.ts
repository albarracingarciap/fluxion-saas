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
 * SGAI, siempre distinto del evaluador (pendiente de confirmar).
 */
export const FMEA_SECOND_REVIEW_ROLES: readonly OrgRole[] = ['sgai_manager']

/**
 * Aprobador del plan cuando no hay política en Flujos de aprobación.
 *
 * Nivel 1: Responsable del SGAI. Los niveles 2 (Comité de Riesgos de IA) y 3
 * (Revisión por la Dirección) los aprueba un comité, que solo se puede
 * expresar con una política; sin ella, se asigna también al Responsable del
 * SGAI para que el plan no quede sin aprobador.
 */
export const PLAN_APPROVER_ROLES: Record<'level_1' | 'level_2' | 'level_3', readonly OrgRole[]> = {
  level_1: ['sgai_manager'],
  level_2: ['sgai_manager'],
  level_3: ['sgai_manager'],
}

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
