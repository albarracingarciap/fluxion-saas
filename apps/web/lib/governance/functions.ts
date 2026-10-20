/**
 * Funciones de gobierno, responsables por sistema y comités (B23b, DP-01).
 *
 * Las funciones de gobierno no son roles de permisos: son designaciones que
 * intervienen en circuitos concretos (el CISO valida los controles de
 * seguridad del plan, el responsable del tratamiento aprueba la DPIA). Una
 * persona conserva su rol y además ocupa la función.
 *
 * La base de datos aplica las incompatibilidades
 * (`trg_governance_designation_rules`, migración 20261020130000); este módulo
 * da los mensajes a la interfaz.
 *
 * Módulo puro (sin Supabase ni Next).
 */

import { hasRole, type RoleHolder } from '@/lib/auth/roles'

export type GovernanceFunction = 'ciso' | 'legal' | 'corporate_risk' | 'data_controller' | 'quality'

export const GOVERNANCE_FUNCTIONS: ReadonlyArray<{
  key: GovernanceFunction
  label: string
  description: string
}> = [
  { key: 'ciso',            label: 'Seguridad de la información (CISO)', description: 'Valida los controles de seguridad del plan de tratamiento (AI Act, Art. 15).' },
  { key: 'legal',           label: 'Legal',                               description: 'Revisa la clasificación AI Act y las excepciones del Art. 6.3, y participa en el Comité de IA.' },
  { key: 'corporate_risk',  label: 'Riesgos corporativos',                description: 'Forma parte del Comité de Riesgos de IA.' },
  { key: 'data_controller', label: 'Responsable del tratamiento',         description: 'Prepara y aprueba la DPIA, con el dictamen del DPO. No puede ser el DPO.' },
  { key: 'quality',         label: 'Función de calidad',                  description: 'Aprueba la documentación técnica (Anexo IV) cuando la organización es proveedora.' },
]

export function getGovernanceFunctionLabel(fn: string): string {
  return GOVERNANCE_FUNCTIONS.find((f) => f.key === fn)?.label ?? fn
}

/** Por qué esta persona no puede ocupar la función; null si puede. */
export function designationBlocker(fn: GovernanceFunction, holder: RoleHolder): string | null {
  if (fn === 'data_controller' && hasRole(holder, 'dpo')) {
    return 'El DPO no puede ser Responsable del tratamiento (RGPD, Art. 38.6).'
  }
  return null
}

/**
 * Aviso (no bloqueo) de DP-01: «quien aprueba un riesgo no lo audita». En una
 * organización pequeña puede no haber alternativa, así que solo se avisa.
 */
export function auditorConflictWarning(holder: RoleHolder, functions: readonly string[]): string | null {
  if (!hasRole(holder, 'auditor')) return null
  if (hasRole(holder, 'sgai_manager') || hasRole(holder, 'executive') || functions.length > 0) {
    return 'Esta persona es Auditor y además aprueba o interviene en el circuito: quien aprueba un riesgo no debería auditarlo.'
  }
  return null
}

// ── Comités ──────────────────────────────────────────────────────────────────

export const COMMITTEE_TIE_BREAK_LABELS: Record<string, string> = {
  chair: 'Voto del presidente',
  escalate: 'Se eleva al órgano superior',
}

type CommitteeMemberLike = { committee_role: string; is_active?: boolean | null }

/** Miembros con voto: todos los activos salvo los asesores (voz sin voto). */
export function votingMembers<T extends CommitteeMemberLike>(members: readonly T[]): T[] {
  return members.filter((m) => m.is_active !== false && m.committee_role !== 'advisor')
}

/** Quórum efectivo: el fijado o, si no hay, la mayoría de los miembros con voto. */
export function effectiveQuorum(quorum: number | null | undefined, votingCount: number): number {
  if (quorum && quorum > 0) return quorum
  return Math.floor(votingCount / 2) + 1
}

/** Aviso al añadir al DPO con voto: en DP-01 tiene voz sin voto. */
export function dpoVoteWarning(holder: RoleHolder, committeeRole: string): string | null {
  if (hasRole(holder, 'dpo') && committeeRole !== 'advisor') {
    return 'El DPO participa con voz pero sin voto (DP-01): añádelo como Asesor.'
  }
  return null
}

// ── Responsables por sistema ─────────────────────────────────────────────────

/** Niveles AI Act en los que el responsable de supervisión humana es obligatorio. */
export const HUMAN_OVERSIGHT_REQUIRED_LEVELS: ReadonlySet<string> = new Set(['high'])

export function humanOversightBlocker(aiActLevel: string | null | undefined, ownerId: string | null | undefined): string | null {
  if (aiActLevel && HUMAN_OVERSIGHT_REQUIRED_LEVELS.has(aiActLevel) && !ownerId) {
    return 'Este sistema es de alto riesgo: asigna el Responsable de supervisión humana en la ficha (AI Act, Art. 14 y 26.2) antes de enviar la evaluación.'
  }
  return null
}
