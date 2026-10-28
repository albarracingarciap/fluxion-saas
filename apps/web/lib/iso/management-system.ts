/**
 * Sistema de gestión ISO/IEC 42001 de la organización (B20a, DP-09).
 *
 * Las 10 cláusulas del catálogo se siguen a nivel de organización. Decisión
 * del responsable (2026-10-28): proponen «Resuelta» cuando la aplicación tiene
 * datos que lo acreditan; si no, por las evidencias de los tipos obligatorios
 * del catálogo (como las obligaciones del sistema, B17e1).
 *
 * Módulo puro.
 */

/** Cláusulas en el orden de la norma. */
export const SGAI_CLAUSES = [
  'ISO42001-6.1.4', 'ISO42001-6.2', 'ISO42001-7.1', 'ISO42001-7.2', 'ISO42001-8.1',
  'ISO42001-8.2', 'ISO42001-9.1', 'ISO42001-9.2', 'ISO42001-9.3', 'ISO42001-10.2',
] as const

export type SgaiStatus = 'pending' | 'in_progress' | 'resolved'

export const SGAI_STATUS_LABEL: Record<SgaiStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  resolved: 'Resuelta',
}

/** Meses que vale una revisión por la dirección para proponer el §9.3. */
export const MANAGEMENT_REVIEW_MONTHS = 12

export type SgaiFacts = {
  /** Sistemas del alcance de la Declaración que no están retirados. */
  inScopeSystems: number
  /** De ellos, con la evaluación de riesgos vigente aprobada. */
  riskEvaluationApproved: number
  /** De ellos, con la AISIA aprobada. */
  aisiaApproved: number
  activeMembers: number
  /** Miembros activos con alfabetización en IA válida (B24). */
  literacyMembers: number
  /** Última revisión por la dirección celebrada (B20c); null si no hay. */
  lastManagementReviewAt: string | null
}

export type SgaiProposal = { status: 'resolved'; reason: string }

function sumarMeses(iso: string, meses: number): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + meses)
  return d.toISOString()
}

/** Propuesta a partir de los datos de la aplicación; null si no los hay. */
export function sgaiDataProposal(code: string, f: SgaiFacts, nowIso: string): SgaiProposal | null {
  switch (code) {
    case 'ISO42001-8.2':
      return f.inScopeSystems > 0 && f.riskEvaluationApproved >= f.inScopeSystems
        ? { status: 'resolved', reason: `Evaluación de riesgos aprobada en los ${f.inScopeSystems} sistemas del alcance.` }
        : null
    case 'ISO42001-6.1.4':
      return f.inScopeSystems > 0 && f.aisiaApproved >= f.inScopeSystems
        ? { status: 'resolved', reason: `AISIA aprobada en los ${f.inScopeSystems} sistemas del alcance.` }
        : null
    case 'ISO42001-7.2':
      return f.activeMembers > 0 && f.literacyMembers >= f.activeMembers
        ? { status: 'resolved', reason: `Los ${f.activeMembers} miembros activos tienen alfabetización en IA válida.` }
        : null
    case 'ISO42001-9.3':
      return f.lastManagementReviewAt && sumarMeses(f.lastManagementReviewAt, MANAGEMENT_REVIEW_MONTHS) >= nowIso
        ? { status: 'resolved', reason: `Revisión por la dirección celebrada el ${new Date(f.lastManagementReviewAt).toLocaleDateString('es-ES')}.` }
        : null
    default:
      return null
  }
}
