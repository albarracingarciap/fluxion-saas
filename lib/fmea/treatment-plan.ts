import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';

import { calculateFmeaZone, getAiActZoneFloor, type FmeaZone } from './domain';

export type TreatmentPlanStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'in_progress'
  | 'closed'
  | 'superseded';

export type TreatmentOption = 'mitigar' | 'aceptar' | 'transferir' | 'evitar' | 'diferir';

export type SlaStat = 'overdue' | 'due_soon' | 'at_risk' | 'ok';

const SLA_TERMINAL_STATUSES = new Set(['completed', 'accepted', 'cancelled']);

export function calculateSlaStatus(dueDate: string | null, status: string): SlaStat | null {
  if (!dueDate || SLA_TERMINAL_STATUSES.has(status)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const daysRemaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 7) return 'due_soon';
  if (daysRemaining <= 30) return 'at_risk';
  return 'ok';
}

export type TreatmentActionStatus =
  | 'pending'
  | 'in_progress'
  | 'evidence_pending'
  | 'completed'
  | 'accepted'
  | 'cancelled';

export type TreatmentApprovalLevel = 'level_1' | 'level_2' | 'level_3';

export type TreatmentPlanRecord = {
  id: string;
  organization_id: string;
  system_id: string;
  evaluation_id: string;
  code: string;
  status: TreatmentPlanStatus;
  zone_at_creation: FmeaZone;
  zone_target: FmeaZone | null;
  ai_act_floor: FmeaZone;
  s_max_at_creation: number;
  modes_count_total: number;
  modes_count_zone_i: number;
  modes_count_zone_ii: number;
  actions_total: number;
  actions_completed: number;
  pivot_node_ids: string[];
  residual_risk_notes: string | null;
  accepted_risk_count: number;
  approval_level: TreatmentApprovalLevel;
  approver_id: string | null;
  approved_at: string | null;
  approval_minutes_ref: string | null;
  approval_committee_notes: string | null;
  deadline: string;
  review_cadence: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TreatmentPlanActionRecord = {
  id: string;
  organization_id: string;
  plan_id: string;
  fmea_item_id: string;
  option: TreatmentOption | null;
  status: TreatmentActionStatus;
  s_actual_at_creation: number;
  s_residual_target: number | null;
  s_residual_achieved: number | null;
  control_id: string | null;
  justification: string | null;
  evidence_description: string | null;
  owner_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  evidence_id: string | null;
  acceptance_approved_by: string | null;
  acceptance_approved_at: string | null;
  review_due_date: string | null;
  last_reviewed_at: string | null;
  review_count: number;
  task_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewStatus = 'not_required' | 'upcoming' | 'due' | 'overdue_review';

export type ReviewDecision =
  | 'reaffirmed'
  | 'changed_to_mitigate'
  | 'changed_to_transfer'
  | 'changed_to_avoid'
  | 'escalated';

export type ActionReview = {
  id: string;
  action_id: string;
  plan_id: string;
  organization_id: string;
  reviewed_at: string;
  reviewed_by: string | null;
  reviewer_name: string | null;
  decision: ReviewDecision;
  new_review_due_date: string | null;
  justification: string;
};

const REVIEW_REQUIRED_OPTIONS = new Set<string>(['aceptar', 'diferir']);
const REVIEW_TERMINAL_STATUSES = new Set<string>(['cancelled', 'completed']);

export function getReviewStatus(action: {
  option: TreatmentOption | null;
  status: string;
  review_due_date: string | null;
}): ReviewStatus {
  if (
    !action.review_due_date ||
    !REVIEW_REQUIRED_OPTIONS.has(action.option ?? '') ||
    REVIEW_TERMINAL_STATUSES.has(action.status)
  ) return 'not_required';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${action.review_due_date}T00:00:00`);
  const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 'overdue_review';
  if (daysUntil === 0) return 'due';
  if (daysUntil <= 30) return 'upcoming';
  return 'not_required';
}

export type TreatmentPlanSystem = {
  id: string;
  name: string;
  internal_id: string | null;
  domain: string;
  status: string;
  aiact_risk_level: string;
};

export type TreatmentPlanEvaluation = {
  id: string;
  organization_id: string;
  system_id: string;
  state: 'draft' | 'in_review' | 'approved' | 'superseded';
  version: number;
  cached_zone: FmeaZone | null;
  created_at: string;
  updated_at: string;
};

export type TreatmentPlanMember = {
  id: string;
  full_name: string;
  role: string;
};

export type TreatmentPlanControlSuggestion = {
  control_template_id: string;
  control_code: string;
  control_name: string;
  control_description: string | null;
  control_area: string | null;
  existing_control_id: string | null;
  existing_control_status: string | null;
  existing_control_owner_id: string | null;
  existing_control_notes: string | null;
};

export type TreatmentPlanActionView = TreatmentPlanActionRecord & {
  failure_mode_id: string;
  failure_mode_code: string;
  failure_mode_name: string;
  failure_mode_description: string;
  priority_score: number | null;
  dimension_id: string;
  dimension_name: string;
  dimension_order: number;
  bloque: string;
  subcategoria: string;
  tipo: string;
  s_default_frozen: number;
  item_status: 'pending' | 'evaluated' | 'skipped';
  requires_second_review: boolean;
  control_template_id: string | null;
  control_refs: TreatmentPlanControlSuggestion[];
  task_status: string | null;
  evidence_title: string | null;
  evidence_storage_path: string | null;
  evidence_external_url: string | null;
  evidence_url: string | null;
  evidence_verification_status: 'pending' | 'validated' | 'rejected' | null;
  sla_status: SlaStat | null;
  review_status: ReviewStatus;
};

export type SnapshotTrigger =
  | 'submitted_for_review'
  | 'approved'
  | 'rejected'
  | 'started'
  | 'closed'
  | 'superseded';

export type TreatmentActionEventType =
  | 'option_selected'
  | 'owner_changed'
  | 'duedate_changed'
  | 'residual_target_changed'
  | 'residual_achieved_recorded'
  | 'slippage_accepted'
  | 'task_status_changed'
  | 'closed'
  | 'periodic_review';

export type PlanSnapshot = {
  id: string;
  trigger: SnapshotTrigger;
  actor_name: string | null;
  actor_user_id: string | null;
  captured_at: string;
  plan_state: Record<string, unknown>;
  actions_state: Record<string, unknown>[];
  metadata: Record<string, unknown>;
};

export type PlanActionEvent = {
  id: string;
  action_id: string;
  event_type: TreatmentActionEventType;
  actor_name: string | null;
  actor_user_id: string | null;
  occurred_at: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  justification: string | null;
};

export type TreatmentPlanData = {
  system: TreatmentPlanSystem;
  evaluation: TreatmentPlanEvaluation;
  plan: TreatmentPlanRecord;
  actions: TreatmentPlanActionView[];
  members: TreatmentPlanMember[];
  approver_name: string | null;
  read_only: boolean;
  tasks_total: number;
  tasks_done: number;
  is_approver: boolean;
  overdue_count: number;
  due_soon_count: number;
  plan_snapshots: PlanSnapshot[];
  plan_action_events: PlanActionEvent[];
  action_reviews: ActionReview[];
  pending_reviews_count: number;
  overdue_reviews_count: number;
};

export function getApprovalLevelForZone(zone: FmeaZone): TreatmentApprovalLevel {
  if (zone === 'zona_i') return 'level_3';
  if (zone === 'zona_ii') return 'level_2';
  return 'level_1';
}

export function getReviewCadenceForZone(zone: FmeaZone) {
  switch (zone) {
    case 'zona_i':
      return 'monthly';
    case 'zona_ii':
      return 'quarterly';
    case 'zona_iii':
      return 'biannual';
    case 'zona_iv':
    default:
      return 'annual';
  }
}

export function getDefaultDeadlineForZone(zone: FmeaZone, from = new Date()) {
  const date = new Date(from);

  switch (zone) {
    case 'zona_i':
      date.setDate(date.getDate() + 30);
      break;
    case 'zona_ii':
      date.setDate(date.getDate() + 90);
      break;
    case 'zona_iii':
      date.setDate(date.getDate() + 180);
      break;
    case 'zona_iv':
    default:
      date.setDate(date.getDate() + 365);
      break;
  }

  return date.toISOString().slice(0, 10);
}

export function getApproverRolePriority(level: TreatmentApprovalLevel) {
  switch (level) {
    case 'level_3':
      return ['admin', 'dpo', 'technical'] as const;
    case 'level_2':
      return ['admin', 'dpo', 'technical', 'editor'] as const;
    case 'level_1':
    default:
      return ['dpo', 'technical', 'admin', 'editor'] as const;
  }
}

export async function generateTreatmentPlanCode(params: {
  organizationId: string;
  createdAt?: Date;
}) {
  const fluxion = createFluxionClient();
  const createdAt = params.createdAt ?? new Date();
  const year = createdAt.getFullYear();
  const start = new Date(Date.UTC(year, 0, 1)).toISOString();
  const end = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

  const { count } = await fluxion
    .from('treatment_plans')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', params.organizationId)
    .gte('created_at', start)
    .lt('created_at', end);

  const serial = String((count ?? 0) + 1).padStart(3, '0');
  return `PTR-${year}-${serial}`;
}

export function getEvidenceDescriptionForOption(option: TreatmentOption) {
  switch (option) {
    case 'mitigar':
      return 'Evidencia de implementación y validación del control de mitigación.';
    case 'aceptar':
      return 'Documento formal de aceptación del riesgo y trazabilidad de la aprobación.';
    case 'transferir':
      return 'Contrato, SLA, póliza o acuerdo que demuestre la transferencia del riesgo.';
    case 'evitar':
      return 'Plan documentado de rediseño, retirada o eliminación del riesgo.';
    case 'diferir':
      return 'Calendario justificado, hitos comprometidos y criterio de reanudación.';
    default:
      return null;
  }
}

export function calculateProjectedZoneForTreatmentActions(params: {
  actions: Array<{
    id: string;
    dimension_id: string;
    s_default_frozen: number;
    s_actual_at_creation: number;
    option: TreatmentOption | null;
    s_residual_target: number | null;
  }>;
  aiActLevel: string | null | undefined;
}) {
  return calculateFmeaZone(
    params.actions.map((action) => ({
      id: action.id,
      dimension_id: action.dimension_id,
      s_default_frozen: action.s_default_frozen,
      o_value: null,
      d_real_value: null,
      s_actual:
        action.option === 'mitigar' && typeof action.s_residual_target === 'number'
          ? action.s_residual_target
          : action.s_actual_at_creation,
      status: 'evaluated' as const,
    })),
    params.aiActLevel
  );
}

export async function buildTreatmentPlanData(params: {
  organizationId: string;
  aiSystemId: string;
  evaluationId: string;
  currentUserId?: string;
}) {
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name, internal_id, domain, status, aiact_risk_level')
    .eq('organization_id', params.organizationId)
    .eq('id', params.aiSystemId)
    .maybeSingle<TreatmentPlanSystem>();

  const { data: evaluation } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state, version, cached_zone, created_at, updated_at')
    .eq('organization_id', params.organizationId)
    .eq('system_id', params.aiSystemId)
    .eq('id', params.evaluationId)
    .maybeSingle<TreatmentPlanEvaluation>();

  const { data: plan } = await fluxion
    .from('treatment_plans')
    .select(`
      id,
      organization_id,
      system_id,
      evaluation_id,
      code,
      status,
      zone_at_creation,
      zone_target,
      ai_act_floor,
      s_max_at_creation,
      modes_count_total,
      modes_count_zone_i,
      modes_count_zone_ii,
      actions_total,
      actions_completed,
      pivot_node_ids,
      residual_risk_notes,
      accepted_risk_count,
      approval_level,
      approver_id,
      approved_at,
      approval_minutes_ref,
      approval_committee_notes,
      deadline,
      review_cadence,
      created_by,
      created_at,
      updated_at
    `)
    .eq('organization_id', params.organizationId)
    .eq('system_id', params.aiSystemId)
    .eq('evaluation_id', params.evaluationId)
    .maybeSingle<TreatmentPlanRecord>();

  let currentPlan = plan;
  let actions: TreatmentPlanActionRecord[] = [];
  const taskStatusByTaskId = new Map<string, string>();

  if (!system || !evaluation) return null;

  // Si no hay plan en la DB, creamos uno virtual para previsualización
  if (!currentPlan) {
    const { data: items } = await fluxion
      .from('fmea_items')
      .select('id, s_actual')
      .eq('evaluation_id', params.evaluationId);
    
    const evaluatedItems = (items ?? []).filter(i => i.s_actual !== null);
    const sMax = evaluatedItems.length > 0 ? Math.max(...evaluatedItems.map(i => i.s_actual ?? 0)) : 0;
    
    currentPlan = {
      id: 'virtual-draft',
      organization_id: params.organizationId,
      system_id: params.aiSystemId,
      evaluation_id: params.evaluationId,
      code: 'PREVIEW-DRAFT',
      status: 'draft',
      zone_at_creation: evaluation.cached_zone ?? 'zona_iv',
      zone_target: evaluation.cached_zone ?? 'zona_iv',
      ai_act_floor: getAiActFloorForSystem(system.aiact_risk_level),
      s_max_at_creation: sMax,
      modes_count_total: items?.length ?? 0,
      modes_count_zone_i: evaluatedItems.filter(i => i.s_actual === 9).length,
      modes_count_zone_ii: evaluatedItems.filter(i => i.s_actual === 8).length,
      actions_total: evaluatedItems.filter(i => (i.s_actual ?? 0) >= 7).length,
      actions_completed: 0,
      pivot_node_ids: [],
      residual_risk_notes: null,
      accepted_risk_count: 0,
      approval_level: getApprovalLevelForZone(evaluation.cached_zone ?? 'zona_iv'),
      approver_id: null,
      approved_at: null,
      approval_minutes_ref: null,
      approval_committee_notes: null,
      deadline: getDefaultDeadlineForZone(evaluation.cached_zone ?? 'zona_iv'),
      review_cadence: getReviewCadenceForZone(evaluation.cached_zone ?? 'zona_iv'),
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Generar acciones virtuales para ítems críticos ya evaluados
    const itemsForActions = evaluatedItems.filter(i => (i.s_actual ?? 0) >= 7);
    actions = itemsForActions.map(item => ({
      id: `virtual-action-${item.id}`,
      organization_id: params.organizationId,
      plan_id: 'virtual-draft',
      fmea_item_id: item.id,
      option: null,
      status: 'pending',
      s_actual_at_creation: item.s_actual ?? 7,
      s_residual_target: null,
      s_residual_achieved: null,
      control_id: null,
      justification: null,
      evidence_description: null,
      owner_id: null,
      due_date: null,
      completed_at: null,
      evidence_id: null,
      acceptance_approved_by: null,
      acceptance_approved_at: null,
      review_due_date: null,
      last_reviewed_at: null,
      review_count: 0,
      task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  } else {
    // Si hay plan, cargar acciones reales de la DB
    const { data: actionRows } = await fluxion
      .from('treatment_actions')
      .select(`
        id,
        organization_id,
        plan_id,
        fmea_item_id,
        option,
        status,
        s_actual_at_creation,
        s_residual_target,
        s_residual_achieved,
        control_id,
        justification,
        evidence_description,
        owner_id,
        due_date,
        completed_at,
        evidence_id,
        acceptance_approved_by,
        acceptance_approved_at,
        review_due_date,
        last_reviewed_at,
        review_count,
        task_id,
        created_at,
        updated_at
      `)
      .eq('plan_id', currentPlan.id)
      .order('s_actual_at_creation', { ascending: false })
      .order('created_at', { ascending: true });

    const rawActions = (actionRows ?? []) as Array<Record<string, unknown>>;
    actions = rawActions.map((row) => ({
      ...row,
      task_id: (row.task_id as string | null) ?? null,
    })) as unknown as TreatmentPlanActionRecord[];

    // Cargar task_status para las acciones con tarea vinculada
    const taskIds = rawActions.map((r) => r.task_id as string).filter(Boolean);
    if (taskIds.length > 0) {
      const { data: taskRows } = await fluxion
        .from('tasks')
        .select('id, status')
        .in('id', taskIds);
      for (const t of taskRows ?? []) {
        const row = t as { id: string; status: string };
        taskStatusByTaskId.set(row.id, row.status);
      }
    }
  }

  const fmeaItemIds = actions.map((row) => row.fmea_item_id);

  const { data: fmeaItems } =
    fmeaItemIds.length === 0
      ? { data: [] }
      : await fluxion
          .from('fmea_items')
          .select('id, failure_mode_id, s_default_frozen, status, requires_second_review')
          .in('id', fmeaItemIds);

  const fmeaItemMap = new Map((fmeaItems ?? []).map((item) => [item.id, item]));
  const failureModeIds = Array.from(
    new Set(
      (fmeaItems ?? [])
        .map((item) => item.failure_mode_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const { data: systemFailureModes } =
    failureModeIds.length === 0
      ? { data: [] }
      : await fluxion
          .from('system_failure_modes')
          .select('failure_mode_id, priority_score')
          .eq('organization_id', params.organizationId)
          .eq('system_id', params.aiSystemId)
          .in('failure_mode_id', failureModeIds);

  const priorityByFailureMode = new Map(
    (systemFailureModes ?? []).map((row) => [row.failure_mode_id, row.priority_score ?? null])
  );

  const { data: failureModes } =
    failureModeIds.length === 0
      ? { data: [] }
      : await compliance
          .from('failure_modes')
          .select(`
            id,
            code,
            name,
            description,
            dimension_id,
            bloque,
            subcategoria,
            tipo,
            risk_dimensions(name, display_order)
          `)
          .in('id', failureModeIds);

  const failureModeMap = new Map(
    (failureModes ?? []).map((mode) => [
      mode.id,
      {
        id: mode.id,
        code: mode.code,
        name: mode.name,
        description: mode.description,
        dimension_id: mode.dimension_id,
        dimension_name: Array.isArray(mode.risk_dimensions)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (mode.risk_dimensions as any)[0]?.name ?? mode.dimension_id
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (mode.risk_dimensions as any)?.name ?? mode.dimension_id,
        dimension_order: Array.isArray(mode.risk_dimensions)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (mode.risk_dimensions as any)[0]?.display_order ?? 99
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : (mode.risk_dimensions as any)?.display_order ?? 99,
        bloque: mode.bloque,
        subcategoria: mode.subcategoria,
        tipo: mode.tipo,
      },
    ])
  );

  const { data: controlRefs } =
    failureModeIds.length === 0
      ? { data: [] }
      : await compliance
          .from('failure_mode_control_refs')
          .select(`
            failure_mode_id,
            control_template_id,
            control_templates(id, code, name, description, area)
          `)
          .in('failure_mode_id', failureModeIds);

  const controlTemplateIds = Array.from(
    new Set(
      (controlRefs ?? [])
        .map((row) => row.control_template_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const { data: controls } =
    controlTemplateIds.length === 0
      ? { data: [] }
      : await fluxion
          .from('controls')
          .select('id, template_id, status, owner_id, notes')
          .eq('organization_id', params.organizationId)
          .eq('system_id', params.aiSystemId)
          .in('template_id', controlTemplateIds);

  const controlsByTemplate = new Map(
    (controls ?? []).map((control) => [control.template_id, control])
  );
  const controlsById = new Map((controls ?? []).map((control) => [control.id, control]));

  const refsByFailureMode = new Map<string, TreatmentPlanControlSuggestion[]>();

  for (const ref of controlRefs ?? []) {
    const template = Array.isArray(ref.control_templates) ? ref.control_templates[0] : ref.control_templates;
    if (!template) continue;

    const current = refsByFailureMode.get(ref.failure_mode_id) ?? [];
    const existing = controlsByTemplate.get(template.id);
    current.push({
      control_template_id: template.id,
      control_code: template.code,
      control_name: template.name,
      control_description: template.description,
      control_area: template.area,
      existing_control_id: existing?.id ?? null,
      existing_control_status: existing?.status ?? null,
      existing_control_owner_id: existing?.owner_id ?? null,
      existing_control_notes: existing?.notes ?? null,
    });
    refsByFailureMode.set(ref.failure_mode_id, current);
  }

  const { data: members } = await fluxion
    .from('profiles')
    .select('user_id, role')
    .eq('organization_id', params.organizationId)
    .order('created_at', { ascending: true });

  const memberIds = (members ?? [])
    .map((member) => member.user_id)
    .filter((value): value is string => typeof value === 'string' && value.length > 0);

  const { data: profiles } =
    memberIds.length === 0
      ? { data: [] }
      : await fluxion
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', memberIds);

  const memberNames = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Usuario',
    ])
  );

  const memberOptions: TreatmentPlanMember[] = (members ?? []).map((member) => ({
    id: member.user_id,
    full_name: memberNames.get(member.user_id) ?? 'Usuario',
    role: member.role,
  }));

  // Evidence data for actions with evidence_id
  const evidenceIds = Array.from(new Set(
    actions.filter((a) => a.evidence_id).map((a) => a.evidence_id as string)
  ));
  const evidenceDataMap = new Map<string, {
    title: string;
    storage_path: string | null;
    external_url: string | null;
    url: string | null;
    verification_status: 'pending' | 'validated' | 'rejected' | null;
  }>();
  if (evidenceIds.length > 0) {
    const { data: evRows } = await fluxion
      .from('evidences')
      .select('id, title, storage_path, external_url, url, verification_status')
      .in('id', evidenceIds);
    for (const ev of (evRows ?? []) as Array<Record<string, unknown>>) {
      evidenceDataMap.set(ev.id as string, {
        title: ev.title as string,
        storage_path: (ev.storage_path as string | null) ?? null,
        external_url: (ev.external_url as string | null) ?? null,
        url: (ev.url as string | null) ?? null,
        verification_status: (ev.verification_status as 'pending' | 'validated' | 'rejected' | null) ?? null,
      });
    }
  }

  const actionViews: TreatmentPlanActionView[] = actions
    .map((action) => {
      const item = fmeaItemMap.get(action.fmea_item_id);
      if (!item) return null;

      const failureMode = failureModeMap.get(item.failure_mode_id);
      if (!failureMode) return null;

      const selectedControl =
        action.control_id && controlsById.has(action.control_id) ? controlsById.get(action.control_id) : null;
      const controlTemplateId =
        selectedControl?.template_id ??
        refsByFailureMode
          .get(item.failure_mode_id)
          ?.find((control) => control.existing_control_id === action.control_id)?.control_template_id ??
        null;

      return {
        ...action,
        failure_mode_id: item.failure_mode_id,
        failure_mode_code: failureMode.code,
        failure_mode_name: failureMode.name,
        failure_mode_description: failureMode.description,
        priority_score: priorityByFailureMode.get(item.failure_mode_id) ?? null,
        dimension_id: failureMode.dimension_id,
        dimension_name: failureMode.dimension_name,
        dimension_order: failureMode.dimension_order,
        bloque: failureMode.bloque,
        subcategoria: failureMode.subcategoria,
        tipo: failureMode.tipo,
        s_default_frozen: item.s_default_frozen,
        item_status: item.status,
        requires_second_review: item.requires_second_review,
        control_template_id: controlTemplateId,
        control_refs: refsByFailureMode.get(item.failure_mode_id) ?? [],
        task_status: action.task_id ? (taskStatusByTaskId.get(action.task_id) ?? null) : null,
        evidence_title: action.evidence_id ? (evidenceDataMap.get(action.evidence_id)?.title ?? null) : null,
        evidence_storage_path: action.evidence_id ? (evidenceDataMap.get(action.evidence_id)?.storage_path ?? null) : null,
        evidence_external_url: action.evidence_id ? (evidenceDataMap.get(action.evidence_id)?.external_url ?? null) : null,
        evidence_url: action.evidence_id ? (evidenceDataMap.get(action.evidence_id)?.url ?? null) : null,
        evidence_verification_status: action.evidence_id ? (evidenceDataMap.get(action.evidence_id)?.verification_status ?? null) : null,
        sla_status: calculateSlaStatus(action.due_date, action.status),
        review_status: getReviewStatus(action),
      };
    })
    .filter((action): action is TreatmentPlanActionView => action !== null)
    .sort((left, right) => {
      if (left.s_actual_at_creation !== right.s_actual_at_creation) {
        return right.s_actual_at_creation - left.s_actual_at_creation;
      }
      if ((right.priority_score ?? -1) !== (left.priority_score ?? -1)) {
        return (right.priority_score ?? -1) - (left.priority_score ?? -1);
      }
      if (left.dimension_order !== right.dimension_order) {
        return left.dimension_order - right.dimension_order;
      }
      return left.failure_mode_name.localeCompare(right.failure_mode_name, 'es');
    });

  const tasksWithStatus = actionViews.filter((a) => a.task_id !== null && a.option !== 'aceptar');
  const tasksDone = tasksWithStatus.filter((a) => a.task_status === 'done').length;
  const overdueCount = actionViews.filter((a) => a.sla_status === 'overdue').length;
  const dueSoonCount = actionViews.filter((a) => a.sla_status === 'due_soon').length;

  const [{ data: snapshotsRaw }, { data: actionEventsRaw }] = await Promise.all([
    fluxion
      .from('treatment_plan_snapshots')
      .select('id, trigger, actor_name, actor_user_id, captured_at, plan_state, actions_state, metadata')
      .eq('plan_id', currentPlan.id)
      .order('captured_at', { ascending: false }),
    fluxion
      .from('treatment_action_events')
      .select('id, action_id, event_type, actor_name, actor_user_id, occurred_at, before_state, after_state, justification')
      .eq('plan_id', currentPlan.id)
      .order('occurred_at', { ascending: false }),
  ]);

  const planSnapshots: PlanSnapshot[] = (snapshotsRaw ?? []) as PlanSnapshot[];
  const planActionEvents: PlanActionEvent[] = (actionEventsRaw ?? []) as PlanActionEvent[];

  // Historial de revisiones del plan
  const { data: reviewsRaw } = await fluxion
    .from('treatment_action_reviews')
    .select(`
      id, action_id, plan_id, organization_id,
      reviewed_at, reviewed_by, decision, new_review_due_date, justification,
      profiles!treatment_action_reviews_reviewed_by_fkey(full_name, display_name)
    `)
    .eq('plan_id', currentPlan.id)
    .order('reviewed_at', { ascending: false });

  const actionReviews: ActionReview[] = (reviewsRaw ?? []).map((r: Record<string, unknown>) => {
    const profile = r.profiles as { full_name?: string; display_name?: string } | null;
    const reviewerName = profile
      ? (profile.display_name || profile.full_name || '').trim() || null
      : null;
    return {
      id: r.id as string,
      action_id: r.action_id as string,
      plan_id: r.plan_id as string,
      organization_id: r.organization_id as string,
      reviewed_at: r.reviewed_at as string,
      reviewed_by: (r.reviewed_by as string | null) ?? null,
      reviewer_name: reviewerName,
      decision: r.decision as ReviewDecision,
      new_review_due_date: (r.new_review_due_date as string | null) ?? null,
      justification: r.justification as string,
    };
  });

  const pendingReviewsCount = actionViews.filter(
    (a) => a.review_status === 'due' || a.review_status === 'upcoming' || a.review_status === 'overdue_review'
  ).length;
  const overdueReviewsCount = actionViews.filter(
    (a) => a.review_status === 'overdue_review'
  ).length;

  return {
    system,
    evaluation,
    plan: currentPlan,
    actions: actionViews,
    members: memberOptions,
    approver_name: currentPlan.approver_id ? memberNames.get(currentPlan.approver_id) ?? 'Usuario' : null,
    read_only: !['draft', 'in_review'].includes(evaluation.state) || !['draft'].includes(currentPlan.status) || !plan,
    tasks_total: tasksWithStatus.length,
    tasks_done: tasksDone,
    is_approver: !!(params.currentUserId && currentPlan.approver_id && params.currentUserId === currentPlan.approver_id),
    overdue_count: overdueCount,
    due_soon_count: dueSoonCount,
    plan_snapshots: planSnapshots,
    plan_action_events: planActionEvents,
    action_reviews: actionReviews,
    pending_reviews_count: pendingReviewsCount,
    overdue_reviews_count: overdueReviewsCount,
  } satisfies TreatmentPlanData;
}

export function getAiActFloorForSystem(aiActLevel: string | null | undefined) {
  return getAiActZoneFloor(aiActLevel);
}
