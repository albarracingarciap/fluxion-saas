import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createClient } from '@/lib/supabase/server';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';

export type FmeaItemHistoryEntry = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  event_type: 'evaluated' | 'skipped' | 'second_review_approved' | 'second_review_rejected';
  prev_o: number | null;
  new_o: number | null;
  prev_d: number | null;
  new_d: number | null;
  prev_s_actual: number | null;
  new_s_actual: number | null;
  prev_status: string | null;
  new_status: string | null;
  prev_second_review_status: string | null;
  new_second_review_status: string | null;
  notes: string | null;
  changed_at: string;
};

export type FmeaEvaluationItemRecord = {
  id: string;
  evaluation_id: string;
  failure_mode_id: string;
  s_default_frozen: number;
  o_value: number | null;
  d_real_value: number | null;
  s_actual: number | null;
  narrative_justification: string | null;
  status: 'pending' | 'evaluated' | 'skipped';
  requires_second_review: boolean;
  second_review_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  second_reviewed_by: string | null;
  second_reviewed_at: string | null;
  second_review_notes: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
  failure_mode_code: string;
  failure_mode_name: string;
  failure_mode_description: string;
  dimension_id: string;
  dimension_name: string;
  dimension_order: number;
  bloque: string;
  subcategoria: string;
  tipo: string;
  r_value: number;
  i_value: number;
  d_value: number;
  e_value: number;
  control_refs: Array<{
    control_template_id: string;
    control_code: string;
    control_name: string;
    control_description: string;
    control_area: string | null;
    status: string | null;
    compliance_score: number | null;
    notes: string | null;
  }>;
  linked_task_id: string | null;
  linked_task_status: string | null;
  linked_task_assignee_name: string | null;
  linked_task_due_date: string | null;
  history: FmeaItemHistoryEntry[];
};

export type FmeaEvaluationRecord = {
  id: string;
  organization_id: string;
  system_id: string;
  state: 'draft' | 'in_review' | 'approved' | 'superseded';
  evaluator_id: string | null;
  approver_id: string | null;
  approved_at: string | null;
  next_review_at: string | null;
  version: number;
  cached_zone: string | null;
  created_at: string;
  updated_at: string;
};

export type FmeaSystemRecord = {
  id: string;
  name: string;
  internal_id: string | null;
  domain: string;
  status: string;
  aiact_risk_level: string;
  aiact_risk_reason: string | null;
  description: string | null;
  intended_use: string | null;
};

export type FmeaOrgMember = {
  user_id: string;
  full_name: string | null;
  role: string;
};

export type FmeaEvaluationData = {
  system: FmeaSystemRecord;
  evaluation: FmeaEvaluationRecord;
  items: FmeaEvaluationItemRecord[];
  viewerUserId: string;
  activationSummary: {
    activatedCount: number;
    prioritizedCount: number;
    seedStrategy: 'prioritized' | 'all_activated';
  };
  members: FmeaOrgMember[];
};

export async function requireFmeaContext() {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership && membershipError?.code === 'PGRST116') redirect('/onboarding');
  if (membershipError || !membership) redirect('/login');

  return {
    supabase,
    fluxion,
    compliance,
    user,
    membership,
  };
}

