'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import type { TaskPriority } from '@/lib/tasks/types';
import {
  computeResidualPriorities,
  type FmeaResidualInput,
} from '@/lib/failure-modes/activation-engine';
import {
  calculateFmeaZone,
  requiresJustification,
  requiresSecondReview,
  type FmeaEditableItem,
  type FmeaZone,
} from '@/lib/fmea/domain';
import {
  generateTreatmentPlanCode,
  getApproverRolePriority,
  getAiActFloorForSystem,
  getApprovalLevelForZone,
  getDefaultDeadlineForZone,
  getReviewCadenceForZone,
} from '@/lib/fmea/treatment-plan';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';
import { createFmeaItemTaskAction } from '@/app/(app)/tareas/actions';

type SaveFmeaItemInput = {
  aiSystemId: string;
  evaluationId: string;
  itemId: string;
  oValue: number | null;
  dRealValue: number | null;
  sActual: number | null;
  manualMode: boolean;
  justification?: string | null;
  status: 'pending' | 'evaluated' | 'skipped';
};

type SaveFmeaDraftInput = {
  aiSystemId: string;
  evaluationId: string;
  cachedZone: FmeaZone;
  items?: Array<{
    itemId: string;
    oValue: number | null;
    dRealValue: number | null;
    sActual: number | null;
    justification?: string | null;
    status: 'pending' | 'evaluated' | 'skipped';
    requiresSecondReview?: boolean;
  }>;
};

async function resolvePlanApprover(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: any;
  organizationId: string;
  approvalLevel: ReturnType<typeof getApprovalLevelForZone>;
  actorUserId: string;
}) {
  const { fluxion, organizationId, approvalLevel, actorUserId } = params;
  const { data: members } = await fluxion
    .from('profiles')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  const candidates = members ?? [];
  const priorities = getApproverRolePriority(approvalLevel);

  for (const role of priorities) {
    const match = candidates.find((member: { user_id: string; role: string }) => member.role === role && member.user_id !== actorUserId);
    if (match) {
      return match.user_id as string;
    }
  }

  for (const role of priorities) {
    const match = candidates.find((member: { user_id: string; role: string }) => member.role === role);
    if (match) {
      return match.user_id as string;
    }
  }

  const fallback = candidates.find((member: { user_id: string; role: string }) => member.user_id !== actorUserId) ?? candidates[0];
  return fallback?.user_id ?? null;
}

type ResolveFmeaSecondReviewInput = {
  aiSystemId: string;
  evaluationId: string;
  itemId: string;
  decision: 'approved' | 'rejected';
  notes?: string | null;
};

async function requireEditableEvaluation(params: { aiSystemId: string; evaluationId: string }) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró la organización del usuario.' } as const;
  }

  const { data: evaluation, error: evaluationError } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state, evaluator_id')
    .eq('organization_id', membership.organization_id)
    .eq('system_id', params.aiSystemId)
    .eq('id', params.evaluationId)
    .maybeSingle();

  if (evaluationError || !evaluation) {
    return { error: 'No se encontró la evaluación FMEA solicitada.' } as const;
  }

  if (!['draft', 'in_review'].includes(evaluation.state)) {
    return { error: 'La evaluación está en solo lectura y ya no admite cambios.' } as const;
  }

  return { supabase, fluxion, user, membership, evaluation } as const;
}

