/**
 * Tipos y etiquetas del informe retirado en B16 (DP-06). Solo se usan para
 * mostrar las instantáneas que se guardaron antes.
 */
import type { ActiveCausalChain } from '@/lib/causal-graph/chains'

export const TECH_DOC_DOMAIN_LABELS: Record<string, string> = {
  finanzas: 'Finanzas y Banca',
  seguros: 'Seguros',
  credito: 'Crédito y financiación',
  salud: 'Salud y Medicina',
  rrhh: 'RRHH y Empleo',
  educacion: 'Educación',
  seguridad: 'Seguridad Pública',
  justicia: 'Justicia y Legal',
  migracion: 'Migración',
  infra: 'Infraestructura crítica',
  marketing: 'Marketing',
  operaciones: 'Operaciones',
  atencion: 'Atención al cliente',
  cumplimiento: 'Cumplimiento',
  otro: 'Otro',
}

export const TECH_DOC_RISK_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  pending: 'Pendiente',
}

export const TECH_DOC_DOC_STATUS_LABELS: Record<string, string> = {
  si: 'Sí',
  parcial: 'Parcial',
  proceso: 'En proceso',
  no: 'No',
}

export function formatTechnicalDossierDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

type TechnicalDossierSystemRow = {
  id: string
  name: string
  version: string
  internal_id: string | null
  domain: string
  status: string
  description: string | null
  technical_description: string | null
  intended_use: string | null
  prohibited_uses: string | null
  output_type: string | null
  output_types: string[] | null
  fully_automated: boolean | null
  interacts_persons: boolean
  target_users: string[] | null
  usage_scale: string | null
  geo_scope: string[] | null
  is_ai_system: boolean | null
  is_gpai: boolean
  affects_persons: boolean | null
  vulnerable_groups: boolean
  involves_minors: boolean
  uses_biometric_data: boolean
  manages_critical_infra: boolean
  aiact_risk_level: string
  aiact_risk_basis: string | null
  aiact_risk_reason: string | null
  aiact_obligations: string[] | null
  processes_personal_data: boolean | null
  data_categories: string[] | null
  special_categories: string[] | null
  legal_bases: string[] | null
  data_sources: string[] | null
  training_data_doc: string | null
  data_volume: string | null
  data_retention: string | null
  dpia_completed: string | null
  ai_system_type: string | null
  base_model: string | null
  external_model: string | null
  external_provider: string | null
  frameworks: string | null
  provider_origin: string | null
  has_fine_tuning: boolean
  has_external_tools: boolean
  active_environments: string[] | null
  mlops_integration: string | null
  ai_owner: string | null
  responsible_team: string | null
  tech_lead: string | null
  executive_sponsor: string | null
  dpo_involved: boolean
  review_frequency: string | null
  incident_contact: string | null
  critical_providers: string | null
  has_tech_doc: string | null
  has_logging: string | null
  has_human_oversight: string | null
  oversight_type: string | null
  has_complaint_mechanism: boolean
  has_risk_assessment: string | null
  residual_risk: string | null
  mitigation_notes: string | null
  has_adversarial_test: boolean
  cert_status: string | null
  next_audit_date: string | null
  iso_42001_score: number | null
  iso_42001_checks: Array<{
    key: string | null
    label: string | null
    status: string | null
    status_label: string | null
    weight: number | null
    points: number | null
    points_earned: number | null
    not_applicable: boolean
  }> | null
  created_at: string
  updated_at: string
}

type TechnicalEvidenceRow = {
  id: string
  title: string
  evidence_type: string
  status: string
  external_url: string | null
  created_at: string
  expires_at: string | null
  tags: string[] | null
}

export type ObligationCoverageRow = {
  id: string
  obligation_code: string | null
  title: string
  status: string
  priority: string | null
  evidences_count: number
}

export type TreatmentPlanSummary = {
  id: string
  code: string
  status: string
  zone_at_creation: string | null
  zone_target: string | null
  actions_total: number
  actions_completed: number
  approved_at: string | null
  deadline: string | null
  review_cadence: string | null
}

export type TechnicalDossierData = {
  generatedAt: string
  system: TechnicalDossierSystemRow
  evidenceSummary: {
    total: number
    valid: number
    pending: number
    expired: number
  }
  evidences: TechnicalEvidenceRow[]
  failureModeSummary: {
    total: number
    byDimension: Array<{ dimensionId: string; count: number }>
  }
  isoSummary: {
    implemented: number
    partial: number
    pending: number
  }
  obligationsCoverage: {
    total: number
    withEvidence: number
    rows: ObligationCoverageRow[]
  }
  treatmentPlans: TreatmentPlanSummary[]
  causalChains: ActiveCausalChain[]
}
