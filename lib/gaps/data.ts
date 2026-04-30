import { buildArticleToFailureModeMap, extractArticleCode, normalizeObligationCode } from '@/lib/causal-graph/amplifiers'
import { createComplianceClient } from '@/lib/supabase/compliance'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import {
  buildGapGroups,
  GAP_GROUPING_ENGINE_VERSION,
  type GapGroupingMeta,
} from '@/lib/gaps/grouping'

export type GapLayer = 'normativo' | 'fmea' | 'control' | 'caducidad'
export type GapSeverity = 'critico' | 'alto' | 'medio'
export type GapGroupType =
  | 'normativo_por_sistema'
  | 'fmea_por_familia'
  | 'control_por_plan'
  | 'caducidad_por_sistema'

type GapSystemRow = {
  id: string
  name: string
  internal_id: string | null
  status: string
  domain: string
  aiact_risk_level: string
  aiact_obligations: string[] | null
  created_at: string
}

type GapObligationRow = {
  id: string
  ai_system_id: string
  obligation_code: string | null
  title: string
  status: string
  priority: string
  owner_user_id: string | null
  due_date: string | null
  created_at: string
}

type GapEvidenceRow = {
  id: string
  ai_system_id: string
  title: string
  status: string
  evidence_type: string
  owner_user_id: string | null
  expires_at: string | null
  created_at: string
}

type GapEvaluationRow = {
  id: string
  system_id: string
  state: 'draft' | 'in_review' | 'approved' | 'superseded'
  cached_zone: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv' | null
  version: number
  updated_at: string
}

type GapFmeaItemRow = {
  id: string
  evaluation_id: string
  failure_mode_id: string
  status: 'pending' | 'evaluated' | 'skipped'
  s_actual: number | null
  created_at: string
}

type GapPlanRow = {
  id: string
  system_id: string
  evaluation_id: string
  status: 'draft' | 'in_review' | 'approved' | 'in_progress' | 'closed' | 'superseded'
  zone_at_creation: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv'
  zone_target: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv' | null
  updated_at: string
}

type GapTreatmentActionRow = {
  id: string
  plan_id: string
  fmea_item_id: string
  option: 'mitigar' | 'aceptar' | 'transferir' | 'evitar' | 'diferir' | null
  status: 'pending' | 'in_progress' | 'evidence_pending' | 'completed' | 'accepted' | 'cancelled'
  s_actual_at_creation: number
  control_id: string | null
  owner_id: string | null
  due_date: string | null
  created_at: string
}

type GapFailureModeCatalogRow = {
  id: string
  code: string
  name: string
}

type GapControlRow = {
  id: string
  system_id: string | null
  template_id: string
  status: string
  compliance_score: number | null
  owner_id: string | null
}

type GapControlTemplateRow = {
  id: string
  code: string
  name: string
}

type GapProfileRow = {
  id: string
  full_name: string | null
}

type GapOrganizationMemberRow = {
  user_id: string
  role: string
  full_name: string | null
}

type GapDispositionRow = {
  id: string
  gap_key: string
  gap_layer: string
  gap_source_id: string
  disposition: 'accepted' | 'not_applicable'
  rationale: string
  decided_by: string | null
  decided_at: string
  expires_at: string | null
}

export type GapAssignableMember = {
  id: string
  full_name: string
  role: string
}

export type GapDispositionType = 'accepted' | 'not_applicable'

export type GapDispositionRecord = {
  id: string
  gap_key: string
  gap_layer: GapLayer
  gap_source_id: string
  disposition: GapDispositionType
  rationale: string
  decided_by: string | null
  decided_by_name: string | null
  decided_at: string
  expires_at: string | null
  expired: boolean
}

export type ExcludedGapRecord = UnifiedGapRecord & { disposition: GapDispositionRecord }

export type GapCausalAmplifier = {
  failure_mode_id: string;
  failure_mode_code: string;
  failure_mode_name: string;
  s_actual: number | null;
};