export async function saveFmeaItem(input: SaveFmeaItemInput) {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership } = context;

  const { data: item, error: itemError } = await fluxion
    .from('fmea_items')
    .select('id, failure_mode_id, s_default_frozen, o_value, d_real_value, s_actual, status, second_review_status')
    .eq('evaluation_id', input.evaluationId)
    .eq('id', input.itemId)
    .maybeSingle();

  if (itemError || !item) {
    return { error: 'No se encontró el ítem FMEA a guardar.' };
  }

  const normalizedOValue = input.status === 'evaluated' ? (input.oValue ?? 3) : input.oValue;
  const normalizedDRealValue =
    input.status === 'evaluated' ? (input.dRealValue ?? 3) : input.dRealValue;

  if (input.status === 'evaluated') {
    if (
      normalizedOValue === null ||
      normalizedOValue < 1 ||
      normalizedOValue > 5 ||
      normalizedDRealValue === null ||
      normalizedDRealValue < 1 ||
      normalizedDRealValue > 5 ||
      input.sActual === null ||
      input.sActual < 2 ||
      input.sActual > 9
    ) {
      return { error: 'Para confirmar un ítem necesitas O, D real y S actual válidos.' };
    }

    const justificationNeeded = requiresJustification({
      sDefault: item.s_default_frozen,
      sActual: input.sActual,
      status: 'evaluated',
      justification: input.justification,
    });

    if (justificationNeeded && (input.justification?.trim().length ?? 0) < 50) {
      return { error: 'La justificación es obligatoria y debe tener al menos 50 caracteres.' };
    }
  }

  const requiresSecond = requiresSecondReview({
    sDefault: item.s_default_frozen,
    sActual: input.status === 'evaluated' ? input.sActual : null,
    manualMode: input.status === 'evaluated' ? input.manualMode : false,
  });

  const updatePayload =
    input.status === 'skipped'
      ? {
          status: 'skipped',
          o_value: null,
          d_real_value: null,
          s_actual: null,
          narrative_justification: input.justification?.trim() || null,
          requires_second_review: false,
          second_review_status: 'not_required',
          second_reviewed_by: null,
          second_reviewed_at: null,
          second_review_notes: null,
          skipped_at: new Date().toISOString(),
        }
      : {
          status: 'evaluated',
          o_value: normalizedOValue,
          d_real_value: normalizedDRealValue,
          s_actual: input.sActual,
          narrative_justification: input.justification?.trim() || null,
          requires_second_review: requiresSecond,
          second_review_status: requiresSecond ? 'pending' : 'not_required',
          second_reviewed_by: null,
          second_reviewed_at: null,
          second_review_notes: null,
          skipped_at: null,
        };

  const { error: updateError } = await fluxion
    .from('fmea_items')
    .update(updatePayload)
    .eq('id', input.itemId)
    .eq('evaluation_id', input.evaluationId);

  if (updateError) {
    return { error: updateError.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: input.status === 'skipped' ? 'fmea_item_skipped' : 'fmea_item_evaluated',
      event_title: input.status === 'skipped' ? 'Modo de fallo pospuesto' : 'Modo de fallo evaluado',
      event_summary:
        input.status === 'skipped'
          ? 'Se pospuso un modo de fallo dentro de la evaluación FMEA.'
          : `Se confirmó un modo de fallo con S_actual ${input.sActual}.`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        item_id: input.itemId,
        failure_mode_id: item.failure_mode_id,
        status: input.status,
        s_actual: input.status === 'evaluated' ? input.sActual : null,
        requires_second_review: requiresSecond,
        second_review_status: input.status === 'evaluated' && requiresSecond ? 'pending' : 'not_required',
      },
    },
  ]);

  await fluxion.from('fmea_item_history').insert({
    item_id: input.itemId,
    evaluation_id: input.evaluationId,
    organization_id: membership.organization_id,
    actor_user_id: user.id,
    actor_name: membership.full_name ?? null,
    event_type: input.status === 'skipped' ? 'skipped' : 'evaluated',
    prev_o: item.o_value ?? null,
    new_o: input.status === 'evaluated' ? (normalizedOValue ?? null) : null,
    prev_d: item.d_real_value ?? null,
    new_d: input.status === 'evaluated' ? (normalizedDRealValue ?? null) : null,
    prev_s_actual: item.s_actual ?? null,
    new_s_actual: input.status === 'evaluated' ? (input.sActual ?? null) : null,
    prev_status: item.status,
    new_status: input.status,
    prev_second_review_status: item.second_review_status ?? null,
    new_second_review_status: input.status === 'evaluated' && requiresSecond ? 'pending' : 'not_required',
    notes: input.justification?.trim() || null,
  });

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);
  revalidatePath(`/inventario/${input.aiSystemId}`);

  return { success: true, requiresSecondReview: requiresSecond };
}

