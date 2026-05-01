import type { SupabaseClient } from '@supabase/supabase-js'

import type { FmeaZone } from '@/lib/fmea/domain'
import type {
  TreatmentApprovalLevel,
  TreatmentPlanStatus,
} from '@/lib/fmea/treatment-plan'

export type DeadlineBucket = 'overdue' | 'next_30d' | 'next_90d' | 'no_deadline'

const ACTIVE_STATUSES: TreatmentPlanStatus[] = ['draft', 'in_review', 'approved', 'in_progress']
const TERMINAL_STATUSES: TreatmentPlanStatus[] = ['closed', 'superseded']

export type TreatmentPlanListRow = {
  // Plan
  id: string
  code: string
  status: TreatmentPlanStatus
  approval_level: TreatmentApprovalLevel
  zone_at_creation: FmeaZone
  zone_target: FmeaZone | null
  ai_act_floor: FmeaZone
  s_max_at_creation: number
  modes_count_zone_i: number
  modes_count_zone_ii: number
  actions_total: number
  actions_completed: number
  deadline: string
  review_cadence: string | null
  approver_id: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // Sistema
  system_id: string
  system_name: string | null
  system_internal_id: string | null
  system_aiact_risk_level: string | null
  // Evaluación
  evaluation_id: string
  evaluation_version: number | null
  // Owner dominante (calculado desde treatment_actions)
  dominant_owner_id: string | null
  // Derivados
  progress_pct: number
  is_overdue: boolean
  days_to_deadline: number | null
}

export type TreatmentPlanFilters = {
  statuses?: TreatmentPlanStatus[]
  zones?: FmeaZone[]
  approvalLevels?: TreatmentApprovalLevel[]
  systemId?: string
  approverId?: string
  deadlineBucket?: DeadlineBucket
  search?: string
  includeSuperseded?: boolean
}

export type TreatmentPlansSummary = {
  total: number
  active: number
  inReview: number
  overdue: number
  closed: number
  avgProgressPct: number
  byStatus: Record<TreatmentPlanStatus, number>
  byZone: Record<FmeaZone, number>
}

function diffDays(deadline: string | null, todayISO: string): number | null {
  if (!deadline) return null
  const a = new Date(`${deadline}T00:00:00Z`).getTime()
  const b = new Date(`${todayISO}T00:00:00Z`).getTime()
  return Math.round((a - b) / 86_400_000)
}

function computeProgressPct(total: number, completed: number): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)))
}

export async function fetchTreatmentPlans(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string,
  filters: TreatmentPlanFilters = {}
): Promise<TreatmentPlanListRow[]> {
  let query = fluxion
    .from('treatment_plans')
    .select(`
      id, code, status, approval_level,
      zone_at_creation, zone_target, ai_act_floor,
      s_max_at_creation, modes_count_zone_i, modes_count_zone_ii,
      actions_total, actions_completed,
      deadline, review_cadence,
      approver_id, approved_at,
      created_at, updated_at,
      system_id, evaluation_id,
      ai_systems(id, name, internal_id, aiact_risk_level),
      fmea_evaluations(id, version)
    `)
    .eq('organization_id', organizationId)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  } else if (!filters.includeSuperseded) {
    query = query.neq('status', 'superseded')
  }

  if (filters.zones && filters.zones.length > 0) {
    query = query.in('zone_at_creation', filters.zones)
  }
  if (filters.approvalLevels && filters.approvalLevels.length > 0) {
    query = query.in('approval_level', filters.approvalLevels)
  }
  if (filters.systemId)   query = query.eq('system_id', filters.systemId)
  if (filters.approverId) query = query.eq('approver_id', filters.approverId)
  if (filters.search)     query = query.ilike('code', `%${filters.search}%`)

  const { data } = await query

  const planIds = ((data ?? []) as Array<{ id: string }>).map((p) => p.id)
  const dominantOwners = await fetchDominantOwners(fluxion, organizationId, planIds)

  const todayISO = new Date().toISOString().split('T')[0]!

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const system = row.ai_systems as
      | { id?: string; name?: string; internal_id?: string | null; aiact_risk_level?: string | null }
      | null
    const evaluation = row.fmea_evaluations as { id?: string; version?: number } | null

    const status = row.status as TreatmentPlanStatus
    const deadline = row.deadline as string
    const actionsTotal = (row.actions_total as number) ?? 0
    const actionsCompleted = (row.actions_completed as number) ?? 0
    const days = diffDays(deadline, todayISO)
    const isTerminal = TERMINAL_STATUSES.includes(status)

    return {
      id: row.id as string,
      code: row.code as string,
      status,
      approval_level: row.approval_level as TreatmentApprovalLevel,
      zone_at_creation: row.zone_at_creation as FmeaZone,
      zone_target: (row.zone_target as FmeaZone | null) ?? null,
      ai_act_floor: row.ai_act_floor as FmeaZone,
      s_max_at_creation: (row.s_max_at_creation as number) ?? 0,
      modes_count_zone_i: (row.modes_count_zone_i as number) ?? 0,
      modes_count_zone_ii: (row.modes_count_zone_ii as number) ?? 0,
      actions_total: actionsTotal,
      actions_completed: actionsCompleted,
      deadline,
      review_cadence: (row.review_cadence as string | null) ?? null,
      approver_id: (row.approver_id as string | null) ?? null,
      approved_at: (row.approved_at as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      system_id: row.system_id as string,
      system_name: system?.name ?? null,
      system_internal_id: system?.internal_id ?? null,
      system_aiact_risk_level: system?.aiact_risk_level ?? null,
      evaluation_id: row.evaluation_id as string,
      evaluation_version: evaluation?.version ?? null,
      dominant_owner_id: dominantOwners.get(row.id as string) ?? null,
      progress_pct: computeProgressPct(actionsTotal, actionsCompleted),
      is_overdue: !isTerminal && deadline !== null && days !== null && days < 0,
      days_to_deadline: days,
    } satisfies TreatmentPlanListRow
  })

  let filtered = rows

  if (filters.search) {
    const needle = filters.search.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.code.toLowerCase().includes(needle) ||
        (r.system_name?.toLowerCase().includes(needle) ?? false)
    )
  }

  if (filters.deadlineBucket) {
    filtered = filtered.filter((r) => {
      const d = r.days_to_deadline
      switch (filters.deadlineBucket) {
        case 'overdue':     return r.is_overdue
        case 'next_30d':    return d !== null && d >= 0 && d <= 30
        case 'next_90d':    return d !== null && d >= 0 && d <= 90
        case 'no_deadline': return d === null
        default:            return true
      }
    })
  }

  return filtered
}

