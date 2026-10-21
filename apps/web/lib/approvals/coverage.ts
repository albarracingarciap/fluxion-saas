/**
 * Cobertura de los niveles del plan de tratamiento por las políticas (B11e).
 *
 * El plan solo se aprueba en Flujos de aprobación: si un nivel se queda sin
 * política activa que lo gobierne, sus planes no se pueden enviar. Ajustes usa
 * esto para impedir guardar, desactivar o borrar una política que deje un
 * nivel sin cubrir.
 *
 * Una política cubre un nivel si está activa, es de planes y sus condiciones
 * solo miran el nivel (sin condiciones = todos los niveles). Una condición
 * sobre otra clave del contexto (por ejemplo, `has_security_controls`) solo
 * cubre parte de los planes, así que no cuenta.
 */

export const PLAN_LEVELS = ['level_1', 'level_2', 'level_3'] as const
export type PlanLevel = (typeof PLAN_LEVELS)[number]

export type CoveragePolicy = {
  object_type: string
  is_active: boolean
  conditions: Record<string, string[]> | null
}

export function policyCoversPlanLevel(policy: CoveragePolicy, level: PlanLevel): boolean {
  if (policy.object_type !== 'treatment_plan' || !policy.is_active) return false
  const condiciones = policy.conditions ?? {}
  for (const [clave, valores] of Object.entries(condiciones)) {
    if (clave !== 'approval_level') return false
    if (!valores.includes(level)) return false
  }
  return true
}

export function planLevelsWithoutPolicy(policies: CoveragePolicy[]): PlanLevel[] {
  return PLAN_LEVELS.filter((level) => !policies.some((p) => policyCoversPlanLevel(p, level)))
}
