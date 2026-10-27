/**
 * Tipos y etiquetas del informe retirado en B16 (DP-06). Solo se usan para
 * mostrar las instantáneas que se guardaron antes.
 */
import type { TreatmentPlanSummary } from './technical-dossier'

export const GAP_REPORT_DOMAIN_LABELS: Record<string, string> = {
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

export const GAP_REPORT_RISK_LABELS: Record<string, string> = {
  prohibited: 'Prohibido',
  high: 'Alto riesgo',
  limited: 'Riesgo limitado',
  minimal: 'Riesgo mínimo',
  pending: 'Pendiente',
}

export const GAP_REPORT_FAILURE_MODE_DIMENSIONS: Record<string, string> = {
  tecnica: 'Técnicos',
  legal_b: 'Legales',
  etica: 'Éticos',
  seguridad: 'Seguridad',
  gobernanza: 'Gobernanza',
  roi: 'ROI',
}

export const GAP_REPORT_DOC_STATUS_LABELS: Record<string, string> = {
  si: 'Implementado',
  parcial: 'Parcial',
  proceso: 'En proceso',
  no: 'No',
}

type GapReportSystemRow = {
  id: string
  name: string
  version: string
  domain: string
  status: string
  description: string | null
  intended_use: string | null
  output_type: string | null
  aiact_risk_level: string
  aiact_risk_basis: string | null
  aiact_risk_reason: string | null
  aiact_obligations: string[] | null
  has_risk_assessment: string | null
  training_data_doc: string | null
  has_tech_doc: string | null
  has_logging: string | null
  has_human_oversight: string | null
  has_adversarial_test: boolean
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
  external_provider: string | null
  external_model: string | null
  active_environments: string[] | null
  created_at: string
  updated_at: string
}

type GapReportEvidenceRow = {
  id: string
  title: string
  evidence_type: string
  status: string
  expires_at: string | null
  external_url: string | null
  tags: string[] | null
}

export function formatGapReportDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function getGapReportStatusLabel(status: string) {
  if (status === 'resolved') return 'Resuelta'
  if (status === 'in_progress') return 'En progreso'
  if (status === 'blocked') return 'Bloqueada'
  return 'Pendiente'
}

export type GapReportData = {
  generatedAt: string
  system: GapReportSystemRow
  obligations: Array<{
    ref: string
    name: string
    status: string
    priority: string
    dueDate: string | null
  }>
  pendingObligations: Array<{
    ref: string
    name: string
    status: string
    priority: string
    dueDate: string | null
  }>
  isoGaps: Array<{
    key: string | null
    label: string | null
    status: string | null
    points: number | null
    points_earned: number | null
  }>
  evidenceSummary: {
    total: number
    valid: number
    pending: number
    expired: number
  }
  evidences: GapReportEvidenceRow[]
  failureModes: Array<{
    code: string
    name: string
    dimensionId: string
  }>
  failureModesByDimension: Array<{
    dimensionId: string
    label: string
    count: number
    items: Array<{ code: string; name: string }>
  }>
  treatmentPlans: TreatmentPlanSummary[]
  totalGapSignals: number
}
