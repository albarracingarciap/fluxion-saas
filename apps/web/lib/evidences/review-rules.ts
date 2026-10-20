/**
 * Ciclo de revisión de las evidencias (B10, DP-01).
 *
 * El estado de una evidencia solo cambia por este ciclo; los formularios de alta
 * y edición ya no lo eligen. La base de datos aplica las mismas reglas
 * (`trg_evidence_review_rules`, migración 20261020110000): este módulo sirve a
 * la interfaz y da mensajes claros antes de llegar a ella. Si cambian, cambian
 * en los dos sitios.
 *
 * Módulo puro (sin Supabase ni Next).
 */

import { hasRole, type RoleHolder } from '@/lib/auth/roles'

export type EvidenceReviewAction = 'request_review' | 'approve' | 'reject' | 'reopen'

export const EVIDENCE_REVIEW_TRANSITIONS: Record<EvidenceReviewAction, { from: readonly string[]; to: string }> = {
  request_review: { from: ['draft', 'rejected'], to: 'pending_review' },
  approve:        { from: ['pending_review'],    to: 'valid' },
  reject:         { from: ['pending_review'],    to: 'rejected' },
  reopen:         { from: ['rejected'],          to: 'draft' },
}

/** Tamaño máximo de un fichero de evidencia, en la vista y en el servidor. */
export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024
export const MAX_EVIDENCE_FILE_LABEL = '20 MB'

/** Rol que aprueba o rechaza evidencias (DP-01). */
export const EVIDENCE_REVIEWER_ROLE = 'sgai_manager'

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

/**
 * Por qué esta persona no puede aprobar o rechazar la evidencia; null si puede.
 * `actorUserId` y `ownerUserId` son auth.users.id.
 */
export function evidenceReviewBlocker(params: {
  actor: RoleHolder
  actorUserId: string
  ownerUserId: string | null
}): string | null {
  if (!hasRole(params.actor, EVIDENCE_REVIEWER_ROLE)) {
    return 'Solo el Responsable del SGAI puede aprobar o rechazar evidencias.'
  }
  if (params.ownerUserId && params.ownerUserId === params.actorUserId) {
    return 'Quien aporta una evidencia no puede revisarla.'
  }
  return null
}
