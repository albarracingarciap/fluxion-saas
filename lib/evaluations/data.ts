import { createFluxionClient } from '@/lib/supabase/fluxion'

type EvaluationSystemRow = {
  id: string
  name: string
  internal_id: string | null
  status: string
  aiact_risk_level: string
  domain: string
}

type EvaluationFailureModeRow = {
  ai_system_id: string
  priority_status: 'pending_review' | 'prioritized' | 'monitoring' | 'dismissed'
  priority_score: number | null
}

type EvaluationRow = {
  id: string
  system_id: string
  state: 'draft' | 'in_review' | 'approved' | 'superseded'
  cached_zone: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv' | null
  version: number
  created_at: string
  updated_at: string
}

type EvaluationItemRow = {
  id: string
  evaluation_id: string
  status: 'pending' | 'evaluated' | 'skipped'
  s_actual: number | null
  requires_second_review: boolean
  second_review_status: 'not_required' | 'pending' | 'approved' | 'rejected'
}

type TreatmentPlanRow = {
  id: string
  system_id: string
  evaluation_id: string
  status: 'draft' | 'in_review' | 'approved' | 'in_progress' | 'closed' | 'superseded'
  approval_level: 'level_1' | 'level_2' | 'level_3'
  zone_at_creation: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv'
  zone_target: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv' | null
  deadline: string
  created_at: string
  updated_at: string
}

type PipelineRow = {
  systemId: string
  systemName: string
  internalId: string | null
  systemStatus: string
  riskLevel: string
  domain: string
  prioritizedCount: number
  monitoringCount: number
  maxPriorityScore: number | null
  fmeaState: string | null
  fmeaVersion: number | null
  fmeaZone: string | null
  fmeaPendingCount: number
  fmeaSkippedCount: number
  secondReviewPendingCount: number
  sActual9Count: number
  planStatus: string | null
  planApprovalLevel: string | null
  planZoneTarget: string | null
  planDeadline: string | null
  planDeadlineOverdue: boolean
  linkedTasksCount: number
  lastActivityAt: string | null
  currentStage: string
  actionHref: string
  actionLabel: string
  needsAttention: boolean
}

function getStageLabel(params: {
  prioritizedCount: number
  fmeaState: string | null
  planStatus: string | null
}) {
  if (params.planStatus === 'draft') return 'Plan en borrador'
  if (params.planStatus === 'in_review') return 'Plan en aprobación'
  if (params.fmeaState === 'draft') return 'FMEA en borrador'
  if (params.fmeaState === 'in_review') return 'FMEA en revisión'
  if (params.prioritizedCount > 0) return 'Pendiente de iniciar'
  return 'Sin cola priorizada'
}

function getAction(params: {
  systemId: string
  evaluationId: string | null
  planStatus: string | null
  fmeaState: string | null
  prioritizedCount: number
}) {
  if (params.evaluationId && ['draft', 'in_review'].includes(params.planStatus ?? '')) {
    return {
      href: `/inventario/${params.systemId}/fmea/${params.evaluationId}/plan`,
      label: 'Abrir plan',
    }
  }

  if (params.evaluationId && ['draft', 'in_review'].includes(params.fmeaState ?? '')) {
    return {
      href: `/inventario/${params.systemId}/fmea/${params.evaluationId}/evaluar`,
      label: 'Continuar FMEA',
    }
  }

  if (params.prioritizedCount > 0) {
    return {
      href: `/inventario/${params.systemId}/fmea`,
      label: 'Iniciar FMEA',
    }
  }

  return {
    href: `/inventario/${params.systemId}`,
    label: 'Abrir sistema',
  }
}