export type UnifiedGapRecord = {
  key: string
  id: string
  layer: GapLayer
  severity: GapSeverity
  system_id: string
  system_name: string
  system_code: string
  system_status: string
  system_domain: string
  aiact_risk_level: string
  title: string
  meta: string
  source_ref: string
  owner_id: string | null
  owner_name: string | null
  due_date: string | null
  overdue: boolean
  days_until_due: number | null
  created_at: string
  detail_url: string
  action_label: string
  context_label: string
  evaluation_id: string | null
  plan_id: string | null
  treatment_action_id: string | null
  control_id: string | null
  evidence_id: string | null
  failure_mode_id: string | null
  obligation_id: string | null
  raw_score: number | null
  causal_amplifiers: GapCausalAmplifier[] | null
}

export type GapExposureSystem = {
  system_id: string
  system_name: string
  system_code: string
  exposure_score: number
  corrective_pressure: number
  preventive_pressure: number
  active_risk_pressure: number
  current_zone: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv' | null
  gaps_normativo_count: number
  gaps_fmea_count: number
  gaps_control_count: number
  gaps_caducidad_count: number
}

export type GapGroupRecord = {
  group_id: string
  group_type: GapGroupType
  layer: GapLayer
  title: string
  subtitle: string
  severity_max: GapSeverity
  systems_count: number
  items_count: number
  owner_hint: string | null
  detail_url: string
  children: UnifiedGapRecord[]
  system_ids: string[]
  system_names: string[]
}

export type GapsDataResult = {
  gaps: UnifiedGapRecord[]
  excluded: ExcludedGapRecord[]
  groups: GapGroupRecord[]
  members: GapAssignableMember[]
  grouping: GapGroupingMeta
  summary: {
    total: number
    critico: number
    alto: number
    medio: number
    by_layer: Record<GapLayer, number>
    systems_affected: number
    total_systems: number
    excluded_count: number
  }
  exposure: GapExposureSystem[]
  caducities: UnifiedGapRecord[]
  systems_with_gaps: Array<{ system_id: string; system_name: string; system_code: string; count: number }>
}

function formatOwnerName(profile: GapProfileRow | undefined) {
  if (!profile) return null
  return profile.full_name?.trim() || 'Usuario'
}

function getSystemCode(system: GapSystemRow) {
  return system.internal_id ?? system.name
}

function getSeverityRank(severity: GapSeverity) {
  if (severity === 'critico') return 3
  if (severity === 'alto') return 2
  return 1
}

function getSeverityFromObligationPriority(priority: string): GapSeverity {
  if (priority === 'critical' || priority === 'high') return priority === 'critical' ? 'critico' : 'alto'
  return 'medio'
}

function getSeverityFromSActual(value: number): GapSeverity | null {
  if (value >= 9) return 'critico'
  if (value === 8) return 'alto'
  if (value === 7) return 'medio'
  return null
}

