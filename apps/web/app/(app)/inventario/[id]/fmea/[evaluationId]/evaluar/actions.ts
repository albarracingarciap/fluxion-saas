'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { canResolveFmeaSecondReview } from '@/lib/auth/roles-flujo';
import { humanOversightBlocker } from '@/lib/governance/functions';
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
  draftMakesManual,
  isNoopFamilyUpdate,
  referenceSeverity,
  resolveFamilyEstimates,
  summarizeFamilies,
  type FamilyEstimate,
  type FamilyItem,
} from '@/lib/fmea/families';
import {
  generateTreatmentPlanCode,
  getAiActFloorForSystem,
  getApprovalLevelForZone,
  getDefaultDeadlineForZone,
  getReviewCadenceForZone,
} from '@/lib/fmea/treatment-plan';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createNoCacheAdminClient } from '@/lib/supabase/ingest';
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
    // `id` lo necesita la estimacion por familia para registrar quien la firma.
    .select('id, organization_id, role, roles, full_name')
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

  // Una evaluación enviada solo se puede retocar mientras su plan siga en
  // borrador. Con el plan en aprobación o aprobado, cambiarla dejaría el plan
  // desalineado de la evaluación que se aprobó (B05; el ciclo completo, en B07).
  if (evaluation.state === 'in_review') {
    const { data: lockingPlan } = await fluxion
      .from('treatment_plans')
      .select('id, status')
      .eq('organization_id', membership.organization_id)
      .eq('evaluation_id', params.evaluationId)
      .neq('status', 'draft')
      .limit(1)
      .maybeSingle();
    if (lockingPlan) {
      return {
        error: 'La evaluación tiene un plan de tratamiento enviado a aprobación o aprobado y ya no admite cambios.',
      } as const;
    }
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
          // Posponer es una decisión individual: la estimación por familia no la pisa (R6).
          estimate_source: 'manual',
          estimate_families: null,
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
          // Confirmación individual: la estimación por familia ya no la pisa (R6).
          estimate_source: 'manual',
          estimate_families: null,
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

  const { fluxion, user, membership, evaluation } = context;

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

    // Los modos que heredaban de una familia y se han retocado en la lista pasan
    // a ajuste manual: si no, la siguiente estimación de familia pisaría el
    // retoque (B14). Queda en su historial como excepción.
    const { data: storedRows } = await fluxion
      .from('fmea_items')
      .select('id, status, o_value, d_real_value, s_actual, narrative_justification, estimate_source, estimate_families')
      .eq('evaluation_id', input.evaluationId);
    const stored = new Map(
      ((storedRows ?? []) as Array<{
        id: string; status: string; o_value: number | null; d_real_value: number | null
        s_actual: number | null; narrative_justification: string | null
        estimate_source: string | null; estimate_families: string[] | null
      }>).map((row) => [row.id, row])
    );
    const exceptionHistory: Array<Record<string, unknown>> = [];

    for (const item of input.items) {
      // Los ítems pendientes se guardan tal como están: sin rellenar O y D con 3
      // ni calcular una severidad que nadie ha confirmado (R5). Esa severidad
      // aparecía después en Evaluaciones (Zona I) y en la exportación.
      const isPending = item.status === 'pending';
      const normalizedOValue = item.status === 'skipped' ? null : isPending ? (item.oValue ?? null) : (item.oValue ?? 3);
      const normalizedDRealValue =
        item.status === 'skipped' ? null : isPending ? (item.dRealValue ?? null) : (item.dRealValue ?? 3);
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
              s_actual: isPending ? null : item.sActual,
              narrative_justification: item.justification?.trim() || null,
              requires_second_review: isPending ? false : (item.requiresSecondReview ?? false),
              skipped_at: null,
            };

      const previous = stored.get(item.itemId);
      const becomesManual = !!previous && draftMakesManual(previous, {
        status: updatePayload.status,
        o_value: updatePayload.o_value,
        d_real_value: updatePayload.d_real_value,
        s_actual: updatePayload.s_actual,
        narrative_justification: updatePayload.narrative_justification,
      });

      const { error: itemUpdateError } = await fluxion
        .from('fmea_items')
        .update(becomesManual ? { ...updatePayload, estimate_source: 'manual', estimate_families: null } : updatePayload)
        .eq('id', item.itemId)
        .eq('evaluation_id', input.evaluationId);

      if (itemUpdateError) {
        return { error: `Error al guardar ítem: ${itemUpdateError.message}` };
      }

      if (becomesManual && previous) {
        exceptionHistory.push({
          item_id: item.itemId,
          evaluation_id: input.evaluationId,
          organization_id: membership.organization_id,
          actor_user_id: user.id,
          actor_name: membership.full_name ?? null,
          event_type: 'family_exception',
          prev_o: previous.o_value,
          new_o: updatePayload.o_value,
          prev_d: previous.d_real_value,
          new_d: updatePayload.d_real_value,
          prev_s_actual: previous.s_actual,
          new_s_actual: updatePayload.s_actual,
          prev_status: previous.status,
          new_status: updatePayload.status,
          notes: previous.estimate_families?.join(' · ') ?? null,
        });
      }
    }

    if (exceptionHistory.length > 0) {
      await fluxion.from('fmea_item_history').insert(exceptionHistory);
    }
  }

  const { error } = await fluxion
    .from('fmea_evaluations')
    .update({
      cached_zone: input.cachedZone,
      // Retocar una evaluación enviada la devuelve a borrador para reenviarla,
      // pero el evaluador no cambia: antes pasaba a serlo quien guardaba, lo que
      // rompía la segregación de la segunda revisión (R4).
      state: 'draft',
      ...(evaluation.evaluator_id ? {} : { evaluator_id: user.id }),
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
    .select('id, aiact_risk_level, human_oversight_owner_id')
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return { error: 'No se pudo leer el sistema antes de enviar la evaluación.' };
  }

  // B23b: en alto riesgo, sin responsable de supervisión humana no hay envío.
  const sinSupervision = humanOversightBlocker(system.aiact_risk_level, system.human_oversight_owner_id);
  if (sinSupervision) return { error: sinSupervision };

  // Determinar candidatos ANTES de cualquier cambio de estado (3.1)
  const candidateItems = items.filter(
    (item) =>
      item.status === 'evaluated' &&
      typeof item.s_actual === 'number' &&
      (item.s_actual >= 7 || item.requires_second_review)
  );

  // Ciclo único (B07, DP-03): la evaluación siempre va a aprobación con su
  // plan. Sin candidatos, el plan no tiene acciones y su aprobación es la de la
  // propia evaluación; al aprobarse, se cierra.
  const { data: existingPlan } = await fluxion
    .from('treatment_plans')
    .select('id, status')
    .eq('organization_id', membership.organization_id)
    .eq('evaluation_id', input.evaluationId)
    .maybeSingle();

  if (existingPlan && existingPlan.status !== 'draft') {
    return { error: 'El plan de esta evaluación ya está en aprobación o aprobado.' };
  }

  const createdAt = new Date();
  const sMax = Math.max(
    ...items.map((item) => item.s_actual).filter((v): v is number => typeof v === 'number'),
    2
  );
  const zoneIItems = items.filter((item) => item.status === 'evaluated' && item.s_actual === 9).length;
  const zoneIIItems = items.filter((item) => item.status === 'evaluated' && item.s_actual === 8).length;
  const approvalLevel = getApprovalLevelForZone(input.cachedZone);
  const pivotNodeIds = candidateItems
    .slice()
    .sort((l, r) => (r.s_actual ?? 0) - (l.s_actual ?? 0))
    .slice(0, 3)
    .map((item) => item.id);

  // Lo que depende del resultado de la evaluación. En un reenvío (plan devuelto
  // a borrador y evaluación corregida) se recalcula: la zona y el nivel de
  // aprobación pueden haber cambiado.
  const planFromEvaluation = {
    zone_at_creation: input.cachedZone,
    zone_target: input.cachedZone,
    ai_act_floor: getAiActFloorForSystem(system.aiact_risk_level),
    s_max_at_creation: sMax,
    modes_count_total: items.length,
    modes_count_zone_i: zoneIItems,
    modes_count_zone_ii: zoneIIItems,
    actions_total: candidateItems.length,
    pivot_node_ids: pivotNodeIds,
    approval_level: approvalLevel,
    review_cadence: getReviewCadenceForZone(input.cachedZone),
  };

  let treatmentPlanId = existingPlan?.id ?? null;
  let createdTreatmentPlan = false;

  // El plan no lleva aprobador asignado: se aprueba en Flujos de aprobación con
  // la política de su nivel (B11e).
  if (!treatmentPlanId) {
    const code = await generateTreatmentPlanCode({ organizationId: membership.organization_id, createdAt });

    const { data: newPlan, error: planError } = await fluxion
      .from('treatment_plans')
      .insert({
        organization_id: membership.organization_id,
        system_id: input.aiSystemId,
        evaluation_id: input.evaluationId,
        code,
        status: 'draft',
        ...planFromEvaluation,
        actions_completed: 0,
        accepted_risk_count: 0,
        deadline: getDefaultDeadlineForZone(input.cachedZone, createdAt),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (planError || !newPlan) {
      return { error: planError?.message ?? 'No se pudo crear el plan de tratamiento.' };
    }

    treatmentPlanId = newPlan.id;
    createdTreatmentPlan = true;
  } else {
    const { error: planUpdateError } = await fluxion
      .from('treatment_plans')
      .update(planFromEvaluation)
      .eq('id', treatmentPlanId);
    if (planUpdateError) return { error: planUpdateError.message };

    // Acciones de modos que ya no son candidatos tras corregir la evaluación.
    // Se retiran (el plan nunca se aprobó) y sus tareas se cancelan. Con el
    // cliente de servicio: RLS solo deja borrar acciones a algunos roles de
    // gobierno, y quien reenvía es quien prepara.
    const candidateIds = new Set(candidateItems.map((item) => item.id));
    const { data: planActions } = await fluxion
      .from('treatment_actions')
      .select('id, fmea_item_id, task_id')
      .eq('plan_id', treatmentPlanId);
    const staleActions = (planActions ?? []).filter((action) => !candidateIds.has(action.fmea_item_id));

    if (staleActions.length > 0) {
      const admin = createNoCacheAdminClient();
      const staleTaskIds = staleActions.map((action) => action.task_id).filter((id): id is string => Boolean(id));
      if (staleTaskIds.length > 0) {
        await admin
          .from('tasks')
          .update({ status: 'cancelled' })
          .eq('organization_id', membership.organization_id)
          .in('id', staleTaskIds);
      }
      const { error: deleteError } = await admin
        .from('treatment_actions')
        .delete()
        .eq('organization_id', membership.organization_id)
        .eq('plan_id', treatmentPlanId)
        .in('id', staleActions.map((action) => action.id));
      if (deleteError) return { error: deleteError.message };
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

  // Plan y acciones OK — ahora sí cambiamos el estado de la evaluación (3.1).
  // El evaluador es quien abrió la evaluación; quien la reenvía no lo sustituye.
  const { error: stateError } = await fluxion
    .from('fmea_evaluations')
    .update({
      cached_zone: input.cachedZone,
      state: 'in_review',
      evaluator_id: context.evaluation.evaluator_id ?? user.id,
    })
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
            },
          },
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
      estimate_source: 'manual',
      estimate_families: null,
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
      // Restablecer libera el ítem para que una estimación por familia vuelva a aplicarse.
      estimate_source: null,
      estimate_families: null,
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

  let assigneeProfileId: string | null = null;
  if (input.assigneeId) {
    const { data: assigneeProfile } = await fluxion
      .from('profiles')
      .select('id')
      .eq('user_id', input.assigneeId)
      .maybeSingle();
    if (!assigneeProfile) {
      return { error: 'El usuario asignado no tiene perfil en esta organización.' };
    }
    assigneeProfileId = assigneeProfile.id as string;
  }

  const result = await createFmeaItemTaskAction({
    itemId:       input.itemId,
    systemId:     input.aiSystemId,
    evaluationId: input.evaluationId,
    title:        input.title,
    assigneeId:   assigneeProfileId,
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

  // DP-01 (confirmado el 2026-10-20): la segunda revisión la resuelve el
  // Responsable del SGAI, distinto del evaluador.
  if (!canResolveFmeaSecondReview(membership)) {
    return { error: 'No tienes permisos para realizar la segunda revisión: la resuelve el Responsable del SGAI.' };
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

// ── Estimación por familia ──────────────────────────────────────────────────
//
// Un sistema activa 286 modos y prioriza 119. Evaluar 119 ítems a mano son unas
// seis horas por sistema. Los 119 caen en 10 familias causales: fijar O y D por
// familia y ajustar después las excepciones convierte 119 decisiones en 10 (B14).
//
// La regla que deriva la S vive en `domain.ts` y la de las familias en
// `families.ts`; aquí solo se lee y se escribe. No se reimplementa en SQL: dos
// verdades sobre lo mismo terminan divergiendo.

export type FamilyModeRow = {
  itemId:  string
  code:    string
  name:    string
  status:  string
  /** 'manual' = ajustado a mano; la estimación de familia no lo toca. */
  fuente:  string | null
  /** Severidad de referencia: la actual si está confirmado; si no, la por defecto. */
  severity: number
}

export type FamilyEstimateRow = {
  familyLabel:   string
  modos:         number
  /** Los modos concretos que agrupa. Sin esto, aplicar una estimación a 48
   *  modos es firmar a ciegas. */
  detalle:       FamilyModeRow[]
  /** Ítems de la familia ya ajustados a mano: la estimación no los toca. */
  manuales:      number
  /** Modos con severidad 8 o más: la familia se estima primero. */
  criticos:      number
  maxSeverity:   number
  oValue:        number | null
  dValue:        number | null
  justification: string | null
  updatedAt:     string | null
}

export async function getFamilyEstimates(input: {
  aiSystemId: string
  evaluationId: string
}): Promise<{ familias: FamilyEstimateRow[] } | { error: string }> {
  const context = await requireEditableEvaluation(input)
  if ('error' in context) return { error: context.error ?? 'No autorizado.' }
  const { fluxion } = context

  const [{ data: pertenencias, error: pErr }, { data: estimaciones }, { data: items }] = await Promise.all([
    fluxion
      .from('v_fmea_item_families')
      .select('item_id, failure_mode_id, family_label, estimate_source, status, failure_mode_code, failure_mode_name')
      .eq('evaluation_id', input.evaluationId),
    fluxion
      .from('fmea_family_estimates')
      .select('family_label, o_value, d_value, justification, updated_at')
      .eq('evaluation_id', input.evaluationId),
    fluxion
      .from('fmea_items')
      .select('id, s_default_frozen, s_actual')
      .eq('evaluation_id', input.evaluationId),
  ])

  if (pErr) return { error: 'No se pudieron leer las familias: ' + pErr.message }

  type Pertenencia = {
    item_id: string; failure_mode_id: string; family_label: string
    estimate_source: string | null; status: string
    failure_mode_code: string; failure_mode_name: string
  }
  type Estimacion = {
    family_label: string; o_value: number; d_value: number
    justification: string; updated_at: string
  }

  const severidades = new Map(
    ((items ?? []) as Array<{ id: string; s_default_frozen: number; s_actual: number | null }>)
      .map((i) => [i.id, i])
  )
  const filas = ((pertenencias ?? []) as Pertenencia[]).flatMap((p) => {
    const item = severidades.get(p.item_id)
    return item ? [{ ...p, s_default_frozen: item.s_default_frozen, s_actual: item.s_actual }] : []
  })
  const porLabel = new Map(((estimaciones ?? []) as Estimacion[]).map((e) => [e.family_label, e]))

  const familias: FamilyEstimateRow[] = summarizeFamilies(filas, new Set(porLabel.keys()))
    .map((resumen) => {
      const est = porLabel.get(resumen.familyLabel)
      const detalle = filas
        .filter((f) => f.family_label === resumen.familyLabel)
        .map((f) => ({
          itemId:   f.item_id,
          code:     f.failure_mode_code,
          name:     f.failure_mode_name,
          status:   f.status,
          fuente:   f.estimate_source,
          severity: referenceSeverity(f),
        }))
        .sort((x, y) => y.severity - x.severity || x.code.localeCompare(y.code, 'es'))
      return {
        familyLabel:   resumen.familyLabel,
        modos:         resumen.modos,
        detalle,
        manuales:      resumen.manuales,
        criticos:      resumen.criticos,
        maxSeverity:   resumen.maxSeverity,
        oValue:        est?.o_value ?? null,
        dValue:        est?.d_value ?? null,
        justification: est?.justification ?? null,
        updatedAt:     est?.updated_at ?? null,
      }
    })

  return { familias }
}

type Actor = { userId: string; organizationId: string; name: string | null }

/**
 * Recalcula los ítems que heredan de una familia (`resolveFamilyEstimates`) y
 * deja constancia en el historial de cada modo que cambia de valores.
 */
async function recalcularFamilias(
  fluxion: ReturnType<typeof createFluxionClient>,
  evaluationId: string,
  actor: Actor,
): Promise<{ actualizados: number; error?: string }> {
  const [{ data: estimaciones }, { data: pertenencias }, { data: items }] = await Promise.all([
    fluxion.from('fmea_family_estimates')
      .select('family_label, o_value, d_value, justification')
      .eq('evaluation_id', evaluationId),
    fluxion.from('v_fmea_item_families')
      .select('item_id, family_label')
      .eq('evaluation_id', evaluationId),
    fluxion.from('fmea_items')
      .select('id, s_default_frozen, estimate_source, status, o_value, d_real_value, s_actual')
      .eq('evaluation_id', evaluationId),
  ])

  const cambios = resolveFamilyEstimates({
    items:       (items ?? []) as FamilyItem[],
    memberships: (pertenencias ?? []) as Array<{ item_id: string; family_label: string }>,
    estimates:   (estimaciones ?? []) as FamilyEstimate[],
  })

  // En tandas: una evaluación de 119 modos son 119 actualizaciones.
  const TANDA = 20
  for (let i = 0; i < cambios.length; i += TANDA) {
    const resultados = await Promise.all(cambios.slice(i, i + TANDA).map((c) =>
      fluxion.from('fmea_items').update(c.patch).eq('id', c.itemId).eq('evaluation_id', evaluationId)
    ))
    const fallo = resultados.find((r) => r.error)
    if (fallo?.error) return { actualizados: i, error: 'No se pudieron actualizar los modos: ' + fallo.error.message }
  }

  const historial = cambios.filter((c) => !isNoopFamilyUpdate(c)).map((c) => ({
    item_id:         c.itemId,
    evaluation_id:   evaluationId,
    organization_id: actor.organizationId,
    actor_user_id:   actor.userId,
    actor_name:      actor.name,
    event_type:      c.kind === 'estimated' ? 'family_estimated' : 'family_withdrawn',
    prev_o:          c.prev.o,
    new_o:           c.patch.o_value,
    prev_d:          c.prev.d,
    new_d:           c.patch.d_real_value,
    prev_s_actual:   c.prev.s,
    new_s_actual:    c.patch.s_actual,
    prev_status:     c.prev.status,
    new_status:      c.patch.status,
    notes:           c.patch.estimate_families?.join(' · ') ?? null,
  }))
  if (historial.length > 0) await fluxion.from('fmea_item_history').insert(historial)

  return { actualizados: cambios.length }
}

function actorOf(context: {
  user: { id: string }
  membership: { organization_id: string; full_name?: string | null }
}): Actor {
  return {
    userId: context.user.id,
    organizationId: context.membership.organization_id,
    name: context.membership.full_name ?? null,
  }
}

export async function saveFamilyEstimate(input: {
  aiSystemId:    string
  evaluationId:  string
  familyLabel:   string
  oValue:        number
  dValue:        number
  justification: string
}): Promise<{ actualizados: number } | { error: string }> {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  })
  if ('error' in context) return { error: context.error ?? 'No autorizado.' }
  const { fluxion, membership } = context

  if (input.oValue < 1 || input.oValue > 5 || input.dValue < 1 || input.dValue > 5) {
    return { error: 'O y D tienen que estar entre 1 y 5.' }
  }

  // El mismo mínimo que se le exige a la justificación de un ítem individual.
  // Esta sustituye a todas las de la familia: rebajarle el listón sería cambiar
  // rigor por comodidad.
  if (input.justification.trim().length < 50) {
    return {
      error: 'La justificación es obligatoria y debe tener al menos 50 caracteres: '
        + 'sustituye a la de cada modo de la familia.',
    }
  }

  const { error: upErr } = await fluxion
    .from('fmea_family_estimates')
    .upsert({
      evaluation_id: input.evaluationId,
      family_label:  input.familyLabel,
      o_value:       input.oValue,
      d_value:       input.dValue,
      justification: input.justification.trim(),
      created_by:    membership.id,
    }, { onConflict: 'evaluation_id,family_label' })

  if (upErr) return { error: 'No se pudo guardar la estimación: ' + upErr.message }

  const resultado = await recalcularFamilias(fluxion, input.evaluationId, actorOf(context))
  if (resultado.error) return { error: resultado.error }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`)
  return { actualizados: resultado.actualizados }
}

export async function deleteFamilyEstimate(input: {
  aiSystemId:   string
  evaluationId: string
  familyLabel:  string
}): Promise<{ actualizados: number } | { error: string }> {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  })
  if ('error' in context) return { error: context.error ?? 'No autorizado.' }
  const { fluxion } = context

  const { error: delErr } = await fluxion
    .from('fmea_family_estimates')
    .delete()
    .eq('evaluation_id', input.evaluationId)
    .eq('family_label', input.familyLabel)

  if (delErr) return { error: 'No se pudo retirar la estimación: ' + delErr.message }

  const resultado = await recalcularFamilias(fluxion, input.evaluationId, actorOf(context))
  if (resultado.error) return { error: resultado.error }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`)
  return { actualizados: resultado.actualizados }
}

/**
 * Devuelve a la estimación de su familia unos modos ajustados a mano: dejan de
 * ser excepción y toman otra vez los valores de la familia. Solo para modos que
 * están en una familia estimada; si no, se quedarían sin valor de origen.
 */
export async function restoreFamilyEstimateForItems(input: {
  aiSystemId:   string
  evaluationId: string
  itemIds:      string[]
}): Promise<{ actualizados: number } | { error: string }> {
  const context = await requireEditableEvaluation({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  })
  if ('error' in context) return { error: context.error ?? 'No autorizado.' }
  const { fluxion } = context
  if (input.itemIds.length === 0) return { actualizados: 0 }

  const [{ data: pertenencias }, { data: estimaciones }] = await Promise.all([
    fluxion.from('v_fmea_item_families')
      .select('item_id, family_label')
      .eq('evaluation_id', input.evaluationId)
      .in('item_id', input.itemIds),
    fluxion.from('fmea_family_estimates')
      .select('family_label')
      .eq('evaluation_id', input.evaluationId),
  ])
  const estimadas = new Set((estimaciones ?? []).map((e: { family_label: string }) => e.family_label))
  const cubiertos = Array.from(new Set(
    ((pertenencias ?? []) as Array<{ item_id: string; family_label: string }>)
      .filter((p) => estimadas.has(p.family_label))
      .map((p) => p.item_id)
  ))
  if (cubiertos.length === 0) {
    return { error: 'Ninguno de estos modos está en una familia estimada: no hay estimación a la que volver.' }
  }

  const { error: upErr } = await fluxion
    .from('fmea_items')
    .update({ estimate_source: null, second_review_status: 'not_required',
      second_reviewed_by: null, second_reviewed_at: null, second_review_notes: null })
    .eq('evaluation_id', input.evaluationId)
    .eq('estimate_source', 'manual')
    .in('id', cubiertos)
  if (upErr) return { error: 'No se pudieron devolver los modos a su familia: ' + upErr.message }

  const resultado = await recalcularFamilias(fluxion, input.evaluationId, actorOf(context))
  if (resultado.error) return { error: resultado.error }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`)
  return { actualizados: cubiertos.length }
}
