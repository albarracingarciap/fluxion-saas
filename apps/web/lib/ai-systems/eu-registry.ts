/**
 * Tipos y etiquetas del informe retirado en B16 (DP-06). Solo se usan para
 * mostrar las instantáneas que se guardaron antes.
 */
import type { ObligationCoverageRow, TreatmentPlanSummary } from './technical-dossier'

export const EU_REGISTRY_DOMAIN_LABELS: Record<string, string> = {
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

export const EU_REGISTRY_RISK_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  pending: 'Pendiente',
}

export function formatEuRegistryDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

type EuRegistrySystemRow = {
  id: string
  name: string
  version: string
  internal_id: string | null
  domain: string
  status: string
  description: string | null
  technical_description: string | null
  intended_use: string | null
  output_type: string | null
  output_types: string[] | null
  aiact_risk_level: string
  aiact_risk_basis: string | null
  aiact_risk_reason: string | null
  aiact_obligations: string[] | null
  provider_origin: string | null
  base_model: string | null
  external_model: string | null
  external_provider: string | null
  ai_owner: string | null
  responsible_team: string | null
  review_frequency: string | null
  has_tech_doc: string | null
  has_logging: string | null
  has_human_oversight: string | null
  has_risk_assessment: string | null
  training_data_doc: string | null
  cert_status: string | null
  created_at: string
  updated_at: string
}

export type EuRegistryChecklistItem = {
  key: string
  label: string
  status: 'ready' | 'missing'
  detail: string
}

export type EuRegistryEvidenceRow = {
  id: string
  title: string
  evidence_type: string
  status: string
  external_url: string | null
  expires_at: string | null
  tags: string[] | null
  created_at: string
}

export type EuRegistryData = {
  generatedAt: string
  system: EuRegistrySystemRow
  evidenceCount: number
  readinessScore: number
  ready: boolean
  checklist: EuRegistryChecklistItem[]
  missingItems: EuRegistryChecklistItem[]
  obligationsCoverage: {
    total: number
    withEvidence: number
    rows: ObligationCoverageRow[]
  }
  evidences: EuRegistryEvidenceRow[]
  treatmentPlans: TreatmentPlanSummary[]
}

