import { TEMPLATE_KEYS, type TemplateKey } from '../documents/templates'

/**
 * Cobertura de las políticas de aprobación (B11e, B11f).
 *
 * El plan de tratamiento y el expediente documental solo se aprueban en Flujos
 * de aprobación: si un nivel del plan o una plantilla del expediente se queda
 * sin política activa que lo gobierne, no se puede enviar. Ajustes usa esto
 * para impedir guardar, desactivar o borrar una política que deje un hueco.
 *
 * Una política cubre un valor si está activa, es del tipo de objeto y sus
 * condiciones solo miran esa clave (sin condiciones = todos los valores). Una
 * condición sobre otra clave del contexto (por ejemplo, `has_security_controls`)
 * solo cubre parte de los objetos, así que no cuenta.
 */

export const PLAN_LEVELS = ['level_1', 'level_2', 'level_3'] as const
export type PlanLevel = (typeof PLAN_LEVELS)[number]

export type CoveragePolicy = {
  object_type: string
  is_active: boolean
  conditions: Record<string, string[]> | null
}

/** Qué clave del contexto y qué valores tiene que cubrir cada tipo de objeto. */
export const COVERAGE_RULES = {
  treatment_plan: { key: 'approval_level', values: PLAN_LEVELS as readonly string[] },
  document:       { key: 'template_key',   values: TEMPLATE_KEYS as readonly string[] },
} as const

export type CoveredObjectType = keyof typeof COVERAGE_RULES

export function isCoveredObjectType(t: string): t is CoveredObjectType {
  return t in COVERAGE_RULES
}

export function policyCovers(policy: CoveragePolicy, objectType: CoveredObjectType, value: string): boolean {
  if (policy.object_type !== objectType || !policy.is_active) return false
  const { key } = COVERAGE_RULES[objectType]
  for (const [clave, valores] of Object.entries(policy.conditions ?? {})) {
    if (clave !== key) return false
    if (!valores.includes(value)) return false
  }
  return true
}

/** Valores (niveles o plantillas) que ninguna política activa cubre. */
export function uncoveredValues(policies: CoveragePolicy[], objectType: CoveredObjectType): string[] {
  return COVERAGE_RULES[objectType].values.filter((v) => !policies.some((p) => policyCovers(p, objectType, v)))
}

export function planLevelsWithoutPolicy(policies: CoveragePolicy[]): PlanLevel[] {
  return uncoveredValues(policies, 'treatment_plan') as PlanLevel[]
}

export function documentTemplatesWithoutPolicy(policies: CoveragePolicy[]): TemplateKey[] {
  return uncoveredValues(policies, 'document') as TemplateKey[]
}
