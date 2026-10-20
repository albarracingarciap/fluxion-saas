/**
 * Mapa de aprobaciones de DP-01 (decidido el 2026-10-19; textos completos el
 * 2026-10-20). Fuente: docs/producto/plan-resolucion-gaps.md, §5.
 *
 * Es el objetivo: algunas filas ya se aplican y otras llegan con B11 (Flujos de
 * aprobación con políticas por defecto). `today` dice qué hace hoy la
 * aplicación, para que la pantalla no prometa lo que todavía no ocurre.
 *
 * Módulo puro (sin Supabase ni Next).
 */

import type { GovernanceFunction } from './functions'

export type ApprovalActor =
  | { kind: 'role'; key: string }
  | { kind: 'function'; key: GovernanceFunction }
  | { kind: 'committee'; key: 'ai_committee' | 'risk_committee' | 'director_review' | 'technical_committee' }
  | { kind: 'anyone'; label: string }

export type ApprovalMapRow = {
  object: string
  prepares: ApprovalActor[]
  reviews: ApprovalActor[]
  /** Nota del paso de revisión o consulta (cuándo aplica). */
  reviewNote?: string
  approves: ApprovalActor[]
  approveNote?: string
  /** Lo que hace hoy la aplicación. */
  today: string
}

const role = (key: string): ApprovalActor => ({ kind: 'role', key })
const fn = (key: GovernanceFunction): ApprovalActor => ({ kind: 'function', key })
const committee = (key: Extract<ApprovalActor, { kind: 'committee' }>['key']): ApprovalActor => ({ kind: 'committee', key })

export const APPROVAL_MAP: readonly ApprovalMapRow[] = [
  {
    object: 'Clasificación AI Act',
    prepares: [role('system_owner')],
    reviews: [fn('legal'), role('compliance_analyst')],
    approves: [role('sgai_manager'), committee('ai_committee')],
    approveNote: 'El Comité de IA si es alto riesgo o se invoca el Art. 6.3',
    today: 'Sin aprobación (B11)',
  },
  {
    object: 'Evaluación de riesgos y plan · nivel 1',
    prepares: [role('risk_analyst'), role('system_owner')],
    reviews: [fn('ciso')],
    reviewNote: 'Si hay controles de seguridad',
    approves: [role('sgai_manager')],
    today: 'Responsable del SGAI distinto de quien prepara',
  },
  {
    object: 'Evaluación de riesgos y plan · nivel 2 (Zona II)',
    prepares: [role('risk_analyst'), role('system_owner')],
    reviews: [fn('ciso')],
    reviewNote: 'Si hay controles de seguridad',
    approves: [committee('risk_committee')],
    today: 'Responsable del SGAI, o la política configurada en Flujos de aprobación',
  },
  {
    object: 'Evaluación de riesgos y plan · nivel 3 (Zona I)',
    prepares: [role('risk_analyst'), role('system_owner')],
    reviews: [committee('risk_committee')],
    approves: [committee('director_review')],
    approveNote: 'La dirección puede delegarlo, con fecha de fin',
    today: 'Responsable del SGAI, o la política configurada en Flujos de aprobación',
  },
  {
    object: 'AISIA / FRIA',
    prepares: [role('risk_analyst')],
    reviews: [role('dpo'), fn('legal')],
    reviewNote: 'Dictamen del DPO',
    approves: [committee('ai_committee')],
    today: 'Responsable del SGAI distinto de quien la prepara',
  },
  {
    object: 'DPIA',
    prepares: [fn('data_controller')],
    reviews: [role('dpo')],
    reviewNote: 'Dictamen obligatorio',
    approves: [fn('data_controller')],
    today: 'Responsable del SGAI que no la redactó',
  },
  {
    object: 'Documentación técnica (Anexo IV)',
    prepares: [role('system_owner')],
    reviews: [role('sgai_manager')],
    approves: [role('sgai_manager'), fn('quality')],
    approveNote: 'La función de calidad si la organización es proveedora',
    today: 'Responsable del SGAI que no lo redactó',
  },
  {
    object: 'Declaración de Aplicabilidad',
    prepares: [role('sgai_manager')],
    reviews: [committee('ai_committee')],
    approves: [role('executive'), committee('director_review')],
    today: 'Administrador, Responsable del SGAI o CAIO (B11)',
  },
  {
    object: 'Evidencias',
    prepares: [{ kind: 'anyone', label: 'Quien las aporta' }],
    reviews: [],
    approves: [role('sgai_manager')],
    approveNote: 'O un revisor designado distinto del autor',
    today: 'Responsable del SGAI distinto de quien la aporta',
  },
  {
    object: 'Política de IA',
    prepares: [role('caio'), role('sgai_manager')],
    reviews: [committee('ai_committee')],
    approves: [role('executive')],
    today: 'No existe todavía en la aplicación',
  },
]

/** Todos los actores del mapa, sin repetir, para saber a quién hay que tener. */
export function approvalMapActors(): ApprovalActor[] {
  const vistos = new Set<string>()
  const out: ApprovalActor[] = []
  for (const row of APPROVAL_MAP) {
    for (const a of [...row.prepares, ...row.reviews, ...row.approves]) {
      const k = a.kind === 'anyone' ? 'anyone' : `${a.kind}:${a.key}`
      if (!vistos.has(k)) { vistos.add(k); out.push(a) }
    }
  }
  return out
}
