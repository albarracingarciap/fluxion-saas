'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  calculateProjectedZoneForTreatmentActions,
  getEvidenceDescriptionForOption,
  getApproverRolePriority,
  type TreatmentOption,
} from '@/lib/fmea/treatment-plan';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/lib/tasks/types';

type SaveTreatmentPlanDraftInput = {
  aiSystemId: string;
  evaluationId: string;
  notes: string | null;
};

type SaveTreatmentPlanBatchDraftInput = {
  aiSystemId: string;
  evaluationId: string;
  notes: string | null;
  actions: Array<{
    actionId: string;
    option: TreatmentOption | null;
    ownerId: string | null;
    dueDate: string | null;
    justification: string | null;
    sResidualTarget: number | null;
    controlTemplateId: string | null;
    reviewDueDate: string | null;
  }>;
};

type SaveTreatmentActionInput = {
  aiSystemId: string;
  evaluationId: string;
  actionId: string;
  option: TreatmentOption;
  ownerId: string | null;
  dueDate: string | null;
  justification: string | null;
  sResidualTarget: number | null;
  controlTemplateId: string | null;
  reviewDueDate: string | null;
};

type SubmitTreatmentPlanInput = {
  aiSystemId: string;
  evaluationId: string;
  approvalMinutesRef?: string | null;
};

async function requireEditableTreatmentPlan(params: {
  aiSystemId: string;
  evaluationId: string;
}) {
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
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró la organización del usuario.' } as const;
  }

  const { data: evaluation, error: evaluationError } = await fluxion
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, state')
    .eq('organization_id', membership.organization_id)
    .eq('system_id', params.aiSystemId)
    .eq('id', params.evaluationId)
    .maybeSingle();

  if (evaluationError || !evaluation) {
    return { error: 'No se encontró la evaluación FMEA asociada.' } as const;
  }

  const { data: plan, error: planError } = await fluxion
    .from('treatment_plans')
    .select('id, organization_id, system_id, evaluation_id, status, code, approval_level, approver_id')
    .eq('organization_id', membership.organization_id)
    .eq('system_id', params.aiSystemId)
    .eq('evaluation_id', params.evaluationId)
    .maybeSingle();

  if (planError || !plan) {
    return { error: 'No se encontró el plan de tratamiento asociado.' } as const;
  }

  if (!['admin', 'editor', 'dpo', 'technical'].includes(membership.role)) {
    return { error: 'No tienes permisos para editar este plan de tratamiento.' } as const;
  }

  if (plan.status !== 'draft') {
    return { error: 'El plan ya no está en borrador y no admite cambios.' } as const;
  }

  return { supabase, fluxion, user, membership, evaluation, plan } as const;
}

async function resolvePlanApprover(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: any;
  organizationId: string;
  approvalLevel: string;
  actorUserId: string;
}) {
  const { fluxion, organizationId, approvalLevel, actorUserId } = params;
  const { data: members } = await fluxion
    .from('profiles')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  const candidates = members ?? [];
  const priorities = getApproverRolePriority(approvalLevel as 'level_1' | 'level_2' | 'level_3');

  for (const role of priorities) {
    const match = candidates.find((member: { user_id: string; role: string }) => member.role === role && member.user_id !== actorUserId);
    if (match) return match.user_id as string;
  }

  for (const role of priorities) {
    const match = candidates.find((member: { user_id: string; role: string }) => member.role === role);
    if (match) return match.user_id as string;
  }

  const fallback = candidates.find((member: { user_id: string; role: string }) => member.user_id !== actorUserId) ?? candidates[0];
  return fallback?.user_id ?? null;
}

async function upsertMitigationControl(params: {
  organizationId: string;
  aiSystemId: string;
  ownerId: string | null;
  controlTemplateId: string;
  option: TreatmentOption;
}) {
  const fluxion = createFluxionClient();

  const { data: existingControl, error: existingError } = await fluxion
    .from('controls')
    .select('id, template_id')
    .eq('organization_id', params.organizationId)
    .eq('system_id', params.aiSystemId)
    .eq('template_id', params.controlTemplateId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existingControl) {
    if (params.ownerId) {
      await fluxion
        .from('controls')
        .update({ owner_id: params.ownerId })
        .eq('id', existingControl.id);
    }

    return { controlId: existingControl.id, controlResolution: 'linked' as const };
  }

  const { data: createdControl, error: createError } = await fluxion
    .from('controls')
    .insert({
      organization_id: params.organizationId,
      system_id: params.aiSystemId,
      template_id: params.controlTemplateId,
      status: 'planned',
      owner_id: params.ownerId,
      notes:
        params.option === 'mitigar'
          ? 'Control instanciado automáticamente desde el plan de tratamiento FMEA.'
          : null,
    })
    .select('id')
    .single();

  if (createError || !createdControl) {
    return { error: createError?.message ?? 'No se pudo crear el control de mitigación.' };
  }

  return { controlId: createdControl.id, controlResolution: 'created' as const };
}

