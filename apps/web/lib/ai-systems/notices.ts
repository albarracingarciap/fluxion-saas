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

/**
 * Incidente grave con la organización como responsable del despliegue (B25b,
 * Art. 26.5): informa inmediatamente primero al proveedor y después al
 * importador o distribuidor, si los hay, y a la autoridad de vigilancia del
 * mercado. Si no consigue contactar con el proveedor, se aplica el Art. 73
 * mutatis mutandis. La notificación a la autoridad es la del incidente (Art.
 * 73, con su plazo), no un aviso aparte.
 */
export type IncidentNoticeStep = {
  key: 'proveedor' | 'importador' | 'autoridad'
  label: string
  done: boolean
  /** No cuenta para completar el circuito (solo si los hay). */
  optional: boolean
}

export type IncidentNoticePlan = {
  steps: IncidentNoticeStep[]
  /** Primer paso obligatorio sin hacer. */
  next: IncidentNoticeStep | null
  /** Se notificó a la autoridad sin constar antes el aviso al proveedor. */
  authorityBeforeProvider: boolean
}

export function incidentNoticePlan(facts: {
  reporterRole: 'provider' | 'deployer'
  isSerious: boolean
  notices: ReadonlyArray<{ recipient: NoticeRecipient; notifiedAt: string }>
  /** Fecha de la notificación a la autoridad (inicial o completa); null si no consta. */
  authorityNotifiedAt: string | null
}): IncidentNoticePlan | null {
  if (facts.reporterRole !== 'deployer' || !facts.isSerious) return null
  const alProveedor = facts.notices.filter((n) => n.recipient === 'provider')
  const steps: IncidentNoticeStep[] = [
    { key: 'proveedor', label: 'Aviso al proveedor, inmediatamente', done: alProveedor.length > 0, optional: false },
    {
      key: 'importador',
      label: 'Aviso al importador o distribuidor, si los hay',
      done: facts.notices.some((n) => n.recipient === 'importer' || n.recipient === 'distributor'),
      optional: true,
    },
    { key: 'autoridad', label: 'Notificación a la autoridad de vigilancia del mercado (Art. 73)', done: Boolean(facts.authorityNotifiedAt), optional: false },
  ]
  const primerAviso = alProveedor.map((n) => n.notifiedAt.slice(0, 10)).sort()[0]
  return {
    steps,
    next: steps.find((s) => !s.optional && !s.done) ?? null,
    authorityBeforeProvider: Boolean(facts.authorityNotifiedAt)
      && (!primerAviso || facts.authorityNotifiedAt!.slice(0, 10) < primerAviso),
  }
}