export async function saveFmeaDraft(input: SaveFmeaDraftInput) {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership } = context;

  if (input.items && input.items.length > 0) {
    // Validar todos los ítems antes de persistir nada (3.2)
    for (const item of input.items) {
      if (item.status === 'evaluated') {
        if (
          item.oValue !== null && (item.oValue < 1 || item.oValue > 5) ||
          item.dRealValue !== null && (item.dRealValue < 1 || item.dRealValue > 5) ||
          item.sActual !== null && (item.sActual < 2 || item.sActual > 9)
        ) {
          return { error: `Ítem ${item.itemId}: valores O, D o S fuera de rango. Revisa antes de guardar.` };
        }
      }
    }

    const skippedAt = new Date().toISOString();

    for (const item of input.items) {
      const normalizedOValue = item.status === 'skipped' ? null : (item.oValue ?? 3);
      const normalizedDRealValue = item.status === 'skipped' ? null : (item.dRealValue ?? 3);
      const updatePayload =
        item.status === 'skipped'
          ? {
              status: 'skipped',
              o_value: null,
              d_real_value: null,
              s_actual: null,
              narrative_justification: item.justification?.trim() || null,
              requires_second_review: false,
              second_review_status: 'not_required',
              second_reviewed_by: null,
              second_reviewed_at: null,
              second_review_notes: null,
              skipped_at: skippedAt,
            }
          : {
              status: item.status,
              o_value: normalizedOValue,
              d_real_value: normalizedDRealValue,
              s_actual: item.sActual,
              narrative_justification: item.justification?.trim() || null,
              requires_second_review: item.requiresSecondReview ?? false,
              skipped_at: null,
            };

      const { error: itemUpdateError } = await fluxion
        .from('fmea_items')
        .update(updatePayload)
        .eq('id', item.itemId)
        .eq('evaluation_id', input.evaluationId);

      if (itemUpdateError) {
        return { error: `Error al guardar ítem: ${itemUpdateError.message}` };
      }
    }
  }

  const { error } = await fluxion
    .from('fmea_evaluations')
    .update({
      cached_zone: input.cachedZone,
      state: 'draft',
      evaluator_id: user.id,
    })
    .eq('id', input.evaluationId);

  if (error) {
    return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'fmea_draft_saved',
      event_title: 'Borrador FMEA guardado',
      event_summary: `Se guardó el borrador FMEA con ${input.cachedZone.replace('_', ' ')} como referencia de zona.`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        cached_zone: input.cachedZone,
      },
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);

  return { success: true };
}