export async function computeTreatmentPlansSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string
): Promise<TreatmentPlansSummary> {
  const { data } = await fluxion
    .from('treatment_plans')
    .select('status, zone_at_creation, deadline, actions_total, actions_completed')
    .eq('organization_id', organizationId)

  const rows = (data ?? []) as Array<{
    status: TreatmentPlanStatus
    zone_at_creation: FmeaZone
    deadline: string | null
    actions_total: number | null
    actions_completed: number | null
  }>

  const todayISO = new Date().toISOString().split('T')[0]!

  const byStatus: Record<TreatmentPlanStatus, number> = {
    draft: 0, in_review: 0, approved: 0, in_progress: 0, closed: 0, superseded: 0,
  }
  const byZone: Record<FmeaZone, number> = {
    zona_i: 0, zona_ii: 0, zona_iii: 0, zona_iv: 0,
  }

  let total = 0
  let active = 0
  let inReview = 0
  let overdue = 0
  let closed = 0
  let progressSum = 0
  let progressCount = 0

  for (const row of rows) {
    if (row.status !== 'superseded') total++
    byStatus[row.status]++
    byZone[row.zone_at_creation]++

    if (ACTIVE_STATUSES.includes(row.status)) {
      active++
      progressSum += computeProgressPct(row.actions_total ?? 0, row.actions_completed ?? 0)
      progressCount++
      if (row.deadline && row.deadline < todayISO) overdue++
    }
    if (row.status === 'in_review') inReview++
    if (row.status === 'closed') closed++
  }

  return {
    total,
    active,
    inReview,
    overdue,
    closed,
    avgProgressPct: progressCount > 0 ? Math.round(progressSum / progressCount) : 0,
    byStatus,
    byZone,
  }
}

async function fetchDominantOwners(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string,
  planIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (planIds.length === 0) return result

  const { data } = await fluxion
    .from('treatment_actions')
    .select('plan_id, owner_id')
    .eq('organization_id', organizationId)
    .in('plan_id', planIds)
    .not('owner_id', 'is', null)

  const rows = (data ?? []) as Array<{ plan_id: string; owner_id: string }>
  const counts = new Map<string, Map<string, number>>()

  for (const row of rows) {
    let perPlan = counts.get(row.plan_id)
    if (!perPlan) {
      perPlan = new Map()
      counts.set(row.plan_id, perPlan)
    }
    perPlan.set(row.owner_id, (perPlan.get(row.owner_id) ?? 0) + 1)
  }

  counts.forEach((perPlan, planId) => {
    let bestOwner: string | null = null
    let bestCount = -1
    perPlan.forEach((count, ownerId) => {
      if (count > bestCount || (count === bestCount && bestOwner !== null && ownerId < bestOwner)) {
        bestOwner = ownerId
        bestCount = count
      }
    })
    if (bestOwner) result.set(planId, bestOwner)
  })

  return result
}
