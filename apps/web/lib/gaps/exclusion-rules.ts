import type { GapLayer } from './data'

/**
 * Capas cuya exclusión pasa por Flujos de aprobación (DP-07, B11d).
 *
 * Excluir un «Riesgo sin tratar» acepta un riesgo y excluir una «Obligación sin
 * cubrir» acepta un incumplimiento: son decisiones, no limpieza de la cola. Las
 * capas «Control sin implantar» y «Evidencia caducada» se excluyen sin aprobación.
 *
 * Es la condición de la política por defecto (`{"gap_layer": ["fmea",
 * "normativo"]}`) y solo sirve para avisar en pantalla: lo que manda es la
 * política activa, que se puede editar en Ajustes.
 */
export const GAP_LAYERS_WITH_APPROVAL: ReadonlyArray<GapLayer> = ['fmea', 'normativo']

export function gapExclusionNeedsApproval(layer: GapLayer): boolean {
  return GAP_LAYERS_WITH_APPROVAL.includes(layer)
}

/**
 * Cómo se aparta cada capa de la cola (F-14, B17d).
 *
 * - `plan`: «Riesgo sin tratar» y «Control sin implantar» no se excluyen desde
 *   el análisis de gaps; se resuelven en el plan de tratamiento (mitigar,
 *   aceptar con su aprobación, transferir o evitar). Aceptar un riesgo tiene una
 *   sola vía.
 * - `obligacion`: «Obligación sin cubrir» se excluye excluyendo la obligación,
 *   con aprobación si la política lo pide (DP-07).
 * - `posponer`: «Evidencia caducada» solo se pospone hasta una fecha.
 * - `declaracion`: «Control de la Declaración sin implantar» (B17e3) se resuelve
 *   en la Declaración de Aplicabilidad: implantándolo, externalizándolo o
 *   declarándolo no aplicable con su justificación.
 */
export type GapLayerExclusion = 'plan' | 'obligacion' | 'posponer' | 'declaracion'

export const GAP_LAYER_EXCLUSION: Record<GapLayer, GapLayerExclusion> = {
  fmea: 'plan',
  control: 'plan',
  soa: 'declaracion',
  normativo: 'obligacion',
  caducidad: 'posponer',
}

export function canExcludeGapLayer(layer: GapLayer): boolean {
  const modo = GAP_LAYER_EXCLUSION[layer]
  return modo === 'obligacion' || modo === 'posponer'
}

/** Texto del botón de la capa; null si no se excluye desde el análisis de gaps. */
export function gapExclusionLabel(layer: GapLayer): string | null {
  const modo = GAP_LAYER_EXCLUSION[layer]
  return modo === 'obligacion' ? 'Excluir obligación' : modo === 'posponer' ? 'Posponer' : null
}

/** Error de una exclusión que la regla no admite; null si se admite. */
export function gapExclusionError(layer: GapLayer, expiresAt: string | null | undefined): string | null {
  const modo = GAP_LAYER_EXCLUSION[layer]
  if (modo === 'plan') {
    return 'Los gaps «Riesgo sin tratar» y «Control sin implantar» no se excluyen: se resuelven en el plan de tratamiento (mitigar, aceptar, transferir o evitar).'
  }
  if (modo === 'declaracion') {
    return 'Los gaps «Control de la Declaración sin implantar» no se excluyen: se resuelven en la Declaración de Aplicabilidad (implantar, externalizar o declarar no aplicable con su justificación).'
  }
  if (modo === 'posponer' && !expiresAt) return 'Una evidencia caducada solo se pospone hasta una fecha: indícala.'
  return null
}