export async function submitFmeaForReview(input: SaveFmeaDraftInput) {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership } = context;

  const { data: items, error: itemError } = await fluxion
    .from('fmea_items')
    .select('id, failure_mode_id, s_default_frozen, o_value, d_real_value, s_actual, status, narrative_justification, requires_second_review, second_review_status')
    .eq('evaluation_id', input.evaluationId);

  if (itemError || !items) {
    return { error: 'No se pudieron validar los ítems antes del envío.' };
  }

  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const skippedCount = items.filter((item) => item.status === 'skipped').length;
  const unresolvedCount = pendingCount + skippedCount;

  if (unresolvedCount > 0) {
    const parts: string[] = [];

    if (pendingCount > 0) {
      parts.push(`${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`);
    }

    if (skippedCount > 0) {
      parts.push(`${skippedCount} pospuesto${skippedCount === 1 ? '' : 's'}`);
    }

    return {
      error: `La evaluación todavía no puede enviarse: quedan ${parts.join(' y ')} por resolver.`,
    };
  }

  const invalidJustifications = items.filter((item) => {
    if (item.status !== 'evaluated') return false;
    return requiresJustification({
      sDefault: item.s_default_frozen,
      sActual: item.s_actual,
      status: 'evaluated',
      justification: item.narrative_justification,
    }) && (item.narrative_justification?.trim().length ?? 0) < 50;
  });

  if (invalidJustifications.length > 0) {
    return { error: 'Hay ítems que requieren justificación obligatoria antes de enviarse a revisión.' };
  }

  const unresolvedSecondReviewCount = items.filter(
    (item) =>
      item.requires_second_review &&
      item.status === 'evaluated' &&
      item.second_review_status !== 'approved'
  ).length;

  if (unresolvedSecondReviewCount > 0) {
    return {
      error: `Quedan ${unresolvedSecondReviewCount} modo${unresolvedSecondReviewCount === 1 ? '' : 's'} pendientes de 2ª revisión antes del envío.`,
    };
  }

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select('id, aiact_risk_level')
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return { error: 'No se pudo leer el sistema antes de enviar la evaluación.' };
  }

  // Determinar candidatos ANTES de cualquier cambio de estado (3.1)
  const candidateItems = items.filter(
    (item) =>
      item.status === 'evaluated' &&
      typeof item.s_actual === 'number' &&
      (item.s_actual >= 7 || item.requires_second_review)
  );

  // ── Ruta sin candidatos: no hay plan que crear, transición directa ──────────
  if (candidateItems.length === 0) {
    const { error: stateError } = await fluxion
      .from('fmea_evaluations')
      .update({ cached_zone: input.cachedZone, state: 'in_review', evaluator_id: user.id })
      .eq('id', input.evaluationId);

    if (stateError) return { error: stateError.message };

    await insertAiSystemHistoryEvents(fluxion, [
      {
        ai_system_id: input.aiSystemId,
        organization_id: membership.organization_id,
        event_type: 'fmea_submitted_for_review',
        event_title: 'Evaluación FMEA enviada a revisión',
        event_summary: 'La evaluación manual se envió a revisión sin acciones candidatas de tratamiento.',
        actor_user_id: user.id,
        payload: {
          evaluation_id: input.evaluationId,
          cached_zone: input.cachedZone,
          treatment_plan_id: null,
          treatment_actions_count: 0,
          residual_downgrades: 0,
        },
      },
    ]);

    revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);
    revalidatePath(`/inventario/${input.aiSystemId}`);
    return { success: true, planPath: `/inventario/${input.aiSystemId}` };
  }

  // ── Ruta con candidatos: crear plan y acciones ANTES de cambiar estado ──────
  const { data: existingPlan } = await fluxion
    .from('treatment_plans')
    .select('id, approver_id')
    .eq('evaluation_id', input.evaluationId)
    .maybeSingle();

  let treatmentPlanId = existingPlan?.id ?? null;
  let createdTreatmentPlan = false;
  let approverId = existingPlan?.approver_id ?? null;

  if (!treatmentPlanId) {
    const createdAt = new Date();
    const sMax = Math.max(
      ...items.map((item) => item.s_actual).filter((v): v is number => typeof v === 'number'),
      2
    );
    const zoneIItems = items.filter((item) => item.status === 'evaluated' && item.s_actual === 9).length;
    const zoneIIItems = items.filter((item) => item.status === 'evaluated' && item.s_actual === 8).length;
    const aiActFloor = getAiActFloorForSystem(system.aiact_risk_level);
    const approvalLevel = getApprovalLevelForZone(input.cachedZone);

    approverId = await resolvePlanApprover({
      fluxion,
      organizationId: membership.organization_id,
      approvalLevel,
      actorUserId: user.id,
    });

    if (!approverId) {
      return { error: 'No se encontró un aprobador disponible para esta zona FMEA. Revisa los roles de los miembros del equipo.' };
    }

    const pivotNodeIds = candidateItems
      .slice()
      .sort((l, r) => (r.s_actual ?? 0) - (l.s_actual ?? 0))
      .slice(0, 3)
      .map((item) => item.id);

    const code = await generateTreatmentPlanCode({ organizationId: membership.organization_id, createdAt });

    const { data: newPlan, error: planError } = await fluxion
      .from('treatment_plans')
      .insert({
        organization_id: membership.organization_id,
        system_id: input.aiSystemId,
        evaluation_id: input.evaluationId,
        code,
        status: 'draft',
        zone_at_creation: input.cachedZone,
        zone_target: input.cachedZone,
        ai_act_floor: aiActFloor,
        s_max_at_creation: sMax,
        modes_count_total: items.length,
        modes_count_zone_i: zoneIItems,
        modes_count_zone_ii: zoneIIItems,
        actions_total: candidateItems.length,
        actions_completed: 0,
        pivot_node_ids: pivotNodeIds,
        accepted_risk_count: 0,
        approval_level: approvalLevel,
        approver_id: approverId,
        deadline: getDefaultDeadlineForZone(input.cachedZone, createdAt),
        review_cadence: getReviewCadenceForZone(input.cachedZone),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (planError || !newPlan) {
      return { error: planError?.message ?? 'No se pudo crear el plan de tratamiento.' };
    }

    treatmentPlanId = newPlan.id;
    createdTreatmentPlan = true;
  }

  if (treatmentPlanId && !approverId) {
    approverId = await resolvePlanApprover({
      fluxion,
      organizationId: membership.organization_id,
      approvalLevel: getApprovalLevelForZone(input.cachedZone),
      actorUserId: user.id,
    });
    if (approverId) {
      await fluxion.from('treatment_plans').update({ approver_id: approverId }).eq('id', treatmentPlanId);
    }
  }

  if (candidateItems.length > 0 && treatmentPlanId) {
    const { data: existingActions } = await fluxion
      .from('treatment_actions')
      .select('fmea_item_id')
      .eq('plan_id', treatmentPlanId)
      .in('fmea_item_id', candidateItems.map((item) => item.id));

    const existingItemIds = new Set((existingActions ?? []).map((a) => a.fmea_item_id));

    const actionsToInsert = candidateItems
      .filter((item) => !existingItemIds.has(item.id))
      .map((item) => ({
        organization_id: membership.organization_id,
        plan_id: treatmentPlanId,
        fmea_item_id: item.id,
        option: null,
        status: 'pending',
        s_actual_at_creation: item.s_actual ?? 7,
        owner_id: null,
        due_date: null,
      }));

    if (actionsToInsert.length > 0) {
      const { error: actionsError } = await fluxion.from('treatment_actions').insert(actionsToInsert);
      if (actionsError) return { error: actionsError.message };
    }
  }

  // Plan y acciones OK — ahora sí cambiamos el estado de la evaluación (3.1)
  const { error: stateError } = await fluxion
    .from('fmea_evaluations')
    .update({ cached_zone: input.cachedZone, state: 'in_review', evaluator_id: user.id })
    .eq('id', input.evaluationId);

  if (stateError) return { error: stateError.message };

  // ── Re-cálculo de prioridad residual post-FMEA ──────────────────────────────
  const evaluatedItems = items.filter(
    (item) => item.status === 'evaluated' && typeof item.s_actual === 'number'
  );

  let residualDowngrades = 0;

  if (evaluatedItems.length > 0) {
    const failureModeIds = evaluatedItems.map((item) => item.failure_mode_id).filter(Boolean);

    const { data: systemModes } = await fluxion
      .from('system_failure_modes')
      .select('id, failure_mode_id, priority_score, priority_status, priority_reason_code')
      .eq('ai_system_id', input.aiSystemId)
      .eq('organization_id', membership.organization_id)
      .in('failure_mode_id', failureModeIds);

    if (systemModes && systemModes.length > 0) {
      const modeByFailureModeId = new Map(systemModes.map((m) => [m.failure_mode_id, m]));

      const residualInputs: FmeaResidualInput[] = evaluatedItems
        .map((item) => {
          const systemMode = modeByFailureModeId.get(item.failure_mode_id);
          if (!systemMode) return null;
          return {
            systemFailureModeId: systemMode.id,
            failureModeId: item.failure_mode_id,
            sDefaultFrozen: item.s_default_frozen ?? 5,
            sActual: item.s_actual,
            currentScore: systemMode.priority_score ?? 0,
            currentReasonCode: systemMode.priority_reason_code ?? null,
          } satisfies FmeaResidualInput;
        })
        .filter((x): x is FmeaResidualInput => x !== null);

      const residuals = computeResidualPriorities(residualInputs);
      const now = new Date().toISOString();

      for (const residual of residuals) {
        const currentMode = systemModes.find((m) => m.id === residual.systemFailureModeId);
        const newStatus = residual.shouldDowngrade ? 'monitoring' : currentMode?.priority_status ?? 'monitoring';

        await fluxion
          .from('system_failure_modes')
          .update({
            priority_score: residual.residualScore,
            priority_level: residual.residualLevel,
            priority_notes: residual.residualNotes,
            priority_reason_code: residual.residualReasonCode,
            priority_status: newStatus,
            priority_source: 'rules',
            priority_changed_by: user.id,
            priority_changed_at: now,
          })
          .eq('id', residual.systemFailureModeId)
          .eq('organization_id', membership.organization_id);

        if (residual.shouldDowngrade) residualDowngrades++;
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'fmea_submitted_for_review',
      event_title: 'Evaluación FMEA enviada a revisión',
      event_summary: `La evaluación manual se envió a revisión con ${input.cachedZone.replace('_', ' ')} como zona cacheada.${residualDowngrades > 0 ? ` ${residualDowngrades} modo${residualDowngrades === 1 ? '' : 's'} bajaron a observación tras re-cálculo residual.` : ''}`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        cached_zone: input.cachedZone,
        treatment_plan_id: treatmentPlanId,
        treatment_actions_count: candidateItems.length,
        approver_id: approverId,
        residual_downgrades: residualDowngrades,
      },
    },
    ...(createdTreatmentPlan && treatmentPlanId
      ? [
          {
            ai_system_id: input.aiSystemId,
            organization_id: membership.organization_id,
            event_type: 'treatment_plan_created',
            event_title: 'Plan de tratamiento creado',
            event_summary: `Se creó el plan de tratamiento asociado a la evaluación FMEA con ${candidateItems.length} acciones candidatas.`,
            actor_user_id: user.id,
            payload: {
              evaluation_id: input.evaluationId,
              treatment_plan_id: treatmentPlanId,
              candidate_actions: candidateItems.length,
              approver_id: approverId,
            },
          },
          ...(approverId
            ? [
                {
                  ai_system_id: input.aiSystemId,
                  organization_id: membership.organization_id,
                  event_type: 'treatment_plan_approver_assigned',
                  event_title: 'Aprobador asignado al plan',
                  event_summary: 'Se asignó automáticamente el aprobador del plan de tratamiento según el nivel requerido.',
                  actor_user_id: user.id,
                  payload: {
                    evaluation_id: input.evaluationId,
                    treatment_plan_id: treatmentPlanId,
                    approver_id: approverId,
                  },
                },
              ]
            : []),
        ]
      : []),
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);
  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);
  revalidatePath(`/inventario/${input.aiSystemId}`);

  return {
    success: true,
    planPath: `/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`,
  };
}

