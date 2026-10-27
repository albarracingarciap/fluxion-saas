/**
 * Avisos a terceros (B25a, AI Act, Art. 26.5): al proveedor, al importador,
 * al distribuidor o a la autoridad de vigilancia del mercado, por una
 * suspensión del uso o un incidente. Fluxion no los envía: deja constancia.
 *
 * Módulo puro.
 */

export type NoticeRecipient = 'provider' | 'importer' | 'distributor' | 'authority'

export const NOTICE_RECIPIENT_LABEL: Record<NoticeRecipient, string> = {
  provider: 'Proveedor',
  importer: 'Importador',
  distributor: 'Distribuidor',
  authority: 'Autoridad de vigilancia del mercado',
}

export const NOTICE_RECIPIENTS = Object.keys(NOTICE_RECIPIENT_LABEL) as NoticeRecipient[]

/** Un aviso exigido: lo cumple un aviso a cualquiera de los destinatarios que acepta. */
export type NoticeRequirement = { key: string; label: string; accepts: readonly NoticeRecipient[] }

export type NoticeCheck = { key: string; label: string; done: boolean }

/**
 * Suspensión del uso (Art. 26.5): se informa sin demora indebida al proveedor
 * o distribuidor y a la autoridad de vigilancia del mercado.
 */
export const SUSPENSION_NOTICES: readonly NoticeRequirement[] = [
  { key: 'proveedor', label: 'Aviso al proveedor o distribuidor', accepts: ['provider', 'distributor'] },
  { key: 'autoridad', label: 'Aviso a la autoridad de vigilancia del mercado', accepts: ['authority'] },
]

export function noticeChecks(
  requirements: readonly NoticeRequirement[],
  notices: ReadonlyArray<{ recipient: NoticeRecipient }>,
): NoticeCheck[] {
  return requirements.map((r) => ({
    key: r.key,
    label: r.label,
    done: notices.some((n) => r.accepts.includes(n.recipient)),
  }))
}
