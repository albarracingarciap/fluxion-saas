/**
 * Ciclo del expediente documental (B09, B11f).
 *
 *   borrador ⇄ en revisión → aprobado → sustituido (al reabrirlo, nace la versión siguiente en borrador)
 *
 * Desde la pantalla solo se envía a revisión o se devuelve a borrador. La
 * aprobación se decide siempre en Flujos de aprobación (B11f); la base de datos
 * no deja aprobar con usuario (`trg_document_lifecycle_rules`, migración
 * 20261021100000) y el motor excluye a quien redactó algún apartado
 * (`context.prepared_by`, ver `documentAuthors`).
 *
 * Módulo puro (sin Supabase ni Next).
 */

export type DocumentAction = 'submit' | 'return'

export const DOCUMENT_TRANSITIONS: Record<DocumentAction, { from: string; to: string }> = {
  submit:  { from: 'draft',     to: 'in_review' },
  return:  { from: 'in_review', to: 'draft' },
}

/** Autores de los apartados redactados (`documents.content[ref].author_id`). */
export function documentAuthors(content: unknown): string[] {
  if (!content || typeof content !== 'object') return []
  const ids = Object.values(content as Record<string, unknown>)
    .map((v) => (v && typeof v === 'object' ? (v as { author_id?: unknown }).author_id : null))
    .filter((v): v is string => typeof v === 'string')
  return Array.from(new Set(ids))
}