export async function bulkSkipFmeaItemsAction(input: {
  aiSystemId: string;
  evaluationId: string;
  itemIds: string[];
}) {
  if (input.itemIds.length === 0) return { error: 'No hay ítems seleccionados.' };

  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership } = context;

  const skippedAt = new Date().toISOString();

  const { data: currentItems } = await fluxion
    .from('fmea_items')
    .select('id, o_value, d_real_value, s_actual, status, second_review_status')
    .eq('evaluation_id', input.evaluationId)
    .in('id', input.itemIds);

  const { error: updateError } = await fluxion
    .from('fmea_items')
    .update({
      status: 'skipped',
      o_value: null,
      d_real_value: null,
      s_actual: null,
      narrative_justification: null,
      requires_second_review: false,
      second_review_status: 'not_required',
      second_reviewed_by: null,
      second_reviewed_at: null,
      second_review_notes: null,
      skipped_at: skippedAt,
    })
    .eq('evaluation_id', input.evaluationId)
    .in('id', input.itemIds);

  if (updateError) return { error: updateError.message };

  const historyRows = (currentItems ?? []).map((item) => ({
    item_id: item.id,
    evaluation_id: input.evaluationId,
    organization_id: membership.organization_id,
    actor_user_id: user.id,
    actor_name: membership.full_name ?? null,
    event_type: 'skipped' as const,
    prev_o: item.o_value ?? null,
    new_o: null,
    prev_d: item.d_real_value ?? null,
    new_d: null,
    prev_s_actual: item.s_actual ?? null,
    new_s_actual: null,
    prev_status: item.status,
    new_status: 'skipped',
    prev_second_review_status: item.second_review_status ?? null,
    new_second_review_status: 'not_required',
    notes: null,
  }));

  if (historyRows.length > 0) {
    await fluxion.from('fmea_item_history').insert(historyRows);
  }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);

  return { success: true, count: input.itemIds.length };
}