async function calculateCurrentPlanProjectedZone(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: any;
  organizationId: string;
  aiSystemId: string;
  planId: string;
}) {
  const { fluxion, organizationId, aiSystemId, planId } = params;

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('aiact_risk_level')
    .eq('organization_id', organizationId)
    .eq('id', aiSystemId)
    .maybeSingle();

  const { data: persistedActions } = await fluxion
    .from('treatment_actions')
    .select(`
      id,
      option,
      s_actual_at_creation,
      s_residual_target,
      fmea_items!inner(
        dimension_id,
        s_default_frozen
      )
    `)
    .eq('plan_id', planId);

  return calculateProjectedZoneForTreatmentActions({
    actions: (persistedActions ?? []).map((action) => {
      const item = Array.isArray(action.fmea_items) ? action.fmea_items[0] : action.fmea_items;
      return {
        id: action.id,
        option: action.option,
        s_actual_at_creation: action.s_actual_at_creation,
        s_residual_target: action.s_residual_target,
        dimension_id: item?.dimension_id ?? 'gobernanza',
        s_default_frozen: item?.s_default_frozen ?? action.s_actual_at_creation,
      };
    }),
    aiActLevel: system?.aiact_risk_level,
  });
}

export async function saveTreatmentPlanDraft(input: SaveTreatmentPlanDraftInput) {
  const context = await requireEditableTreatmentPlan({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership, plan } = context;

  const projectedZone = await calculateCurrentPlanProjectedZone({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
    planId: plan.id,
  });

  const { error } = await fluxion
    .from('treatment_plans')
    .update({
      residual_risk_notes: input.notes?.trim() || null,
      zone_target: projectedZone,
      status: 'draft',
    })
    .eq('id', plan.id);

  if (error) {
    return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'treatment_plan_draft_saved',
      event_title: 'Borrador del plan guardado',
      event_summary: `Se guardó el borrador del plan de tratamiento ${plan.code}.`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        treatment_plan_id: plan.id,
      },
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);

  return { success: true };
}

