import type { SupabaseClient } from '@supabase/supabase-js'

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
  gpai: 'GPAI',
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

type GapReportObligationRow = {
  obligation_code: string | null
  title: string
  status: string
  priority: string
  due_date: string | null
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

type GapReportFailureModeRow = {
  failure_mode_id: string
  dimension_id: string
}

type GapReportCatalogModeRow = {
  id: string
  code: string
  name: string
  dimension_id: string
}

function mapStatus(value: string | null) {
  if (value === 'si') return 'resolved'
  if (value === 'parcial' || value === 'proceso') return 'in_progress'
  return 'pending'
}

function obligationStatusFromSystem(system: {
  has_risk_assessment: string | null
  training_data_doc: string | null
  has_tech_doc: string | null
  has_logging: string | null
  has_human_oversight: string | null
  has_adversarial_test: boolean
}, obligation: string) {
  if (obligation.includes('Art. 9')) return mapStatus(system.has_risk_assessment)
  if (obligation.includes('Art. 10')) return mapStatus(system.training_data_doc)
  if (obligation.includes('Art. 11')) return mapStatus(system.has_tech_doc)
  if (obligation.includes('Art. 12')) return mapStatus(system.has_logging)
  if (obligation.includes('Art. 14')) return mapStatus(system.has_human_oversight)
  if (obligation.includes('Art. 15')) return system.has_adversarial_test ? 'resolved' : 'pending'
  return 'pending'
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

export async function buildGapReportData(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compliance: SupabaseClient<any, any, any>
  organizationId: string
  aiSystemId: string
}): Promise<GapReportData | null> {
  const { fluxion, compliance, organizationId, aiSystemId } = params

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      version,
      domain,
      status,
      description,
      intended_use,
      output_type,
      aiact_risk_level,
      aiact_risk_basis,
      aiact_risk_reason,
      aiact_obligations,
      has_risk_assessment,
      training_data_doc,
      has_tech_doc,
      has_logging,
      has_human_oversight,
      has_adversarial_test,
      iso_42001_score,
      iso_42001_checks,
      external_provider,
      external_model,
      active_environments,
      created_at,
      updated_at
    `)
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .single<GapReportSystemRow>()

  if (systemError || !system) return null

  const { data: obligationRows } = await fluxion
    .from('system_obligations')
    .select('obligation_code, title, status, priority, due_date')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)
    .eq('source_framework', 'AI_ACT')

  const persistedByCode = new Map(
    ((obligationRows ?? []) as GapReportObligationRow[]).map((row) => [row.obligation_code ?? row.title, row])
  )

  const obligations = (system.aiact_obligations ?? []).map((obligation) => {
    const ref = obligation.split(' — ')[0] ?? obligation
    const persisted = persistedByCode.get(ref) ?? persistedByCode.get(obligation)
    const status = persisted?.status ?? obligationStatusFromSystem(system, obligation)
    return {
      ref,
      name: obligation,
      status,
      priority: persisted?.priority ?? 'medium',
      dueDate: persisted?.due_date ?? null,
    }
  })

  const pendingObligations = obligations.filter((item) => item.status !== 'resolved')

  const isoChecks = system.iso_42001_checks ?? []
  const isoGaps = isoChecks
    .filter((check) => check.status !== 'si')
    .map((check) => ({
      key: check.key,
      label: check.label,
      status: check.status,
      points: check.points,
      points_earned: check.points_earned,
    }))

  const { data: evidenceRows } = await fluxion
    .from('system_evidences')
    .select('id, title, evidence_type, status, expires_at, external_url, tags')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)
    .order('created_at', { ascending: false })

  const evidences = (evidenceRows ?? []) as GapReportEvidenceRow[]

  const evidenceSummary = {
    total: evidences.length,
    valid: evidences.filter((item) => item.status === 'valid').length,
    pending: evidences.filter((item) => item.status === 'draft' || item.status === 'pending_review').length,
    expired: evidences.filter((item) => item.status === 'expired').length,
  }

  const { data: failureModeRows } = await fluxion
    .from('system_failure_modes')
    .select('failure_mode_id, dimension_id')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)

  const failureModesSource = (failureModeRows ?? []) as GapReportFailureModeRow[]
  const failureModeIds = failureModesSource.map((row) => row.failure_mode_id)
  const failureModeCatalog = new Map<string, { code: string; name: string; dimension_id: string }>()

  if (failureModeIds.length > 0) {
    const { data: catalogRows } = await compliance
      .from('failure_modes')
      .select('id, code, name, dimension_id')
      .in('id', failureModeIds)

    for (const row of (catalogRows ?? []) as GapReportCatalogModeRow[]) {
      failureModeCatalog.set(row.id, {
        code: row.code,
        name: row.name,
        dimension_id: row.dimension_id,
      })
    }
  }

  const failureModes = failureModesSource
    .map((row) => {
      const catalog = failureModeCatalog.get(row.failure_mode_id)
      if (!catalog) return null
      return {
        code: catalog.code,
        name: catalog.name,
        dimensionId: catalog.dimension_id,
      }
    })
    .filter((row): row is { code: string; name: string; dimensionId: string } => row !== null)

  const failureModesByDimension = Object.entries(
    failureModes.reduce<Record<string, Array<{ code: string; name: string }>>>((acc, item) => {
      acc[item.dimensionId] = acc[item.dimensionId] ?? []
      acc[item.dimensionId].push({ code: item.code, name: item.name })
      return acc
    }, {})
  )
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([dimensionId, items]) => ({
      dimensionId,
      label: GAP_REPORT_FAILURE_MODE_DIMENSIONS[dimensionId] ?? dimensionId,
      count: items.length,
      items: items.slice(0, 8),
    }))

  // ─── Planes de tratamiento ────────────────────────────────────────────────
  const { data: planRows } = await fluxion
    .from('treatment_plans')
    .select('id, code, status, zone_at_creation, zone_target, actions_total, actions_completed, approved_at, deadline, review_cadence, created_at')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .order('created_at', { ascending: false })

  const treatmentPlans: TreatmentPlanSummary[] = ((planRows ?? []) as Array<TreatmentPlanSummary>).map((p) => ({
    id: p.id,
    code: p.code,
    status: p.status,
    zone_at_creation: p.zone_at_creation,
    zone_target: p.zone_target,
    actions_total: p.actions_total ?? 0,
    actions_completed: p.actions_completed ?? 0,
    approved_at: p.approved_at,
    deadline: p.deadline,
    review_cadence: p.review_cadence,
  }))

  const totalGapSignals =
    pendingObligations.length +
    isoGaps.length +
    evidenceSummary.pending +
    evidenceSummary.expired

  return {
    generatedAt: new Date().toISOString(),
    system,
    obligations,
    pendingObligations,
    isoGaps,
    evidenceSummary,
    evidences,
    failureModes,
    failureModesByDimension,
    treatmentPlans,
    totalGapSignals,
  }
}