export async function bulkResetFmeaItemsAction(input: {
  aiSystemId: string;
  evaluationId: string;
  itemIds: string[];
}) {
  if (input.itemIds.length === 0) return { error: 'No hay ítems seleccionados.' };

  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership } = context;

  const { data: currentItems } = await fluxion
    .from('fmea_items')
    .select('id, o_value, d_real_value, s_actual, status, second_review_status')
    .eq('evaluation_id', input.evaluationId)
    .in('id', input.itemIds);

  const { error: updateError } = await fluxion
    .from('fmea_items')
    .update({
      status: 'pending',
      o_value: null,
      d_real_value: null,
      s_actual: null,
      narrative_justification: null,
      requires_second_review: false,
      second_review_status: 'not_required',
      second_reviewed_by: null,
      second_reviewed_at: null,
      second_review_notes: null,
      skipped_at: null,
    })
    .eq('evaluation_id', input.evaluationId)
    .in('id', input.itemIds);

  if (updateError) return { error: updateError.message };

  const historyRows = (currentItems ?? []).map((item) => ({
    item_id: item.id,
    evaluation_id: input.evaluationId,
    organization_id: membership.organization_id,
    actor_user_id: user.id,
    actor_name: membership.full_name ?? null,
    event_type: 'skipped' as const,
    prev_o: item.o_value ?? null,
    new_o: null,
    prev_d: item.d_real_value ?? null,
    new_d: null,
    prev_s_actual: item.s_actual ?? null,
    new_s_actual: null,
    prev_status: item.status,
    new_status: 'pending',
    prev_second_review_status: item.second_review_status ?? null,
    new_second_review_status: 'not_required',
    notes: 'Restablecido a pendiente (acción masiva)',
  }));

  if (historyRows.length > 0) {
    await fluxion.from('fmea_item_history').insert(historyRows);
  }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);

  return { success: true, count: input.itemIds.length };
}

