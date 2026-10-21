/**
 * Ciclo de revisión de las evidencias (B10, B11g).
 *
 * El estado de una evidencia solo cambia por este ciclo; los formularios de alta
 * y edición ya no lo eligen. Desde las pantallas solo se envía a revisión o se
 * reabre una rechazada: aprobar o rechazar se decide siempre en Flujos de
 * aprobación (B11g), y quien aporta la evidencia no decide (DP-01, por el
 * contexto `prepared_by` de la solicitud). La base de datos aplica las mismas
 * reglas (`trg_evidence_review_rules`, migración 20261021110000).
 *
 * Módulo puro (sin Supabase ni Next).
 */

export type EvidenceReviewAction = 'request_review' | 'reopen'

export const EVIDENCE_REVIEW_TRANSITIONS: Record<EvidenceReviewAction, { from: readonly string[]; to: string }> = {
  request_review: { from: ['draft', 'rejected'], to: 'pending_review' },
  reopen:         { from: ['rejected'],          to: 'draft' },
}

/** Tamaño máximo de un fichero de evidencia, en la vista y en el servidor. */
export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024
export const MAX_EVIDENCE_FILE_LABEL = '20 MB'

/**
 * Estado tras editar una evidencia. Si cambia su contenido (fichero, URL,
 * fechas, tipo, título o descripción), una evidencia ya enviada, validada,
 * caducada o rechazada vuelve a borrador y debe revisarse de nuevo: lo que se
 * validó ya no es lo que hay.
 */
export function statusAfterEdit(current: string, contentChanged: boolean): string {
  if (!contentChanged) return current
  return ['pending_review', 'valid', 'expired', 'rejected'].includes(current) ? 'draft' : current
}