export async function ensureActiveFmeaEvaluation(params: {
  organizationId: string;
  aiSystemId: string;
  userId: string;
}) {
  const { organizationId, aiSystemId, userId } = params;
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const { data: activeEvaluation } = await fluxion
    .from('fmea_evaluations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .in('state', ['draft', 'in_review'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeEvaluation) {
    return {
      evaluationId: activeEvaluation.id,
      created: false,
      missingFailureModes: false,
      seedStrategy: null,
      prioritizedCount: 0,
      activatedCount: 0,
    };
  }

  const { data: systemModes } = await fluxion
    .from('system_failure_modes')
    .select('failure_mode_id, priority_status')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId)
    .order('created_at', { ascending: true });

  if (!systemModes || systemModes.length === 0) {
    return { evaluationId: null, created: false, missingFailureModes: true };
  }

  const prioritizedModeIds = systemModes
    .filter((row) => row.priority_status === 'prioritized')
    .map((row) => row.failure_mode_id);

  if (prioritizedModeIds.length === 0) {
    return {
      evaluationId: null,
      created: false,
      missingFailureModes: false,
      missingPrioritizedModes: true,
      prioritizedCount: 0,
      activatedCount: systemModes.length,
      error:
        'Todavía no hay una cola priorizada para este sistema. Revisa la pestaña "Modos de fallo" y ejecuta la priorización antes de iniciar la evaluación FMEA.',
    };
  }

  const failureModeIds = prioritizedModeIds;
  const seedStrategy = 'prioritized' as const;

  const { data: catalogRows, error: catalogError } = await compliance
    .from('failure_modes')
    .select('id, s_default')
    .in('id', failureModeIds);

  if (catalogError || !catalogRows || catalogRows.length === 0) {
    return { evaluationId: null, created: false, missingFailureModes: true };
  }

  const { data: latestEvaluation } = await fluxion
    .from('fmea_evaluations')
    .select('version')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (latestEvaluation?.version ?? 0) + 1;

  const { data: evaluationInsert, error: evaluationError } = await fluxion
    .from('fmea_evaluations')
    .insert({
      organization_id: organizationId,
      system_id: aiSystemId,
      state: 'draft',
      evaluator_id: userId,
      version,
    })
    .select('id')
    .single();

  if (evaluationError || !evaluationInsert) {
    return {
      evaluationId: null,
      created: false,
      missingFailureModes: false,
      error: evaluationError?.message ?? 'No se pudo crear la evaluación FMEA.',
    };
  }

  const sDefaultByMode = new Map(catalogRows.map((row) => [row.id, row.s_default]));

  const itemPayload = failureModeIds
    .filter((failureModeId) => sDefaultByMode.has(failureModeId))
    .map((failureModeId) => ({
      evaluation_id: evaluationInsert.id,
      failure_mode_id: failureModeId,
      s_default_frozen: sDefaultByMode.get(failureModeId),
      o_value: null,
      d_real_value: null,
      s_actual: null,
      narrative_justification: null,
      status: 'pending',
      requires_second_review: false,
    }));

  if (itemPayload.length > 0) {
    const { error: itemInsertError } = await fluxion.from('fmea_items').insert(itemPayload);

    if (itemInsertError) {
      return {
        evaluationId: null,
        created: false,
        missingFailureModes: false,
        error: itemInsertError.message,
      };
    }
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: aiSystemId,
      organization_id: organizationId,
      event_type: 'fmea_evaluation_created',
      event_title: 'Evaluación FMEA iniciada',
      event_summary: `Se abrió un nuevo ciclo FMEA con ${itemPayload.length} modos de fallo activados.`,
      actor_user_id: userId,
      payload: {
        evaluation_id: evaluationInsert.id,
        version,
        items_seeded: itemPayload.length,
        seed_strategy: seedStrategy,
        prioritized_count: prioritizedModeIds.length,
        activated_count: systemModes.length,
      },
    },
  ]);

  return {
    evaluationId: evaluationInsert.id,
    created: true,
    missingFailureModes: false,
    seedStrategy,
    prioritizedCount: prioritizedModeIds.length,
    activatedCount: systemModes.length,
  };
}