export async function recomputeFmeaZone(input: {
  aiActLevel: string | null;
  items: FmeaEditableItem[];
}) {
  return calculateFmeaZone(input.items, input.aiActLevel);
}

export async function delegateFmeaItemAsTaskAction(input: {
  aiSystemId: string;
  evaluationId: string;
  itemId: string;
  title: string;
  assigneeId: string | null;
  priority: TaskPriority;
  dueDate: string | null;
}) {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  // Verificar que el ítem pertenece a esta evaluación
  const { fluxion } = context;
  const { data: item } = await fluxion
    .from('fmea_items')
    .select('id')
    .eq('id', input.itemId)
    .eq('evaluation_id', input.evaluationId)
    .maybeSingle();

  if (!item) {
    return { error: 'No se encontró el ítem FMEA.' };
  }

  const result = await createFmeaItemTaskAction({
    itemId:       input.itemId,
    systemId:     input.aiSystemId,
    evaluationId: input.evaluationId,
    title:        input.title,
    assigneeId:   input.assigneeId,
    dueDate:      input.dueDate,
    priority:     input.priority,
  });

  if ('error' in result) return result;

  if (!result.created) {
    return { error: 'Ya existe una tarea delegada para este modo de fallo.' };
  }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);
  revalidatePath(`/tareas`);

  return { success: true, taskId: result.taskId };
}