function getNextEvaluationStep(rows: PipelineRow[]) {
  const zoneI = rows.find((row) => row.sActual9Count > 0)
  if (zoneI) {
    return {
      title: 'Escalado activo en Zona I',
      description: `${zoneI.systemName} mantiene al menos un modo con S_actual = 9 y requiere seguimiento prioritario de dirección.`,
      href: zoneI.actionHref,
      cta: 'Revisar escalado',
    }
  }

  const overdue = rows.find((row) => row.planDeadlineOverdue)
  if (overdue) {
    return {
      title: 'Plan de tratamiento vencido',
      description: `${overdue.systemName} tiene un plan con fecha límite superada. Revisa el estado de las acciones y actualiza el plazo si es necesario.`,
      href: overdue.actionHref,
      cta: 'Abrir plan',
    }
  }

  const secondReview = rows.find((row) => row.secondReviewPendingCount > 0)
  if (secondReview) {
    return {
      title: 'Resolver segundas revisiones',
      description: `${secondReview.systemName} tiene ${secondReview.secondReviewPendingCount} ítems pendientes de segunda validación antes de cerrar la evaluación.`,
      href: secondReview.actionHref,
      cta: 'Abrir evaluación',
    }
  }

  const planDraft = rows.find((row) => row.planStatus === 'draft')
  if (planDraft) {
    return {
      title: 'Completar plan de tratamiento',
      description: `${planDraft.systemName} ya tiene un plan en borrador y necesita decisiones de tratamiento antes de enviarlo a aprobación.`,
      href: planDraft.actionHref,
      cta: 'Abrir plan',
    }
  }

  const fmeaDraft = rows.find((row) => row.fmeaState === 'draft')
  if (fmeaDraft) {
    return {
      title: 'Continuar evaluación FMEA',
      description: `${fmeaDraft.systemName} sigue en borrador y todavía no ha resuelto todos los modos priorizados.`,
      href: fmeaDraft.actionHref,
      cta: 'Continuar FMEA',
    }
  }

  const pendingStart = rows.find((row) => row.prioritizedCount > 0 && !row.fmeaState)
  if (pendingStart) {
    return {
      title: 'Iniciar evaluación en sistema priorizado',
      description: `${pendingStart.systemName} ya tiene cola priorizada, pero todavía no ha arrancado FMEA.`,
      href: pendingStart.actionHref,
      cta: 'Iniciar evaluación',
    }
  }

  return {
    title: 'Pipeline estable',
    description: 'No hay bloqueos graves en la cola actual. Puedes usar esta vista para seguimiento transversal y coordinación.',
    href: '/inventario',
    cta: 'Ver inventario',
  }
}

