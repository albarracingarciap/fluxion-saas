/**
 * Propuestas de estado de las obligaciones (B17c, F-11, GAP-11).
 *
 * Una obligación propone su estado a partir de lo hecho en otras fases, sin
 * cambiarlo sola: la persona lo confirma con **Aceptar propuesta**. Hoy:
 *
 * | Hecho | Propuesta |
 * |---|---|
 * | Evaluación de riesgos aprobada | Art. 9 resuelta |
 * | Anexo IV aprobado | Art. 11 resuelta |
 * | FRIA aprobada y notificada a la autoridad | Art. 27 resuelta |
 * | Ficha para el registro UE aprobada y presentada | Art. 49 resuelta; Art. 6.4 si la ficha es de la sección B |
 * | Evidencias válidas vinculadas de todos los tipos obligatorios del catálogo | Obligación resuelta (B17e1) |
 *
 * Módulo puro.
 */

export type ApprovedDocumentFact = {
  version: number
  approvedAt: string
  /** Consta su notificación o presentación (B17b). */
  notified: boolean
}

export type ProposalFacts = {
  /** Evaluación de riesgos vigente (aprobada). */
  approvedEvaluation: { version: number; approvedAt: string } | null
  /** Último documento aprobado de cada plantilla. */
  approvedDocuments: Partial<Record<'annex_iv' | 'fria' | 'eu_registry', ApprovedDocumentFact>>
  /** Sección del Anexo VIII de la ficha para el registro UE (DP-11). */
  euRegistrySection: 'A' | 'B' | 'C' | null
  /** Tipos de evidencia obligatorios del catálogo, por código de obligación (B17e1). */
  mandatoryEvidenceTypes?: Record<string, Array<{ id: string; name: string }>>
}

/** Evidencia vinculada a la obligación: su estado y su tipo del catálogo. */
export type LinkedEvidenceFact = { status: string; typeId: string | null }

export type ObligationProposal = {
  status: 'resolved'
  /** Por qué, en una frase; queda en las notas de resolución al aceptarla. */
  reason: string
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES')
const CERRADAS = new Set(['resolved', 'excluded'])

export function obligationProposal(
  code: string | null,
  status: string,
  facts: ProposalFacts,
  linkedEvidences: readonly LinkedEvidenceFact[] = [],
): ObligationProposal | null {
  if (!code || CERRADAS.has(status)) return null
  return proposalFromApprovals(code, facts) ?? proposalFromEvidences(code, facts, linkedEvidences)
}

/**
 * B17e1: la obligación tiene vinculadas evidencias válidas de todos los tipos
 * obligatorios del catálogo. Sin tipos obligatorios no hay propuesta.
 */
function proposalFromEvidences(code: string, facts: ProposalFacts, linked: readonly LinkedEvidenceFact[]): ObligationProposal | null {
  const exigidos = facts.mandatoryEvidenceTypes?.[code] ?? []
  if (exigidos.length === 0) return null
  const validos = new Set(linked.filter((e) => e.status === 'valid' && e.typeId).map((e) => e.typeId))
  if (!exigidos.every((t) => validos.has(t.id))) return null
  return {
    status: 'resolved',
    reason: `Evidencias válidas vinculadas de todos los tipos exigidos por el catálogo: ${exigidos.map((t) => t.name).join(', ')}.`,
  }
}

function proposalFromApprovals(code: string, facts: ProposalFacts): ObligationProposal | null {
  const doc = facts.approvedDocuments

  switch (code) {
    case 'AI-ACT-ART9': {
      const e = facts.approvedEvaluation
      return e ? { status: 'resolved', reason: `Evaluación de riesgos v${e.version} aprobada el ${fecha(e.approvedAt)}.` } : null
    }
    case 'AI-ACT-ART11': {
      const d = doc.annex_iv
      return d ? { status: 'resolved', reason: `Documentación técnica (Anexo IV) v${d.version} aprobada el ${fecha(d.approvedAt)}.` } : null
    }
    case 'AI-ACT-ART27': {
      const d = doc.fria
      return d?.notified
        ? { status: 'resolved', reason: `FRIA v${d.version} aprobada el ${fecha(d.approvedAt)} y notificada a la autoridad.` }
        : null
    }
    case 'AI-ACT-ART49':
    case 'AI-ACT-ART6-4': {
      const d = doc.eu_registry
      if (!d?.notified) return null
      if (code === 'AI-ACT-ART6-4' && facts.euRegistrySection !== 'B') return null
      return { status: 'resolved', reason: `Ficha para el registro UE v${d.version} aprobada el ${fecha(d.approvedAt)} y presentada en la base de datos de la UE.` }
    }
    default:
      return null
  }
}
