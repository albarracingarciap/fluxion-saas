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
}

export type ObligationProposal = {
  status: 'resolved'
  /** Por qué, en una frase; queda en las notas de resolución al aceptarla. */
  reason: string
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES')
const CERRADAS = new Set(['resolved', 'excluded'])

export function obligationProposal(code: string | null, status: string, facts: ProposalFacts): ObligationProposal | null {
  if (!code || CERRADAS.has(status)) return null
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