export async function buildEvaluationsDashboardData(organizationId: string) {
  const fluxion = createFluxionClient()
  const today = new Date().toISOString().split('T')[0]!

  const [
    systemsResult,
    failureModesResult,
    evaluationsResult,
    plansResult,
    tasksResult,
  ] = await Promise.all([
    fluxion
      .from('ai_systems')
      .select('id, name, internal_id, status, aiact_risk_level, domain')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    fluxion
      .from('system_failure_modes')
      .select('ai_system_id, priority_status, priority_score')
      .eq('organization_id', organizationId),
    fluxion
      .from('fmea_evaluations')
      .select('id, system_id, state, cached_zone, version, created_at, updated_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('treatment_plans')
      .select('id, system_id, evaluation_id, status, approval_level, zone_at_creation, zone_target, deadline, created_at, updated_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('tasks')
      .select('system_id, status')
      .eq('organization_id', organizationId)
      .eq('source_type', 'fmea_item')
      .not('status', 'in', '("done","cancelled")'),
  ])

  if (systemsResult.error) {
    throw new Error(`No se pudieron cargar los sistemas para evaluaciones: ${systemsResult.error.message}`)
  }

  const systems = (systemsResult.data ?? []) as EvaluationSystemRow[]
  const failureModes = (failureModesResult.data ?? []) as EvaluationFailureModeRow[]
  const evaluations = (evaluationsResult.data ?? []) as EvaluationRow[]
  const plans = (plansResult.data ?? []) as TreatmentPlanRow[]
  const fmeaItemTasks = (tasksResult.data ?? []) as Array<{ system_id: string | null; status: string }>

  const linkedTasksBySystem = new Map<string, number>()
  for (const task of fmeaItemTasks) {
    if (task.system_id) {
      linkedTasksBySystem.set(task.system_id, (linkedTasksBySystem.get(task.system_id) ?? 0) + 1)
    }
  }

  const evaluationIds = evaluations.map((row) => row.id)
  const { data: itemRowsData, error: itemRowsError } =
    evaluationIds.length === 0
      ? { data: [], error: null }
      : await fluxion
          .from('fmea_items')
          .select('id, evaluation_id, status, s_actual, requires_second_review, second_review_status')
          .in('evaluation_id', evaluationIds)

  if (itemRowsError) {
    throw new Error(`No se pudieron cargar los ítems FMEA: ${itemRowsError.message}`)
  }

  const itemRows = (itemRowsData ?? []) as EvaluationItemRow[]

  const latestEvaluationBySystem = new Map<string, EvaluationRow>()
  for (const row of [...evaluations].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (!latestEvaluationBySystem.has(row.system_id)) {
      latestEvaluationBySystem.set(row.system_id, row)
    }
  }

  const latestPlanBySystem = new Map<string, TreatmentPlanRow>()
  for (const row of [...plans].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    if (!latestPlanBySystem.has(row.system_id)) {
      latestPlanBySystem.set(row.system_id, row)
    }
  }

  const itemsByEvaluation = new Map<string, EvaluationItemRow[]>()
  for (const item of itemRows) {
    const bucket = itemsByEvaluation.get(item.evaluation_id) ?? []
    bucket.push(item)
    itemsByEvaluation.set(item.evaluation_id, bucket)
  }

  const failureModesBySystem = new Map<string, EvaluationFailureModeRow[]>()
  for (const row of failureModes) {
    const bucket = failureModesBySystem.get(row.ai_system_id) ?? []
    bucket.push(row)
    failureModesBySystem.set(row.ai_system_id, bucket)
  }

  const pipeline: PipelineRow[] = systems
    .map((system) => {
      const systemModes = failureModesBySystem.get(system.id) ?? []
      const prioritized = systemModes.filter((row) => row.priority_status === 'prioritized')
      const monitoring = systemModes.filter((row) => row.priority_status === 'monitoring')
      const latestEvaluation = latestEvaluationBySystem.get(system.id) ?? null
      const latestPlan = latestPlanBySystem.get(system.id) ?? null
      const latestItems = latestEvaluation ? itemsByEvaluation.get(latestEvaluation.id) ?? [] : []

      const fmeaPendingCount = latestItems.filter((row) => row.status === 'pending').length
      const fmeaSkippedCount = latestItems.filter((row) => row.status === 'skipped').length
      const secondReviewPendingCount = latestItems.filter(
        (row) => row.requires_second_review && row.second_review_status !== 'approved'
      ).length
      const sActual9Count = latestItems.filter((row) => row.s_actual === 9).length

      const currentStage = getStageLabel({
        prioritizedCount: prioritized.length,
        fmeaState: latestEvaluation?.state ?? null,
        planStatus: latestPlan?.status ?? null,
      })

      const action = getAction({
        systemId: system.id,
        evaluationId: latestEvaluation?.id ?? null,
        planStatus: latestPlan?.status ?? null,
        fmeaState: latestEvaluation?.state ?? null,
        prioritizedCount: prioritized.length,
      })

      const planDeadline = latestPlan?.deadline ?? null
      const openPlanStatuses = ['draft', 'in_review', 'approved', 'in_progress']
      const planDeadlineOverdue = Boolean(
        planDeadline &&
        latestPlan &&
        openPlanStatuses.includes(latestPlan.status) &&
        planDeadline < today
      )

      return {
        systemId: system.id,
        systemName: system.name,
        internalId: system.internal_id,
        systemStatus: system.status,
        riskLevel: system.aiact_risk_level,
        domain: system.domain,
        prioritizedCount: prioritized.length,
        monitoringCount: monitoring.length,
        maxPriorityScore: prioritized.length
          ? Math.max(...prioritized.map((row) => row.priority_score ?? 0))
          : null,
        fmeaState: latestEvaluation?.state ?? null,
        fmeaVersion: latestEvaluation?.version ?? null,
        fmeaZone: latestEvaluation?.cached_zone ?? null,
        fmeaPendingCount,
        fmeaSkippedCount,
        secondReviewPendingCount,
        sActual9Count,
        planStatus: latestPlan?.status ?? null,
        planApprovalLevel: latestPlan?.approval_level ?? null,
        planZoneTarget: latestPlan?.zone_target ?? latestPlan?.zone_at_creation ?? null,
        planDeadline,
        planDeadlineOverdue,
        linkedTasksCount: linkedTasksBySystem.get(system.id) ?? 0,
        lastActivityAt: (() => {
          const a = latestEvaluation?.updated_at ?? null
          const b = latestPlan?.updated_at ?? null
          if (a && b) return a > b ? a : b
          return a ?? b
        })(),
        currentStage,
        actionHref: action.href,
        actionLabel: action.label,
        needsAttention:
          sActual9Count > 0 ||
          secondReviewPendingCount > 0 ||
          planDeadlineOverdue ||
          latestPlan?.status === 'draft' ||
          latestEvaluation?.state === 'draft',
      }
    })
    .sort((a, b) => {
      // 1. Zona I primero
      if (Number(b.sActual9Count > 0) !== Number(a.sActual9Count > 0)) {
        return Number(b.sActual9Count > 0) - Number(a.sActual9Count > 0)
      }
      // 2. Planes vencidos
      if (Number(b.planDeadlineOverdue) !== Number(a.planDeadlineOverdue)) {
        return Number(b.planDeadlineOverdue) - Number(a.planDeadlineOverdue)
      }
      // 3. Segundas revisiones pendientes
      if (b.secondReviewPendingCount !== a.secondReviewPendingCount) {
        return b.secondReviewPendingCount - a.secondReviewPendingCount
      }
      if (Number(b.planStatus === 'draft') !== Number(a.planStatus === 'draft')) {
        return Number(b.planStatus === 'draft') - Number(a.planStatus === 'draft')
      }
      if (Number(b.fmeaState === 'draft') !== Number(a.fmeaState === 'draft')) {
        return Number(b.fmeaState === 'draft') - Number(a.fmeaState === 'draft')
      }
      if (b.prioritizedCount !== a.prioritizedCount) {
        return b.prioritizedCount - a.prioritizedCount
      }
      return (b.maxPriorityScore ?? 0) - (a.maxPriorityScore ?? 0)
    })

  const activeEvaluations = evaluations.filter((row) => ['draft', 'in_review'].includes(row.state))
  const activePlans = plans.filter((row) => ['draft', 'in_review'].includes(row.status))

  const openPlanStatusesForKpi = ['draft', 'in_review', 'approved', 'in_progress']
  const kpis = {
    fmeaDraft: evaluations.filter((row) => row.state === 'draft').length,
    fmeaInReview: evaluations.filter((row) => row.state === 'in_review').length,
    secondReviewPending: itemRows.filter(
      (row) => row.requires_second_review && row.second_review_status !== 'approved'
    ).length,
    plansDraft: plans.filter((row) => row.status === 'draft').length,
    plansInReview: plans.filter((row) => row.status === 'in_review').length,
    plansOverdue: plans.filter(
      (row) => openPlanStatusesForKpi.includes(row.status) && row.deadline && row.deadline < today
    ).length,
    zoneI: pipeline.filter((row) => row.sActual9Count > 0 || row.planZoneTarget === 'zona_i').length,
    pendingStart: pipeline.filter((row) => row.prioritizedCount > 0 && row.fmeaState === null).length,
    activeWorkflows: new Set([...activeEvaluations.map((row) => row.system_id), ...activePlans.map((row) => row.system_id)]).size,
    linkedTasksActive: fmeaItemTasks.length,
  }

  return {
    systemsCount: systems.length,
    hasAnyEvaluationData:
      evaluations.length > 0 || plans.length > 0 || failureModes.some((row) => row.priority_status === 'prioritized'),
    kpis,
    pipeline,
    immediateAttention: pipeline.filter((row) => row.needsAttention).slice(0, 5),
    nextStep: getNextEvaluationStep(pipeline),
  }
}