export async function resolveFmeaSecondReview(input: ResolveFmeaSecondReviewInput) {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership, evaluation } = context;

  if (!['admin', 'editor', 'dpo', 'technical'].includes(membership.role)) {
    return { error: 'No tienes permisos para realizar la segunda revisión.' };
  }

  if (evaluation.evaluator_id && evaluation.evaluator_id === user.id) {
    return { error: 'La segunda revisión debe realizarla un usuario distinto del evaluador principal.' };
  }

  const { data: item, error: itemError } = await fluxion
    .from('fmea_items')
    .select('id, failure_mode_id, status, requires_second_review, second_review_status')
    .eq('evaluation_id', input.evaluationId)
    .eq('id', input.itemId)
    .maybeSingle();

  if (itemError || !item) {
    return { error: 'No se encontró el ítem FMEA para resolver la segunda revisión.' };
  }

  if (item.status !== 'evaluated' || !item.requires_second_review) {
    return { error: 'Este ítem no requiere una segunda revisión activa.' };
  }

  const notes = input.notes?.trim() || null;

  if (input.decision === 'rejected' && (notes?.length ?? 0) < 50) {
    return { error: 'El rechazo de la segunda revisión requiere una nota de al menos 50 caracteres.' };
  }

  const reviewedAt = new Date().toISOString();

  const { error: updateError } = await fluxion
    .from('fmea_items')
    .update({
      second_review_status: input.decision,
      second_reviewed_by: user.id,
      second_reviewed_at: reviewedAt,
      second_review_notes: notes,
    })
    .eq('id', input.itemId)
    .eq('evaluation_id', input.evaluationId);

  if (updateError) {
    return { error: updateError.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type:
        input.decision === 'approved'
          ? 'fmea_second_review_approved'
          : 'fmea_second_review_rejected',
      event_title:
        input.decision === 'approved'
          ? 'Segunda revisión aprobada'
          : 'Segunda revisión rechazada',
      event_summary:
        input.decision === 'approved'
          ? 'Un segundo revisor validó este modo de fallo.'
          : 'Un segundo revisor solicitó revisar de nuevo este modo de fallo.',
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        item_id: input.itemId,
        failure_mode_id: item.failure_mode_id,
        decision: input.decision,
      },
    },
  ]);

  await fluxion.from('fmea_item_history').insert({
    item_id: input.itemId,
    evaluation_id: input.evaluationId,
    organization_id: membership.organization_id,
    actor_user_id: user.id,
    actor_name: membership.full_name ?? null,
    event_type: input.decision === 'approved' ? 'second_review_approved' : 'second_review_rejected',
    prev_second_review_status: item.second_review_status ?? null,
    new_second_review_status: input.decision,
    notes: notes,
  });

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);
  revalidatePath(`/inventario/${input.aiSystemId}`);

  return {
    success: true,
    secondReviewStatus: input.decision,
    secondReviewedBy: user.id,
    secondReviewedAt: reviewedAt,
    secondReviewNotes: notes,
  };
}
