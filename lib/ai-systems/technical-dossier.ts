import type { SupabaseClient } from '@supabase/supabase-js'

import { detectActiveCausalChains, type ActiveCausalChain } from '@/lib/causal-graph/chains'

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
  gpai: 'GPAI',
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

export async function buildTechnicalDossierData(params: {
  fluxion: SupabaseClient
  organizationId: string
  aiSystemId: string
}): Promise<TechnicalDossierData | null> {
  const { fluxion, organizationId, aiSystemId } = params

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      version,
      internal_id,
      domain,
      status,
      description,
      technical_description,
      intended_use,
      prohibited_uses,
      output_type,
      fully_automated,
      interacts_persons,
      target_users,
      usage_scale,
      geo_scope,
      is_ai_system,
      is_gpai,
      affects_persons,
      vulnerable_groups,
      involves_minors,
      uses_biometric_data,
      manages_critical_infra,
      aiact_risk_level,
      aiact_risk_basis,
      aiact_risk_reason,
      aiact_obligations,
      processes_personal_data,
      data_categories,
      special_categories,
      legal_bases,
      data_sources,
      training_data_doc,
      data_volume,
      data_retention,
      dpia_completed,
      ai_system_type,
      base_model,
      external_model,
      external_provider,
      frameworks,
      provider_origin,
      has_fine_tuning,
      has_external_tools,
      active_environments,
      mlops_integration,
      ai_owner,
      responsible_team,
      tech_lead,
      executive_sponsor,
      dpo_involved,
      review_frequency,
      incident_contact,
      critical_providers,
      has_tech_doc,
      has_logging,
      has_human_oversight,
      oversight_type,
      has_complaint_mechanism,
      has_risk_assessment,
      residual_risk,
      mitigation_notes,
      has_adversarial_test,
      cert_status,
      next_audit_date,
      iso_42001_score,
      iso_42001_checks,
      created_at,
      updated_at
    `)
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .single<TechnicalDossierSystemRow>()

  if (systemError || !system) return null

  const { data: evidenceRows } = await fluxion
    .from('system_evidences')
    .select('id, title, evidence_type, status, external_url, created_at, expires_at, tags')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)
    .order('created_at', { ascending: false })

  const evidences = (evidenceRows ?? []) as TechnicalEvidenceRow[]

  const evidenceSummary = {
    total: evidences.length,
    valid: evidences.filter((item) => item.status === 'valid').length,
    pending: evidences.filter((item) => item.status === 'draft' || item.status === 'pending_review').length,
    expired: evidences.filter((item) => item.status === 'expired').length,
  }

  const { data: failureModeRows } = await fluxion
    .from('system_failure_modes')
    .select('dimension_id')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)

  const failureModeSummary = {
    total: (failureModeRows ?? []).length,
    byDimension: Object.entries(
      ((failureModeRows ?? []) as Array<{ dimension_id: string }>).reduce<Record<string, number>>((acc, item) => {
        acc[item.dimension_id] = (acc[item.dimension_id] ?? 0) + 1
        return acc
      }, {})
    ).map(([dimensionId, count]) => ({ dimensionId, count })),
  }

  const isoChecks = system.iso_42001_checks ?? []
  const isoSummary = {
    implemented: isoChecks.filter((check) => check.status === 'si').length,
    partial: isoChecks.filter((check) => check.status === 'parcial' || check.status === 'proceso').length,
    pending: isoChecks.filter((check) => !check.status || check.status === 'no').length,
  }

  // ─── Obligaciones del sistema con cobertura de evidencia ──────────────────
  const { data: obligationRows } = await fluxion
    .from('system_obligations')
    .select('id, obligation_code, title, status, priority')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)
    .order('priority', { ascending: false, nullsFirst: false })

  const obligationIds = (obligationRows ?? []).map((row) => (row as { id: string }).id)
  const evidenceCountByObligation = new Map<string, number>()

  if (obligationIds.length > 0) {
    const { data: links } = await fluxion
      .from('system_obligation_evidences')
      .select('obligation_id')
      .in('obligation_id', obligationIds)

    for (const link of (links ?? []) as Array<{ obligation_id: string }>) {
      evidenceCountByObligation.set(
        link.obligation_id,
        (evidenceCountByObligation.get(link.obligation_id) ?? 0) + 1
      )
    }
  }

  const obligationsRows: ObligationCoverageRow[] = (obligationRows ?? []).map((row) => {
    const r = row as { id: string; obligation_code: string | null; title: string; status: string; priority: string | null }
    return {
      id: r.id,
      obligation_code: r.obligation_code,
      title: r.title,
      status: r.status,
      priority: r.priority,
      evidences_count: evidenceCountByObligation.get(r.id) ?? 0,
    }
  })

  // Deduplicar por obligation_code (o title si no hay código), priorizando la fila con código
  const seenObligations = new Map<string, ObligationCoverageRow>()
  for (const row of obligationsRows) {
    const key = row.obligation_code ?? row.title
    const existing = seenObligations.get(key)
    if (!existing || (!existing.obligation_code && row.obligation_code)) {
      seenObligations.set(key, {
        ...row,
        evidences_count: Math.max(row.evidences_count, existing?.evidences_count ?? 0),
      })
    }
  }
  const dedupedObligations = Array.from(seenObligations.values())

  const obligationsCoverage = {
    total: dedupedObligations.length,
    withEvidence: dedupedObligations.filter((o) => o.evidences_count > 0).length,
    rows: dedupedObligations,
  }

  // ─── Planes de tratamiento del sistema ────────────────────────────────────
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

  // ─── Cadenas causales activas para este sistema ───────────────────────────
  let causalChains: ActiveCausalChain[] = []
  try {
    const allChains = await detectActiveCausalChains(organizationId, { minLength: 3, limit: 20 })
    causalChains = allChains.filter((c) => c.system_id === aiSystemId)
  } catch (e) {
    // Si falla la detección (ej. compliance DB inaccesible) seguimos sin cadenas
    causalChains = []
  }

  return {
    generatedAt: new Date().toISOString(),
    system,
    evidenceSummary,
    evidences,
    failureModeSummary,
    isoSummary,
    obligationsCoverage,
    treatmentPlans,
    causalChains,
  }
}