export async function saveTreatmentPlanBatchDraft(input: SaveTreatmentPlanBatchDraftInput) {
  const context = await requireEditableTreatmentPlan({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, membership, plan } = context;

  for (const actionInput of input.actions) {
    const { data: existingAction, error: actionError } = await fluxion
      .from('treatment_actions')
      .select('id, plan_id, control_id')
      .eq('plan_id', plan.id)
      .eq('id', actionInput.actionId)
      .maybeSingle();

    if (actionError || !existingAction) {
      return { error: 'No se pudo guardar una de las acciones del borrador.' };
    }

    let controlId = existingAction.control_id;

    if (actionInput.option === 'mitigar' && actionInput.controlTemplateId) {
      const { data: existingControl } = await fluxion
        .from('controls')
        .select('id')
        .eq('organization_id', membership.organization_id)
        .eq('system_id', input.aiSystemId)
        .eq('template_id', actionInput.controlTemplateId)
        .maybeSingle();

      controlId = existingControl?.id ?? null;
    }

    const { error: updateError } = await fluxion
      .from('treatment_actions')
      .update({
        option: actionInput.option,
        status: 'pending',
        s_residual_target: actionInput.option === 'mitigar' ? actionInput.sResidualTarget : null,
        control_id: actionInput.option === 'mitigar' ? controlId : null,
        justification: actionInput.justification?.trim() || null,
        evidence_description: actionInput.option ? getEvidenceDescriptionForOption(actionInput.option) : null,
        owner_id: actionInput.ownerId,
        due_date: actionInput.dueDate,
        review_due_date: actionInput.option === 'aceptar' ? actionInput.reviewDueDate : null,
      })
      .eq('id', actionInput.actionId)
      .eq('plan_id', plan.id);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  const projectedZone = await calculateCurrentPlanProjectedZone({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
    planId: plan.id,
  });

  const { error: planError } = await fluxion
    .from('treatment_plans')
    .update({
      residual_risk_notes: input.notes?.trim() || null,
      zone_target: projectedZone,
      status: 'draft',
    })
    .eq('id', plan.id);

  if (planError) {
    return { error: planError.message };
  }

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);

  return { success: true };
}

export async function saveTreatmentActionDecision(input: SaveTreatmentActionInput) {
  const context = await requireEditableTreatmentPlan({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership, plan } = context;

  const { data: action, error: actionError } = await fluxion
    .from('treatment_actions')
    .select(`
      id,
      organization_id,
      plan_id,
      fmea_item_id,
      option,
      status,
      s_actual_at_creation,
      control_id,
      justification,
      owner_id,
      due_date,
      review_due_date
    `)
    .eq('plan_id', plan.id)
    .eq('id', input.actionId)
    .maybeSingle();

  if (actionError || !action) {
    return { error: 'No se encontró la acción de tratamiento a editar.' };
  }

  if (!input.ownerId) {
    return { error: 'Debes asignar un responsable para esta acción.' };
  }

  if (!input.dueDate) {
    return { error: 'Debes definir una fecha objetivo para esta acción.' };
  }

  if (input.dueDate > plan.deadline) {
    return { error: 'La fecha objetivo no puede superar la fecha límite global del plan.' };
  }

  if (input.option === 'mitigar') {
    if (!input.controlTemplateId) {
      return { error: 'Selecciona un control sugerido para la acción de mitigación.' };
    }

    if (typeof input.sResidualTarget !== 'number') {
      return { error: 'Define el S residual objetivo para la mitigación.' };
    }

    if (input.sResidualTarget < 1 || input.sResidualTarget >= action.s_actual_at_creation) {
      return { error: 'El S residual objetivo debe ser menor que el S actual del modo de fallo.' };
    }
  }

  if (input.option === 'aceptar') {
    if (action.s_actual_at_creation === 9) {
      return { error: 'Los modos con S_actual = 9 no pueden marcarse como aceptados.' };
    }

    if ((input.justification?.trim().length ?? 0) < 100) {
      return { error: 'La aceptación requiere una justificación de al menos 100 caracteres.' };
    }

    if (!input.reviewDueDate) {
      return { error: 'La aceptación requiere una fecha de revisión obligatoria.' };
    }
  }

  if (['transferir', 'evitar', 'diferir'].includes(input.option) && (input.justification?.trim().length ?? 0) < 50) {
    return {
      error: 'Necesitas una justificación de al menos 50 caracteres para documentar esta decisión.',
    };
  }

  if (input.option === 'diferir') {
    const today = new Date();
    const dueDate = new Date(`${input.dueDate}T00:00:00`);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 90 && (input.justification?.trim().length ?? 0) < 100) {
      return {
        error: 'Un diferimiento superior a 90 días requiere una justificación reforzada de al menos 100 caracteres.',
      };
    }
  }

  let controlId: string | null = null;
  let controlResolution: 'linked' | 'created' | null = null;

  if (input.option === 'mitigar' && input.controlTemplateId) {
    const controlResult = await upsertMitigationControl({
      organizationId: membership.organization_id,
      aiSystemId: input.aiSystemId,
      ownerId: input.ownerId,
      controlTemplateId: input.controlTemplateId,
      option: input.option,
    });

    if ('error' in controlResult) {
      return { error: controlResult.error };
    }

    controlId = controlResult.controlId ?? null;
    controlResolution = controlResult.controlResolution ?? null;
  }

  const { error: updateError } = await fluxion
    .from('treatment_actions')
    .update({
      option: input.option,
      status: 'pending',
      s_residual_target: input.option === 'mitigar' ? input.sResidualTarget : null,
      control_id: input.option === 'mitigar' ? controlId : null,
      justification: input.justification?.trim() || null,
      evidence_description: getEvidenceDescriptionForOption(input.option),
      owner_id: input.ownerId,
      due_date: input.dueDate,
      review_due_date: input.option === 'aceptar' ? input.reviewDueDate : null,
    })
    .eq('id', input.actionId)
    .eq('plan_id', plan.id);

  if (updateError) {
    return { error: updateError.message };
  }

  const { count: acceptedCount } = await fluxion
    .from('treatment_actions')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', plan.id)
    .eq('option', 'aceptar');

  await fluxion
    .from('treatment_plans')
    .update({
      accepted_risk_count: acceptedCount ?? 0,
    })
    .eq('id', plan.id);

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'treatment_action_updated',
      event_title: 'Decisión de tratamiento guardada',
      event_summary: `Se guardó una decisión de tratamiento (${input.option}) dentro del plan ${plan.code}.`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        treatment_plan_id: plan.id,
        treatment_action_id: input.actionId,
        option: input.option,
        control_id: controlId,
      },
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);
  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/evaluar`);

  return { success: true, controlId, controlResolution };
}

export async function submitTreatmentPlanForApproval(input: SubmitTreatmentPlanInput) {
  const context = await requireEditableTreatmentPlan({
    aiSystemId: input.aiSystemId,
    evaluationId: input.evaluationId,
  });

  if ('error' in context) return { error: context.error };

  const { fluxion, user, membership, plan } = context;

  const { data: actions, error: actionsError } = await fluxion
    .from('treatment_actions')
    .select(`
      id,
      option,
      status,
      s_actual_at_creation,
      s_residual_target,
      control_id,
      justification,
      owner_id,
      due_date,
      review_due_date,
      fmea_items!inner(
        dimension_id,
        s_default_frozen
      )
    `)
    .eq('plan_id', plan.id);

  if (actionsError || !actions) {
    return { error: 'No se pudieron validar las acciones del plan.' };
  }

  const undecided = actions.filter((action) => !action.option);
  if (undecided.length > 0) {
    return {
      error: `Debes definir ${undecided.length} acci${undecided.length === 1 ? 'ón' : 'ones'} antes de enviarlo a aprobación.`,
    };
  }

  const invalid = actions.filter((action) => {
    if (!action.owner_id || !action.due_date) return true;
    if (action.option === 'mitigar') {
      return !action.control_id || action.s_residual_target === null;
    }
    if (action.option === 'aceptar') {
      return (action.justification?.trim().length ?? 0) < 100 || !action.review_due_date;
    }
    if (['transferir', 'evitar', 'diferir'].includes(action.option ?? '')) {
      return (action.justification?.trim().length ?? 0) < 30;
    }
    return false;
  });

  if (invalid.length > 0) {
    return {
      error: `Hay ${invalid.length} acci${invalid.length === 1 ? 'ón incompleta o inconsistente' : 'ones incompletas o inconsistentes'}. Revísalas antes de enviarlo.`,
    };
  }

  const normalizedMinutesRef = input.approvalMinutesRef?.trim() || null;

  if (plan.approval_level === 'level_3' && !normalizedMinutesRef) {
    return {
      error: 'Los planes de Zona I requieren una referencia de acta o comité antes de enviarse a alta dirección.',
    };
  }

  const projectedZone = await calculateCurrentPlanProjectedZone({
    fluxion,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
    planId: plan.id,
  });

  let approverId = plan.approver_id;

  if (!approverId) {
    approverId = await resolvePlanApprover({
      fluxion,
      organizationId: membership.organization_id,
      approvalLevel: plan.approval_level,
      actorUserId: user.id,
    });
  }

  const { error: updateError } = await fluxion
    .from('treatment_plans')
    .update({
      status: 'in_review',
      approver_id: approverId,
      zone_target: projectedZone,
      approval_minutes_ref: plan.approval_level === 'level_3' ? normalizedMinutesRef : null,
    })
    .eq('id', plan.id);

  if (updateError) {
    return { error: updateError.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'treatment_plan_submitted',
      event_title: 'Plan enviado a aprobación',
      event_summary: `El plan ${plan.code} se envió al circuito de aprobación ${plan.status === 'draft' ? 'inicial' : 'actual'}.`,
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        treatment_plan_id: plan.id,
        approval_level: plan.approval_level,
        approver_id: approverId,
        approval_minutes_ref: plan.approval_level === 'level_3' ? normalizedMinutesRef : null,
      },
    },
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'treatment_plan_approval_requested',
      event_title: 'Solicitud de aprobación emitida',
      event_summary: approverId
        ? 'El plan quedó en cola de aprobación con un aprobador asignado.'
        : 'El plan quedó en cola de aprobación sin aprobador explícito asignado.',
      actor_user_id: user.id,
      payload: {
        evaluation_id: input.evaluationId,
        treatment_plan_id: plan.id,
        approval_level: plan.approval_level,
        approver_id: approverId,
        approval_minutes_ref: plan.approval_level === 'level_3' ? normalizedMinutesRef : null,
      },
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);
  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan/summary`);
  revalidatePath(`/inventario/${input.aiSystemId}`);

  return {
    success: true,
    summaryPath: `/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan/summary`,
  };
}

export async function updateLinkedTaskStatusAction(
  taskId: string,
  status: TaskStatus,
  aiSystemId: string,
  evaluationId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: 'Perfil no encontrado' };

  const { error } = await fluxion
    .from('tasks')
    .update({ status, ...(status === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: null }) })
    .eq('id', taskId)
    .eq('organization_id', profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath(`/inventario/${aiSystemId}/fmea/${evaluationId}/plan`);
  revalidatePath('/tareas');
  revalidatePath('/kanban');
  return { ok: true };
}