export async function buildFmeaEvaluationData(params: {
  organizationId: string;
  aiSystemId: string;
  evaluationId: string;
  viewerUserId: string;
}) {
  const { organizationId, aiSystemId, evaluationId, viewerUserId } = params;
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name, internal_id, domain, status, aiact_risk_level, aiact_risk_reason, description, intended_use')
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .maybeSingle<FmeaSystemRecord>();

  const { data: evaluation } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state, evaluator_id, approver_id, approved_at, next_review_at, version, cached_zone, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .eq('id', evaluationId)
    .maybeSingle<FmeaEvaluationRecord>();

  if (!system || !evaluation) return null;

  const { data: activationRows } = await fluxion
    .from('system_failure_modes')
    .select('id, priority_status')
    .eq('organization_id', organizationId)
    .eq('ai_system_id', aiSystemId);

  const { data: fmeaItems } = await fluxion
    .from('fmea_items')
    .select('id, evaluation_id, failure_mode_id, s_default_frozen, o_value, d_real_value, s_actual, narrative_justification, status, requires_second_review, second_review_status, second_reviewed_by, second_reviewed_at, second_review_notes, skipped_at, created_at, updated_at')
    .eq('evaluation_id', evaluationId)
    .order('created_at', { ascending: true });

  const itemRows = fmeaItems ?? [];
  const failureModeIds = itemRows.map((item) => item.failure_mode_id);
  const itemIds = itemRows.map((item) => item.id);
  const activatedCount = activationRows?.length ?? 0;
  const prioritizedCount = (activationRows ?? []).filter((row) => row.priority_status === 'prioritized').length;
  const seedStrategy: 'prioritized' | 'all_activated' =
    prioritizedCount > 0 ? 'prioritized' : 'all_activated';

  const [{ data: linkedTasks }, { data: orgMembers }, { data: historyRows }] = await Promise.all([
    itemIds.length > 0
      ? fluxion
          .from('tasks')
          .select('id, source_id, status, due_date, profiles!tasks_assignee_id_fkey(full_name)')
          .eq('organization_id', organizationId)
          .eq('source_type', 'fmea_item')
          .in('source_id', itemIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    fluxion
      .from('profiles')
      .select('user_id, full_name, role')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true, nullsFirst: false }),
    itemIds.length > 0
      ? fluxion
          .from('fmea_item_history')
          .select('id, item_id, actor_user_id, actor_name, event_type, prev_o, new_o, prev_d, new_d, prev_s_actual, new_s_actual, prev_status, new_status, prev_second_review_status, new_second_review_status, notes, changed_at')
          .eq('evaluation_id', evaluationId)
          .order('changed_at', { ascending: false })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const historyByItemId = new Map<string, FmeaItemHistoryEntry[]>();
  for (const row of (historyRows ?? []) as Array<Record<string, unknown>>) {
    const itemId = row.item_id as string;
    const bucket = historyByItemId.get(itemId) ?? [];
    bucket.push({
      id: row.id as string,
      actor_user_id: row.actor_user_id as string | null,
      actor_name: row.actor_name as string | null,
      event_type: row.event_type as FmeaItemHistoryEntry['event_type'],
      prev_o: row.prev_o as number | null,
      new_o: row.new_o as number | null,
      prev_d: row.prev_d as number | null,
      new_d: row.new_d as number | null,
      prev_s_actual: row.prev_s_actual as number | null,
      new_s_actual: row.new_s_actual as number | null,
      prev_status: row.prev_status as string | null,
      new_status: row.new_status as string | null,
      prev_second_review_status: row.prev_second_review_status as string | null,
      new_second_review_status: row.new_second_review_status as string | null,
      notes: row.notes as string | null,
      changed_at: row.changed_at as string,
    });
    historyByItemId.set(itemId, bucket);
  }

  const tasksByItemId = new Map(
    (linkedTasks ?? []).map((task) => [
      task.source_id as string,
      {
        id: task.id as string,
        status: task.status as string,
        due_date: task.due_date as string | null,
        assignee_name: (task.profiles as { full_name?: string } | null)?.full_name ?? null,
      },
    ])
  );

  const members: FmeaOrgMember[] = (orgMembers ?? []).map((m) => ({
    user_id: m.user_id as string,
    full_name: m.full_name as string | null,
    role: m.role as string,
  }));

  if (failureModeIds.length === 0) {
    return {
      system,
      evaluation,
      items: [],
      viewerUserId,
      activationSummary: {
        activatedCount,
        prioritizedCount,
        seedStrategy,
      },
      members,
    };
  }

  const { data: failureModes } = await compliance
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
      r_value,
      i_value,
      d_value,
      e_value,
      risk_dimensions(name, display_order)
    `)
    .in('id', failureModeIds);

  const { data: controlRefs } = await compliance
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
          .select('template_id, status, compliance_score, notes')
          .eq('organization_id', organizationId)
          .eq('system_id', aiSystemId)
          .in('template_id', controlTemplateIds);

  const controlsByTemplate = new Map(
    (controls ?? []).map((control) => [
      control.template_id,
      {
        status: control.status,
        compliance_score: control.compliance_score,
        notes: control.notes,
      },
    ])
  );

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
          ? mode.risk_dimensions[0]?.name ?? mode.dimension_id
          : mode.risk_dimensions?.name ?? mode.dimension_id,
        dimension_order: Array.isArray(mode.risk_dimensions)
          ? mode.risk_dimensions[0]?.display_order ?? 99
          : mode.risk_dimensions?.display_order ?? 99,
        bloque: mode.bloque,
        subcategoria: mode.subcategoria,
        tipo: mode.tipo,
        r_value: mode.r_value,
        i_value: mode.i_value,
        d_value: mode.d_value,
        e_value: mode.e_value,
      },
    ])
  );

  const refsByFailureMode = new Map<string, FmeaEvaluationItemRecord['control_refs']>();

  for (const ref of controlRefs ?? []) {
    const controlTemplate = Array.isArray(ref.control_templates)
      ? ref.control_templates[0]
      : ref.control_templates;

    if (!controlTemplate) continue;

    const bucket = refsByFailureMode.get(ref.failure_mode_id) ?? [];
    const controlState = controlsByTemplate.get(controlTemplate.id);

    bucket.push({
      control_template_id: controlTemplate.id,
      control_code: controlTemplate.code,
      control_name: controlTemplate.name,
      control_description: controlTemplate.description,
      control_area: controlTemplate.area,
      status: controlState?.status ?? null,
      compliance_score: controlState?.compliance_score ?? null,
      notes: controlState?.notes ?? null,
    });

    refsByFailureMode.set(ref.failure_mode_id, bucket);
  }

  const items: FmeaEvaluationItemRecord[] = itemRows
    .map((item) => {
      const catalog = failureModeMap.get(item.failure_mode_id);
      if (!catalog) return null;

      return {
        id: item.id,
        evaluation_id: item.evaluation_id,
        failure_mode_id: item.failure_mode_id,
        s_default_frozen: item.s_default_frozen,
        o_value: item.o_value,
        d_real_value: item.d_real_value,
        s_actual: item.s_actual,
        narrative_justification: item.narrative_justification,
        status: item.status,
        requires_second_review: item.requires_second_review,
        second_review_status: item.second_review_status,
        second_reviewed_by: item.second_reviewed_by,
        second_reviewed_at: item.second_reviewed_at,
        second_review_notes: item.second_review_notes,
        skipped_at: item.skipped_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        failure_mode_code: catalog.code,
        failure_mode_name: catalog.name,
        failure_mode_description: catalog.description,
        dimension_id: catalog.dimension_id,
        dimension_name: catalog.dimension_name,
        dimension_order: catalog.dimension_order,
        bloque: catalog.bloque,
        subcategoria: catalog.subcategoria,
        tipo: catalog.tipo,
        r_value: catalog.r_value,
        i_value: catalog.i_value,
        d_value: catalog.d_value,
        e_value: catalog.e_value,
        control_refs: refsByFailureMode.get(item.failure_mode_id) ?? [],
        linked_task_id: tasksByItemId.get(item.id)?.id ?? null,
        linked_task_status: tasksByItemId.get(item.id)?.status ?? null,
        linked_task_assignee_name: tasksByItemId.get(item.id)?.assignee_name ?? null,
        linked_task_due_date: tasksByItemId.get(item.id)?.due_date ?? null,
        history: historyByItemId.get(item.id) ?? [],
      };
    })
    .filter((item): item is FmeaEvaluationItemRecord => item !== null)
    .sort((left, right) => {
      if (left.dimension_order !== right.dimension_order) {
        return left.dimension_order - right.dimension_order;
      }
      return left.failure_mode_code.localeCompare(right.failure_mode_code, 'es');
    });

  return {
    system,
    evaluation,
    items,
    viewerUserId,
    activationSummary: {
      activatedCount,
      prioritizedCount,
      seedStrategy,
    },
    members,
  };
}

// ─── Comparativa entre versiones ─────────────────────────────────────────────

export type FmeaModeComparisonRow = {
  failure_mode_id: string;
  failure_mode_code: string;
  failure_mode_name: string;
  dimension_id: string;
  dimension_name: string;
  dimension_order: number;
  curr_s_actual: number | null;
  curr_status: 'pending' | 'evaluated' | 'skipped';
  prev_s_actual: number | null;
  prev_status: 'pending' | 'evaluated' | 'skipped' | null;
  delta: number | null;
  is_new: boolean;
  is_removed: boolean;
};

export type FmeaDimensionComparisonRow = {
  dimension_id: string;
  dimension_name: string;
  dimension_order: number;
  curr_avg_s: number | null;
  curr_max_s: number | null;
  prev_avg_s: number | null;
  prev_max_s: number | null;
  avg_delta: number | null;
  improved: number;
  deteriorated: number;
  unchanged: number;
  new_modes: number;
};

export type FmeaVersionComparisonData = {
  system: FmeaSystemRecord;
  currentEvaluation: FmeaEvaluationRecord;
  previousEvaluation: FmeaEvaluationRecord;
  modes: FmeaModeComparisonRow[];
  dimensions: FmeaDimensionComparisonRow[];
  summary: {
    improved: number;
    deteriorated: number;
    unchanged: number;
    new_modes: number;
    removed_modes: number;
    curr_zone: string | null;
    prev_zone: string | null;
  };
};

export async function buildFmeaVersionComparison(params: {
  organizationId: string;
  aiSystemId: string;
  evaluationId: string;
}): Promise<FmeaVersionComparisonData | null> {
  const { organizationId, aiSystemId, evaluationId } = params;
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const { data: currentEval } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state, evaluator_id, approver_id, approved_at, next_review_at, version, cached_zone, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .eq('id', evaluationId)
    .maybeSingle<FmeaEvaluationRecord>();

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('id, name, internal_id, domain, status, aiact_risk_level, aiact_risk_reason, description, intended_use')
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .maybeSingle<FmeaSystemRecord>();

  if (!currentEval || !system) return null;

  const { data: prevEval } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state, evaluator_id, approver_id, approved_at, next_review_at, version, cached_zone, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('system_id', aiSystemId)
    .lt('version', currentEval.version)
    .in('state', ['superseded', 'approved'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle<FmeaEvaluationRecord>();

  if (!prevEval) return null;

  const [{ data: currItems }, { data: prevItems }] = await Promise.all([
    fluxion
      .from('fmea_items')
      .select('id, failure_mode_id, s_actual, status, o_value, d_real_value')
      .eq('evaluation_id', currentEval.id),
    fluxion
      .from('fmea_items')
      .select('id, failure_mode_id, s_actual, status, o_value, d_real_value')
      .eq('evaluation_id', prevEval.id),
  ]);

  const allFailureModeIds = Array.from(
    new Set([
      ...(currItems ?? []).map((i) => i.failure_mode_id),
      ...(prevItems ?? []).map((i) => i.failure_mode_id),
    ])
  );

  if (allFailureModeIds.length === 0) return null;

  const { data: failureModes } = await compliance
    .from('failure_modes')
    .select('id, code, name, dimension_id, risk_dimensions(name, display_order)')
    .in('id', allFailureModeIds);

  const modeMap = new Map(
    (failureModes ?? []).map((mode) => [
      mode.id,
      {
        code: mode.code as string,
        name: mode.name as string,
        dimension_id: mode.dimension_id as string,
        dimension_name: (
          Array.isArray(mode.risk_dimensions)
            ? mode.risk_dimensions[0]?.name
            : (mode.risk_dimensions as { name: string } | null)?.name
        ) ?? (mode.dimension_id as string),
        dimension_order: (
          Array.isArray(mode.risk_dimensions)
            ? mode.risk_dimensions[0]?.display_order
            : (mode.risk_dimensions as { display_order: number } | null)?.display_order
        ) ?? 99,
      },
    ])
  );

  const currByMode = new Map((currItems ?? []).map((i) => [i.failure_mode_id, i]));
  const prevByMode = new Map((prevItems ?? []).map((i) => [i.failure_mode_id, i]));

  const modes: FmeaModeComparisonRow[] = [];

  for (const fmId of allFailureModeIds) {
    const catalog = modeMap.get(fmId);
    if (!catalog) continue;

    const curr = currByMode.get(fmId) ?? null;
    const prev = prevByMode.get(fmId) ?? null;
    const is_new = curr !== null && prev === null;
    const is_removed = curr === null && prev !== null;

    const curr_s = curr?.s_actual ?? null;
    const prev_s = prev?.s_actual ?? null;
    const delta =
      curr_s !== null && prev_s !== null ? curr_s - prev_s : null;

    modes.push({
      failure_mode_id: fmId,
      failure_mode_code: catalog.code,
      failure_mode_name: catalog.name,
      dimension_id: catalog.dimension_id,
      dimension_name: catalog.dimension_name,
      dimension_order: catalog.dimension_order,
      curr_s_actual: curr_s,
      curr_status: (curr?.status ?? 'pending') as 'pending' | 'evaluated' | 'skipped',
      prev_s_actual: prev_s,
      prev_status: prev ? (prev.status as 'pending' | 'evaluated' | 'skipped') : null,
      delta,
      is_new,
      is_removed,
    });
  }

  modes.sort((a, b) => {
    if (a.dimension_order !== b.dimension_order) return a.dimension_order - b.dimension_order;
    return a.failure_mode_code.localeCompare(b.failure_mode_code, 'es');
  });

  const dimensionMap = new Map<string, FmeaDimensionComparisonRow>();

  for (const mode of modes) {
    if (!dimensionMap.has(mode.dimension_id)) {
      dimensionMap.set(mode.dimension_id, {
        dimension_id: mode.dimension_id,
        dimension_name: mode.dimension_name,
        dimension_order: mode.dimension_order,
        curr_avg_s: null,
        curr_max_s: null,
        prev_avg_s: null,
        prev_max_s: null,
        avg_delta: null,
        improved: 0,
        deteriorated: 0,
        unchanged: 0,
        new_modes: 0,
      });
    }

    const dim = dimensionMap.get(mode.dimension_id)!;

    if (mode.is_new) {
      dim.new_modes++;
    } else if (mode.delta !== null) {
      if (mode.delta < 0) dim.improved++;
      else if (mode.delta > 0) dim.deteriorated++;
      else dim.unchanged++;
    }
  }

  for (const [dimId, dim] of Array.from(dimensionMap.entries())) {
    const currEvaluated = modes.filter(
      (m) => m.dimension_id === dimId && m.curr_s_actual !== null
    );
    const prevEvaluated = modes.filter(
      (m) => m.dimension_id === dimId && m.prev_s_actual !== null
    );

    dim.curr_avg_s =
      currEvaluated.length > 0
        ? Math.round((currEvaluated.reduce((s, m) => s + m.curr_s_actual!, 0) / currEvaluated.length) * 10) / 10
        : null;
    dim.curr_max_s =
      currEvaluated.length > 0 ? Math.max(...currEvaluated.map((m) => m.curr_s_actual!)) : null;
    dim.prev_avg_s =
      prevEvaluated.length > 0
        ? Math.round((prevEvaluated.reduce((s, m) => s + m.prev_s_actual!, 0) / prevEvaluated.length) * 10) / 10
        : null;
    dim.prev_max_s =
      prevEvaluated.length > 0 ? Math.max(...prevEvaluated.map((m) => m.prev_s_actual!)) : null;

    dim.avg_delta =
      dim.curr_avg_s !== null && dim.prev_avg_s !== null
        ? Math.round((dim.curr_avg_s - dim.prev_avg_s) * 10) / 10
        : null;
  }

  const dimensions = Array.from(dimensionMap.values()).sort(
    (a, b) => a.dimension_order - b.dimension_order
  );

  const summary = {
    improved: modes.filter((m) => m.delta !== null && m.delta < 0).length,
    deteriorated: modes.filter((m) => m.delta !== null && m.delta > 0).length,
    unchanged: modes.filter((m) => m.delta === 0).length,
    new_modes: modes.filter((m) => m.is_new).length,
    removed_modes: modes.filter((m) => m.is_removed).length,
    curr_zone: currentEval.cached_zone,
    prev_zone: prevEval.cached_zone,
  };

  return {
    system,
    currentEvaluation: currentEval,
    previousEvaluation: prevEval,
    modes,
    dimensions,
    summary,
  };
}
