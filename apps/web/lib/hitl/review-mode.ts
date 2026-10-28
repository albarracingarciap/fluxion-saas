/**
 * Modalidad de supervisión humana de un sistema (B30a, DP-13).
 *
 * No todos los sistemas se supervisan decisión a decisión: algunos se revisan
 * por muestras y otros solo vigilando su funcionamiento (B28). La modalidad
 * dice qué sistemas deben enviar decisiones a Supervisión humana: los «por
 * caso» sin decisiones en `HITL_SILENCE_DAYS` días se avisan.
 *
 * Módulo puro.
 */

export type ReviewMode = 'per_case' | 'sampling' | 'monitoring_only'

export const REVIEW_MODES: readonly ReviewMode[] = ['per_case', 'sampling', 'monitoring_only']

export const REVIEW_MODE_LABEL: Record<ReviewMode, string> = {
  per_case: 'Por caso',
  sampling: 'Por muestreo',
  monitoring_only: 'Solo vigilancia del funcionamiento',
}

export const REVIEW_MODE_HINT: Record<ReviewMode, string> = {
  per_case: 'Una persona revisa cada resultado antes de que surta efecto; cada decisión se registra en Supervisión humana.',
  sampling: 'Se revisa periódicamente una muestra de resultados; las revisiones se registran en Supervisión humana.',
  monitoring_only: 'No hay revisión caso a caso; se supervisa vigilando el funcionamiento (indicadores y revisiones periódicas).',
}

export const HITL_SILENCE_DAYS = 30

export function isReviewMode(v: unknown): v is ReviewMode {
  return typeof v === 'string' && (REVIEW_MODES as readonly string[]).includes(v)
}

/** Sistemas «por caso» sin decisiones registradas en el periodo de aviso. */
export function silentPerCaseSystems<T extends { id: string; mode: ReviewMode | null }>(
  systems: readonly T[],
  withRecentDecisions: ReadonlySet<string>,
): T[] {
  return systems.filter((s) => s.mode === 'per_case' && !withRecentDecisions.has(s.id))
}
