/**
 * Ciclo de aprobación del expediente documental (B09, DP-01).
 *
 *   borrador ⇄ en revisión → aprobado → sustituido (al reabrirlo, nace la versión siguiente en borrador)
 *
 * La base de datos aplica las mismas reglas (`trg_document_lifecycle_rules`,
 * migración 20261020120000); este módulo da a la interfaz los mensajes antes de
 * llegar a ella. Si cambian, cambian en los dos sitios.
 *
 * Módulo puro (sin Supabase ni Next).
 */

import { hasAnyRole, type RoleHolder } from '@/lib/auth/roles'
import type { TemplateKey } from './templates'

export type DocumentAction = 'submit' | 'return' | 'approve'

export const DOCUMENT_TRANSITIONS: Record<DocumentAction, { from: string; to: string }> = {
  submit:  { from: 'draft',     to: 'in_review' },
  return:  { from: 'in_review', to: 'draft' },
  approve: { from: 'in_review', to: 'approved' },
}

/**
 * Quién aprueba cada expediente hasta B11 (Flujos de aprobación con políticas
 * por defecto). DP-01 asigna el Anexo IV al Responsable del SGAI, la DPIA al
 * responsable del tratamiento con dictamen del DPO y la FRIA al Comité de IA;
 * esas dos últimas funciones no son roles de la aplicación todavía (B23b), así
 * que mientras tanto aprueba el Responsable del SGAI en todos.
 */
export const DOCUMENT_APPROVER_ROLES: Record<TemplateKey, readonly string[]> = {
  annex_iv:   ['sgai_manager'],
  fria:       ['sgai_manager'],
  dpia:       ['sgai_manager'],
  model_card: ['sgai_manager'],
}

/** Por qué esta persona no puede aprobar el expediente; null si puede. */
export function documentApprovalBlocker(params: {
  templateKey: TemplateKey
  actor: RoleHolder
  actorProfileId: string
  /** profiles.id de quienes redactaron algún apartado. */
  authorProfileIds: readonly string[]
}): string | null {
  if (!hasAnyRole(params.actor, DOCUMENT_APPROVER_ROLES[params.templateKey])) {
    return 'Solo el Responsable del SGAI puede aprobar expedientes.'
  }
  if (params.authorProfileIds.includes(params.actorProfileId)) {
    return 'Quien redacta el expediente no puede aprobarlo.'
  }
  return null
}

/** Autores de los apartados redactados (`documents.content[ref].author_id`). */
export function documentAuthors(content: unknown): string[] {
  if (!content || typeof content !== 'object') return []
  const ids = Object.values(content as Record<string, unknown>)
    .map((v) => (v && typeof v === 'object' ? (v as { author_id?: unknown }).author_id : null))
    .filter((v): v is string => typeof v === 'string')
  return Array.from(new Set(ids))
}
