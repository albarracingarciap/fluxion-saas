/**
 * Roles del circuito de evaluación de riesgos (decisión DP-01, 2026-10-19).
 *
 * Fuente: «Mapa de aprobaciones por objeto» en
 * docs/producto/plan-resolucion-gaps.md (Parte I, §5). Regla general: quien
 * prepara no aprueba, y el DPO es consultivo (emite dictamen, no edita ni
 * aprueba planes de tratamiento).
 *
 * Es una solución de transición (bloque B01): hoy cada miembro tiene un solo
 * rol (`profiles.role`). El bloque B23 introduce roles múltiples y el bloque
 * B11 lleva las aprobaciones a Flujos de aprobación con políticas por defecto;
 * entonces estas constantes se sustituyen.
 */
import type { OrgRole } from '@/lib/types/auth'

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

export function canPrepareTreatmentPlan(role: string | null | undefined): boolean {
  return !!role && (PLAN_PREPARER_ROLES as readonly string[]).includes(role)
}

export function canResolveFmeaSecondReview(role: string | null | undefined): boolean {
  return !!role && (FMEA_SECOND_REVIEW_ROLES as readonly string[]).includes(role)
}
