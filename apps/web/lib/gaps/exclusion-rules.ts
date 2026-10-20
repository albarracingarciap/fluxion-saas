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