function getDaysUntil(dateString: string | null, now: Date) {
  if (!dateString) return null
  const target = new Date(`${dateString}T00:00:00`)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getCaducitySeverity(daysUntil: number): GapSeverity | null {
  if (daysUntil <= 7) return 'critico'
  if (daysUntil <= 14) return 'alto'
  if (daysUntil <= 30) return 'medio'
  return null
}

function getCurrentZoneForSystem(params: {
  evaluation: GapEvaluationRow | null
  plan: GapPlanRow | null
}) {
  if (params.plan) return params.plan.zone_target ?? params.plan.zone_at_creation
  return params.evaluation?.cached_zone ?? null
}

export async function buildGapsData(organizationId: string): Promise<GapsDataResult> {
  const fluxion = createFluxionClient()
  const compliance = createComplianceClient()
  const now = new Date()

  // Load causal amplifier map in parallel with other queries
  // (catalog-level: article_code -> failure_mode_ids that amplify it)
  const articleToFmMapPromise = buildArticleToFailureModeMap()

  const [
    systemsResult,
    obligationsResult,
    evidencesResult,
    evaluationsResult,
    plansResult,
    membersResult,
    dispositionsResult,
  ] = await Promise.all([
    fluxion
      .from('ai_systems')
      .select('id, name, internal_id, status, domain, aiact_risk_level, aiact_obligations, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    fluxion
      .from('system_obligations')
      .select('id, ai_system_id, obligation_code, title, status, priority, owner_user_id, due_date, created_at')
      .eq('organization_id', organizationId)
      .eq('source_framework', 'AI_ACT'),
    fluxion
      .from('system_evidences')
      .select('id, ai_system_id, title, status, evidence_type, owner_user_id, expires_at, created_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('fmea_evaluations')
      .select('id, system_id, state, cached_zone, version, updated_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('treatment_plans')
      .select('id, system_id, evaluation_id, status, zone_at_creation, zone_target, updated_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('profiles')
      .select('user_id, role, full_name')
      .eq('organization_id', organizationId),
    fluxion
      .from('gap_dispositions')
      .select('id, gap_key, gap_layer, gap_source_id, disposition, rationale, decided_by, decided_at, expires_at')
      .eq('organization_id', organizationId),
  ])

  if (systemsResult.error) {
    throw new Error(`No se pudieron cargar los sistemas para gaps: ${systemsResult.error.message}`)
  }
  if (membersResult.error) {
    throw new Error(`No se pudieron cargar los miembros para gaps: ${membersResult.error.message}`)
  }

  const systems = (systemsResult.data ?? []) as GapSystemRow[]
  const obligations = (obligationsResult.data ?? []) as GapObligationRow[]
  const evidences = (evidencesResult.data ?? []) as GapEvidenceRow[]
  const evaluations = (evaluationsResult.data ?? []) as GapEvaluationRow[]
  const plans = (plansResult.data ?? []) as GapPlanRow[]
  const members = (membersResult.data ?? []) as GapOrganizationMemberRow[]
  const dispositions = (dispositionsResult.data ?? []) as GapDispositionRow[]

  const latestEvaluationBySystem = new Map<string, GapEvaluationRow>()
  for (const row of [...evaluations]
    .filter((item) => item.state !== 'superseded')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (!latestEvaluationBySystem.has(row.system_id)) {
      latestEvaluationBySystem.set(row.system_id, row)
    }
  }

  const latestPlanBySystem = new Map<string, GapPlanRow>()
  for (const row of [...plans]
    .filter((item) => item.status !== 'superseded')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (!latestPlanBySystem.has(row.system_id)) {
      latestPlanBySystem.set(row.system_id, row)
    }
  }

  const latestEvaluationIds = Array.from(latestEvaluationBySystem.values()).map((row) => row.id)
  const latestPlanIds = Array.from(latestPlanBySystem.values()).map((row) => row.id)

  const [
    fmeaItemsResult,
    treatmentActionsResult,
    controlsResult,
  ] = await Promise.all([
    latestEvaluationIds.length === 0
      ? { data: [], error: null }
      : fluxion
          .from('fmea_items')
          .select('id, evaluation_id, failure_mode_id, status, s_actual, created_at')
          .in('evaluation_id', latestEvaluationIds),
    latestPlanIds.length === 0
      ? { data: [], error: null }
      : fluxion
          .from('treatment_actions')
          .select('id, plan_id, fmea_item_id, option, status, s_actual_at_creation, control_id, owner_id, due_date, created_at')
          .in('plan_id', latestPlanIds),
    fluxion
      .from('controls')
      .select('id, system_id, template_id, status, compliance_score, owner_id')
      .eq('organization_id', organizationId),
  ])

  if (fmeaItemsResult.error) {
    throw new Error(`No se pudieron cargar los ítems FMEA para gaps: ${fmeaItemsResult.error.message}`)
  }

  if (treatmentActionsResult.error) {
    throw new Error(`No se pudieron cargar las acciones de tratamiento para gaps: ${treatmentActionsResult.error.message}`)
  }

  if (controlsResult.error) {
    throw new Error(`No se pudieron cargar los controles para gaps: ${controlsResult.error.message}`)
  }

  const fmeaItems = (fmeaItemsResult.data ?? []) as GapFmeaItemRow[]
  const treatmentActions = (treatmentActionsResult.data ?? []) as GapTreatmentActionRow[]
  const controls = (controlsResult.data ?? []) as GapControlRow[]

  const failureModeIds = Array.from(new Set(fmeaItems.map((row) => row.failure_mode_id)))
  const controlTemplateIds = Array.from(new Set(controls.map((row) => row.template_id)))
  const profileIds = Array.from(
    new Set(
      [
        ...obligations.map((row) => row.owner_user_id),
        ...evidences.map((row) => row.owner_user_id),
        ...treatmentActions.map((row) => row.owner_id),
        ...controls.map((row) => row.owner_id),
        ...dispositions.map((row) => row.decided_by),
      ].filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  )

  const [failureModesResult, controlTemplatesResult, profilesResult] = await Promise.all([
    failureModeIds.length === 0
      ? { data: [], error: null }
      : compliance
          .from('failure_modes')
          .select('id, code, name')
          .in('id', failureModeIds),
    controlTemplateIds.length === 0
      ? { data: [], error: null }
      : compliance
          .from('control_templates')
          .select('id, code, name')
          .in('id', controlTemplateIds),
    profileIds.length === 0
      ? { data: [], error: null }
      : fluxion
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds),
  ])

  const failureModes = (failureModesResult.data ?? []) as GapFailureModeCatalogRow[]
  const controlTemplates = (controlTemplatesResult.data ?? []) as GapControlTemplateRow[]
  const profiles = (profilesResult.data ?? []) as GapProfileRow[]

  // Resolve the amplifier map (was started in parallel)
  const articleToFmMap = await articleToFmMapPromise

  // Build per-system active failure_mode lookup: system_id -> Map<failure_mode_id, s_actual>
  // Used to filter catalog-level amplifiers to only those active in the gap's system
  const activeBySystem = new Map<string, Map<string, number | null>>()
  const evalEntries = Array.from(latestEvaluationBySystem.entries())
  for (const item of fmeaItems) {
    // Find which system this item belongs to via its evaluation
    for (let k = 0; k < evalEntries.length; k++) {
      const sysId = evalEntries[k][0]
      const evalRow = evalEntries[k][1]
      if (evalRow.id === item.evaluation_id) {
        if (!activeBySystem.has(sysId)) {
          activeBySystem.set(sysId, new Map())
        }
        activeBySystem.get(sysId)!.set(item.failure_mode_id, item.s_actual)
        break
      }
    }
  }

  const systemMap = new Map(systems.map((row) => [row.id, row]))
  const failureModeMap = new Map(failureModes.map((row) => [row.id, row]))
  const controlTemplateMap = new Map(controlTemplates.map((row) => [row.id, row]))
  const profileMap = new Map(profiles.map((row) => [row.id, row]))
  const controlMap = new Map(controls.map((row) => [row.id, row]))
  const actionByItemId = new Map(treatmentActions.map((row) => [row.fmea_item_id, row]))

  const gaps: UnifiedGapRecord[] = []

  // Build a set of resolved obligation codes per system (from persisted records, for reconciliation)
  const resolvedObligationsBySystem = new Map<string, Set<string>>()
  for (const record of obligations) {
    if (record.status !== 'resolved') continue
    const key = record.obligation_code ?? record.title
    if (!key) continue
    if (!resolvedObligationsBySystem.has(record.ai_system_id)) {
      resolvedObligationsBySystem.set(record.ai_system_id, new Set())
    }
    resolvedObligationsBySystem.get(record.ai_system_id)!.add(key)
  }

  // Determine severity from the system's AI Act risk level
  // DB may store English ('high', 'limited', 'minimal', 'unacceptable') or Spanish ('alto_riesgo', etc.)
  function severityFromRiskLevel(riskLevel: string): GapSeverity {
    const level = riskLevel.toLowerCase()
    if (level === 'unacceptable' || level === 'inaceptable') return 'critico'
    if (level === 'high' || level === 'alto' || level === 'alto_riesgo') return 'critico'
    if (level === 'limited' || level === 'limitado' || level === 'limitado_riesgo') return 'alto'
    return 'medio'
  }

  // Generate normativo gaps from persisted system_obligations records
  for (const record of obligations) {
    if (['resolved', 'excluded'].includes(record.status)) continue

    const system = systemMap.get(record.ai_system_id)
    if (!system) continue

    const ref = record.obligation_code ?? record.title
    const ownerName = formatOwnerName(profileMap.get(record.owner_user_id ?? ''))
    const daysUntil = getDaysUntil(record.due_date, now)
    const overdue = typeof daysUntil === 'number' ? daysUntil < 0 : false

    // Compute causal amplifiers for this normativo gap
    const normalizedCode = extractArticleCode(ref) ?? extractArticleCode(record.title)
    let causalAmplifiers: GapCausalAmplifier[] | null = null

    if (normalizedCode) {
      const amplifierFmIds = articleToFmMap.get(normalizedCode) ?? []
      const systemActiveFms = activeBySystem.get(system.id)

      if (systemActiveFms && amplifierFmIds.length > 0) {
        const activeAmplifiers: GapCausalAmplifier[] = []

        for (let i = 0; i < amplifierFmIds.length; i++) {
          const fmId = amplifierFmIds[i]
          if (systemActiveFms.has(fmId)) {
            const catalog = failureModeMap.get(fmId)
            if (catalog) {
              activeAmplifiers.push({
                failure_mode_id: fmId,
                failure_mode_code: catalog.code,
                failure_mode_name: catalog.name,
                s_actual: systemActiveFms.get(fmId) ?? null,
              })
            }
          }
        }

        if (activeAmplifiers.length > 0) {
          causalAmplifiers = activeAmplifiers.sort((a, b) => {
            if ((b.s_actual ?? 0) !== (a.s_actual ?? 0)) return (b.s_actual ?? 0) - (a.s_actual ?? 0)
            return a.failure_mode_code.localeCompare(b.failure_mode_code)
          })
        }
      }
    }

    gaps.push({
      key: `normativo:${record.id}`,
      id: record.id,
      layer: 'normativo',
      severity: getSeverityFromObligationPriority(record.priority),
      system_id: system.id,
      system_name: system.name,
      system_code: getSystemCode(system),
      system_status: system.status,
      system_domain: system.domain,
      aiact_risk_level: system.aiact_risk_level,
      title: record.title,
      meta: `${getSystemCode(system)} · ${ref} · ${ownerName ?? 'Sin asignación'}`,
      source_ref: ref,
      owner_id: record.owner_user_id,
      owner_name: ownerName,
      due_date: record.due_date,
      overdue,
      days_until_due: daysUntil,
      created_at: record.created_at,
      detail_url: `/inventario/${system.id}?tab=obligaciones`,
      action_label: 'Abrir obligaciones →',
      context_label: `Obligación AI Act · ${system.aiact_risk_level.replace('_', ' ')}`,
      evaluation_id: null,
      plan_id: null,
      treatment_action_id: null,
      control_id: null,
      evidence_id: null,
      failure_mode_id: null,
      obligation_id: record.id,
      raw_score: null,
      causal_amplifiers: causalAmplifiers,
    })
  }

  for (const item of fmeaItems) {
    const severity = item.s_actual ? getSeverityFromSActual(item.s_actual) : null
    if (!severity) continue

    const evaluation = Array.from(latestEvaluationBySystem.values()).find((row) => row.id === item.evaluation_id)
    if (!evaluation) continue
    const system = systemMap.get(evaluation.system_id)
    if (!system) continue

    const action = actionByItemId.get(item.id) ?? null
    const hasResolvedAction =
      action &&
      ['completed', 'accepted', 'in_progress', 'pending', 'evidence_pending'].includes(action.status)

    if (hasResolvedAction) continue

    const failureMode = failureModeMap.get(item.failure_mode_id)
    gaps.push({
      key: `fmea:${item.id}`,
      id: item.id,
      layer: 'fmea',
      severity,
      system_id: system.id,
      system_name: system.name,
      system_code: getSystemCode(system),
      system_status: system.status,
      system_domain: system.domain,
      aiact_risk_level: system.aiact_risk_level,
      title: failureMode ? `${failureMode.code} · ${failureMode.name}` : 'Modo de fallo evaluado sin tratamiento',
      meta: `${getSystemCode(system)} · ${failureMode?.code ?? 'FMEA'} · Sin plan de tratamiento`,
      source_ref: failureMode?.code ?? item.failure_mode_id,
      owner_id: null,
      owner_name: null,
      due_date: null,
      overdue: false,
      days_until_due: null,
      created_at: item.created_at,
      detail_url: `/inventario/${system.id}/fmea/${evaluation.id}/evaluar?item=${item.id}`,
      action_label: 'Abrir FMEA →',
      context_label: item.s_actual === 9 ? 'Modo S=9 sin tratamiento' : `Modo S=${item.s_actual} sin tratamiento`,
      evaluation_id: evaluation.id,
      plan_id: null,
      treatment_action_id: null,
      control_id: null,
      evidence_id: null,
      failure_mode_id: item.failure_mode_id,
      obligation_id: null,
      raw_score: item.s_actual,
      causal_amplifiers: null,
    })
  }

  for (const action of treatmentActions) {
    if (action.option !== 'mitigar') continue
    if (!['pending', 'in_progress', 'evidence_pending'].includes(action.status)) continue

    const plan = Array.from(latestPlanBySystem.values()).find((row) => row.id === action.plan_id)
    if (!plan) continue
    const system = systemMap.get(plan.system_id)
    if (!system) continue
    const ownerName = formatOwnerName(profileMap.get(action.owner_id ?? ''))
    const daysUntil = getDaysUntil(action.due_date, now)
    const overdue = typeof daysUntil === 'number' ? daysUntil < 0 : false
    const fmeaItem = fmeaItems.find((row) => row.id === action.fmea_item_id)
    const failureMode = fmeaItem ? failureModeMap.get(fmeaItem.failure_mode_id) : null
    const control = action.control_id ? controlMap.get(action.control_id) ?? null : null
    const template = control?.template_id ? controlTemplateMap.get(control.template_id) ?? null : null
    const severity = getSeverityFromSActual(action.s_actual_at_creation) ?? 'medio'

    gaps.push({
      key: `control:${action.id}`,
      id: action.id,
      layer: 'control',
      severity,
      system_id: system.id,
      system_name: system.name,
      system_code: getSystemCode(system),
      system_status: system.status,
      system_domain: system.domain,
      aiact_risk_level: system.aiact_risk_level,
      title: template
        ? `${template.code} · ${template.name}`
        : failureMode
          ? `Mitigación pendiente · ${failureMode.code}`
          : 'Control de mitigación pendiente',
      meta: `${getSystemCode(system)} · ${failureMode?.code ?? 'Control'} · ${ownerName ?? 'Sin owner'}`,
      source_ref: template?.code ?? failureMode?.code ?? action.id,
      owner_id: action.owner_id,
      owner_name: ownerName,
      due_date: action.due_date,
      overdue,
      days_until_due: daysUntil,
      created_at: action.created_at,
      detail_url: `/inventario/${system.id}/fmea/${plan.evaluation_id}/plan?action=${action.id}`,
      action_label: 'Abrir plan →',
      context_label: action.status === 'evidence_pending' ? 'Control implementado, falta evidencia' : 'Mitigación pendiente de cierre',
      evaluation_id: plan.evaluation_id,
      plan_id: plan.id,
      treatment_action_id: action.id,
      control_id: action.control_id,
      evidence_id: null,
      failure_mode_id: fmeaItem?.failure_mode_id ?? null,
      obligation_id: null,
      raw_score: action.s_actual_at_creation,
      causal_amplifiers: null,
    })
  }

  for (const evidence of evidences) {
    const system = systemMap.get(evidence.ai_system_id)
    if (!system) continue
    const daysUntil = getDaysUntil(evidence.expires_at, now)
    if (daysUntil === null) continue
    const severity = getCaducitySeverity(daysUntil)
    if (!severity) continue
    const overdue = daysUntil < 0
    const ownerName = formatOwnerName(profileMap.get(evidence.owner_user_id ?? ''))

    gaps.push({
      key: `caducidad:${evidence.id}`,
      id: evidence.id,
      layer: 'caducidad',
      severity,
      system_id: system.id,
      system_name: system.name,
      system_code: getSystemCode(system),
      system_status: system.status,
      system_domain: system.domain,
      aiact_risk_level: system.aiact_risk_level,
      title: evidence.title,
      meta: `${getSystemCode(system)} · ${evidence.evidence_type} · ${ownerName ?? 'Sin owner'}`,
      source_ref: evidence.evidence_type,
      owner_id: evidence.owner_user_id,
      owner_name: ownerName,
      due_date: evidence.expires_at,
      overdue,
      days_until_due: daysUntil,
      created_at: evidence.created_at,
      detail_url: `/inventario/${system.id}?tab=evidencias`,
      action_label: 'Abrir evidencias →',
      context_label: overdue ? 'Evidencia expirada' : 'Caducidad próxima',
      evaluation_id: null,
      plan_id: null,
      treatment_action_id: null,
      control_id: null,
      evidence_id: evidence.id,
      failure_mode_id: null,
      obligation_id: null,
      raw_score: null,
      causal_amplifiers: null,
    })
  }

  const activeDispositionMap = new Map<string, GapDispositionRecord>()
  for (const row of dispositions) {
    const expired = row.expires_at ? new Date(row.expires_at) <= now : false
    if (!expired) {
      const profile = profileMap.get(row.decided_by ?? '')
      activeDispositionMap.set(row.gap_key, {
        id: row.id,
        gap_key: row.gap_key,
        gap_layer: row.gap_layer as GapLayer,
        gap_source_id: row.gap_source_id,
        disposition: row.disposition,
        rationale: row.rationale,
        decided_by: row.decided_by,
        decided_by_name: profile?.full_name?.trim() ?? null,
        decided_at: row.decided_at,
        expires_at: row.expires_at,
        expired: false,
      })
    }
  }

  const orderedGaps = [...gaps].sort((a, b) => {
    if (getSeverityRank(b.severity) !== getSeverityRank(a.severity)) {
      return getSeverityRank(b.severity) - getSeverityRank(a.severity)
    }

    const layerOrder: Record<GapLayer, number> = {
      normativo: 1,
      fmea: 2,
      control: 3,
      caducidad: 4,
    }

    if (layerOrder[a.layer] !== layerOrder[b.layer]) {
      return layerOrder[a.layer] - layerOrder[b.layer]
    }

    return b.created_at.localeCompare(a.created_at)
  })
  const activeGaps = orderedGaps.filter((gap) => !activeDispositionMap.has(gap.key))
  const excludedGaps: ExcludedGapRecord[] = orderedGaps
    .filter((gap) => activeDispositionMap.has(gap.key))
    .map((gap) => ({ ...gap, disposition: activeDispositionMap.get(gap.key)! }))

  const groups = buildGapGroups(activeGaps)

  const systemsAffected = new Set(activeGaps.map((gap) => gap.system_id)).size
  const byLayer: Record<GapLayer, number> = {
    normativo: activeGaps.filter((gap) => gap.layer === 'normativo').length,
    fmea: activeGaps.filter((gap) => gap.layer === 'fmea').length,
    control: activeGaps.filter((gap) => gap.layer === 'control').length,
    caducidad: activeGaps.filter((gap) => gap.layer === 'caducidad').length,
  }

  const exposure = systems
    .map<GapExposureSystem>((system) => {
      const systemGaps = activeGaps.filter((gap) => gap.system_id === system.id)
      const normativeCritical = systemGaps.filter(
        (gap) => gap.layer === 'normativo' && gap.severity === 'critico'
      ).length
      const normativeHigh = systemGaps.filter(
        (gap) => gap.layer === 'normativo' && gap.severity === 'alto'
      ).length
      const fmea9 = systemGaps.filter(
        (gap) => gap.layer === 'fmea' && gap.raw_score === 9
      ).length
      const fmea8 = systemGaps.filter(
        (gap) => gap.layer === 'fmea' && gap.raw_score === 8
      ).length
      const fmea7 = systemGaps.filter(
        (gap) => gap.layer === 'fmea' && gap.raw_score === 7
      ).length
      const controlPending = systemGaps.filter((gap) => gap.layer === 'control').length
      const expired = systemGaps.filter(
        (gap) => gap.layer === 'caducidad' && (gap.days_until_due ?? 999) < 0
      ).length
      const under14 = systemGaps.filter(
        (gap) =>
          gap.layer === 'caducidad' &&
          (gap.days_until_due ?? 999) >= 0 &&
          (gap.days_until_due ?? 999) <= 14
      ).length
      const under30 = systemGaps.filter(
        (gap) =>
          gap.layer === 'caducidad' &&
          (gap.days_until_due ?? 999) > 14 &&
          (gap.days_until_due ?? 999) <= 30
      ).length

      const correctivePressure =
        Math.min(normativeCritical * 15, 45) +
        Math.min(normativeHigh * 8, 24) +
        Math.min(controlPending * 3, 15)
      const activeRiskPressure = Math.min(fmea9 * 15 + fmea8 * 8 + fmea7 * 4, 60)
      const preventivePressure = Math.min(expired * 5 + under14 * 5 + under30 * 2, 15)
      const score = Math.min(correctivePressure + activeRiskPressure + preventivePressure, 100)

      return {
        system_id: system.id,
        system_name: system.name,
        system_code: getSystemCode(system),
        exposure_score: score,
        corrective_pressure: Math.min(correctivePressure, 100),
        preventive_pressure: Math.min(preventivePressure, 100),
        active_risk_pressure: Math.min(activeRiskPressure, 100),
        current_zone: getCurrentZoneForSystem({
          evaluation: latestEvaluationBySystem.get(system.id) ?? null,
          plan: latestPlanBySystem.get(system.id) ?? null,
        }),
        gaps_normativo_count: systemGaps.filter((gap) => gap.layer === 'normativo').length,
        gaps_fmea_count: systemGaps.filter((gap) => gap.layer === 'fmea').length,
        gaps_control_count: systemGaps.filter((gap) => gap.layer === 'control').length,
        gaps_caducidad_count: systemGaps.filter((gap) => gap.layer === 'caducidad').length,
      }
    })
    .filter((row) => row.gaps_normativo_count + row.gaps_fmea_count + row.gaps_control_count + row.gaps_caducidad_count > 0)
    .sort((a, b) => b.exposure_score - a.exposure_score)

  const systemsWithGaps = exposure.map((row) => ({
    system_id: row.system_id,
    system_name: row.system_name,
    system_code: row.system_code,
    count:
      row.gaps_normativo_count +
      row.gaps_fmea_count +
      row.gaps_control_count +
      row.gaps_caducidad_count,
  }))

  return {
    gaps: activeGaps,
    excluded: excludedGaps,
    groups,
    members: members.map((member) => ({
      id: member.user_id,
      full_name: member.full_name?.trim() || 'Usuario',
      role: member.role,
    })),
    grouping: {
      engine: 'application',
      version: GAP_GROUPING_ENGINE_VERSION,
      generated_at: now.toISOString(),
    },
    summary: {
      total: activeGaps.length,
      critico: activeGaps.filter((gap) => gap.severity === 'critico').length,
      alto: activeGaps.filter((gap) => gap.severity === 'alto').length,
      medio: activeGaps.filter((gap) => gap.severity === 'medio').length,
      by_layer: byLayer,
      systems_affected: systemsAffected,
      total_systems: systems.length,
      excluded_count: excludedGaps.length,
    },
    exposure,
    caducities: activeGaps
      .filter((gap) => gap.layer === 'caducidad')
      .sort((a, b) => (a.days_until_due ?? 999) - (b.days_until_due ?? 999)),
    systems_with_gaps: systemsWithGaps,
  }
}
