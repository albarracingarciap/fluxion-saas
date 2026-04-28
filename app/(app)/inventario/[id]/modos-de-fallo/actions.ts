'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  activateFailureModesForSystem,
  ENGINE_VERSION,
  type FailureModeActivationContext,
  type FailureModeCatalogRow,
} from '@/lib/failure-modes/activation-engine';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type ActivateSystemFailureModesInput = {
  aiSystemId: string;
};

export async function activateSystemFailureModes(input: ActivateSystemFailureModesInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!input.aiSystemId) {
    return { error: 'Falta el sistema sobre el que activar los modos de fallo.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const { data: existingActivation } = await fluxion
    .from('ai_system_history')
    .select('id')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', input.aiSystemId)
    .eq('event_type', 'failure_modes_activated')
    .limit(1)
    .maybeSingle();

  if (existingActivation) {
    return { error: 'Los modos de fallo ya fueron activados previamente para este sistema.' };
  }

  const { data: existingModes } = await fluxion
    .from('system_failure_modes')
    .select('id')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', input.aiSystemId)
    .limit(1);

  if ((existingModes ?? []).length > 0) {
    return { error: 'El sistema ya tiene modos de fallo activados.' };
  }

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      domain,
      status,
      aiact_risk_level,
      intended_use,
      output_type,
      ai_system_type,
      provider_origin,
      external_provider,
      external_model,
      active_environments,
      data_sources,
      special_categories,
      is_ai_system,
      is_gpai,
      fully_automated,
      interacts_persons,
      affects_persons,
      vulnerable_groups,
      involves_minors,
      uses_biometric_data,
      manages_critical_infra,
      processes_personal_data,
      has_external_tools,
      has_tech_doc,
      has_logging,
      has_human_oversight,
      has_risk_assessment,
      training_data_doc,
      dpia_completed,
      review_frequency,
      dpo_involved
    `)
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return { error: 'No se pudo localizar el sistema seleccionado.' };
  }

  const { data: catalogRows, error: catalogError } = await compliance
    .from('failure_modes')
    .select('id, code, name, description, dimension_id, bloque, subcategoria, tipo, s_default, w_calculated')
    .order('code', { ascending: true });

  if (catalogError || !catalogRows) {
    return { error: catalogError?.message ?? 'No se pudo cargar el catálogo de modos de fallo.' };
  }

  const context: FailureModeActivationContext = {
    domain: system.domain,
    status: system.status,
    aiactRiskLevel: system.aiact_risk_level,
    intendedUse: system.intended_use,
    outputType: system.output_type,
    aiSystemType: system.ai_system_type,
    providerOrigin: system.provider_origin,
    externalProvider: system.external_provider,
    externalModel: system.external_model,
    activeEnvironments: system.active_environments,
    dataSources: system.data_sources,
    specialCategories: system.special_categories,
    isAISystem: system.is_ai_system,
    isGPAI: system.is_gpai,
    fullyAutomated: system.fully_automated,
    interactsPersons: system.interacts_persons,
    affectsPersons: system.affects_persons,
    vulnerableGroups: system.vulnerable_groups,
    hasMinors: system.involves_minors,
    biometric: system.uses_biometric_data,
    criticalInfra: system.manages_critical_infra,
    processesPersonalData: system.processes_personal_data,
    hasExternalTools: system.has_external_tools,
    hasTechDoc: system.has_tech_doc,
    hasLogging: system.has_logging,
    hasHumanOversight: system.has_human_oversight,
    hasRiskAssessment: system.has_risk_assessment,
    trainingDataDoc: system.training_data_doc,
    dpiaCompleted: system.dpia_completed,
    reviewFrequency: system.review_frequency,
    dpoInvolved: system.dpo_involved,
  };

  const activation = activateFailureModesForSystem(
    context,
    catalogRows as FailureModeCatalogRow[]
  );

  if (activation.activatedModes.length > 0) {
    const now = new Date().toISOString();
    const insertPayload = activation.activatedModes.map((mode) => ({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      failure_mode_id: mode.id,
      dimension_id: mode.dimension_id,
      activation_source: 'rule',
      activation_reason: mode.activation_reason,
      activation_family_ids: mode.activation_family_ids,
      activation_family_labels: mode.activation_family_labels,
      priority_status: mode.priority_status,
      priority_source: mode.priority_source,
      priority_score: mode.priority_score,
      priority_level: mode.priority_level,
      priority_notes: mode.priority_notes,
      priority_reason_code: mode.priority_reason_code,
      quota_dropped: mode.quota_dropped,
      engine_version: ENGINE_VERSION,
      activation_signals: activation.signals,
      priority_changed_by: user.id,
      priority_changed_at: now,
      created_by: user.id,
    }));

    const { error: insertError } = await fluxion
      .from('system_failure_modes')
      .upsert(insertPayload, {
        onConflict: 'ai_system_id,failure_mode_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      // Unique violation (código 23505): ya activado en un intento anterior
      if (insertError.code === '23505') {
        return { success: true, activatedCount: 0, metrics: activation.metrics };
      }
      return { error: insertError.message };
    }
  }

  const { metrics } = activation;
  const eventSummary =
    metrics.total_activated === 0
      ? 'Se ejecutó el motor de activación y no se detectaron modos de fallo candidatos con las reglas actuales.'
      : `Se activaron ${metrics.total_activated} modos de fallo: ${metrics.prioritized_count} prioritarios y ${metrics.monitoring_count} en observación.${metrics.high_dropped_by_quota > 0 ? ` ${metrics.high_dropped_by_quota} candidatos descartados por cuota (${metrics.quota_used}/${metrics.quota_max}).` : ''}`;

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'failure_modes_activated',
      event_title: 'Modos de fallo activados',
      event_summary: eventSummary,
      payload: {
        activation_source: 'rule',
        ...metrics,
        active_family_ids: activation.activeFamilies.map((family) => family.id),
        active_dimension_ids: Object.keys(activation.groupedByDimension),
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);

  return {
    success: true,
    activatedCount: activation.activatedModes.length,
    metrics: activation.metrics,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Promoción manual: monitoring → prioritized
// ────────────────────────────────────────────────────────────────────────────

type PromoteFailureModeInput = {
  systemFailureModeId: string;
  aiSystemId: string;
  reason: string;
};

export async function promoteFailureModeToPrioritized(input: PromoteFailureModeInput) {
  if (!input.reason || input.reason.trim().length < 30) {
    return { error: 'La justificación debe tener al menos 30 caracteres.' };
  }

  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No se encontró organización asociada al usuario.' };

  const { data: existing } = await fluxion
    .from('system_failure_modes')
    .select('id, priority_status, ai_system_id')
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  if (!existing) return { error: 'Modo de fallo no encontrado.' };
  if (existing.priority_status === 'prioritized') return { error: 'Este modo ya está en la cola prioritaria.' };
  if (existing.priority_status === 'dismissed') return { error: 'Un modo descartado no puede promoverse directamente. Restáuralo primero.' };

  const now = new Date().toISOString();

  const { error: updateError } = await fluxion
    .from('system_failure_modes')
    .update({
      priority_status: 'prioritized',
      priority_source: 'human',
      priority_notes: input.reason.trim(),
      priority_reason_code: 'high_in_quota',
      quota_dropped: false,
      priority_changed_by: user.id,
      priority_changed_at: now,
    })
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id);

  if (updateError) return { error: updateError.message };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'failure_mode_promoted',
      event_title: 'Modo de fallo promovido a prioritario',
      event_summary: `Un modo en observación fue promovido manualmente a la cola priorizada. Motivo: ${input.reason.trim()}`,
      payload: {
        system_failure_mode_id: input.systemFailureModeId,
        previous_status: existing.priority_status,
        reason: input.reason.trim(),
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  return { success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Descarte: prioritized | monitoring → dismissed
// ────────────────────────────────────────────────────────────────────────────

type DismissFailureModeInput = {
  systemFailureModeId: string;
  aiSystemId: string;
  reason: string;
};

export async function dismissFailureMode(input: DismissFailureModeInput) {
  if (!input.reason || input.reason.trim().length < 20) {
    return { error: 'Indica el motivo del descarte (mínimo 20 caracteres).' };
  }

  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No se encontró organización asociada al usuario.' };

  const { data: existing } = await fluxion
    .from('system_failure_modes')
    .select('id, priority_status')
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  if (!existing) return { error: 'Modo de fallo no encontrado.' };
  if (existing.priority_status === 'dismissed') return { error: 'Este modo ya está descartado.' };

  const now = new Date().toISOString();

  const { error: updateError } = await fluxion
    .from('system_failure_modes')
    .update({
      priority_status: 'dismissed',
      priority_source: 'human',
      priority_notes: input.reason.trim(),
      priority_changed_by: user.id,
      priority_changed_at: now,
    })
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id);

  if (updateError) return { error: updateError.message };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'failure_mode_dismissed',
      event_title: 'Modo de fallo descartado',
      event_summary: `Modo descartado manualmente (no aplica al sistema). Motivo: ${input.reason.trim()}`,
      payload: {
        system_failure_mode_id: input.systemFailureModeId,
        previous_status: existing.priority_status,
        reason: input.reason.trim(),
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  return { success: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Restauración: dismissed → monitoring
// ────────────────────────────────────────────────────────────────────────────

type RestoreFailureModeInput = {
  systemFailureModeId: string;
  aiSystemId: string;
};

export async function restoreFailureMode(input: RestoreFailureModeInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No se encontró organización asociada al usuario.' };

  const { data: existing } = await fluxion
    .from('system_failure_modes')
    .select('id, priority_status')
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  if (!existing) return { error: 'Modo de fallo no encontrado.' };
  if (existing.priority_status !== 'dismissed') return { error: 'Solo se pueden restaurar modos descartados.' };

  const now = new Date().toISOString();

  const { error: updateError } = await fluxion
    .from('system_failure_modes')
    .update({
      priority_status: 'monitoring',
      priority_source: 'human',
      priority_notes: 'Restaurado a observación tras revisión.',
      priority_changed_by: user.id,
      priority_changed_at: now,
    })
    .eq('id', input.systemFailureModeId)
    .eq('organization_id', membership.organization_id);

  if (updateError) return { error: updateError.message };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'failure_mode_restored',
      event_title: 'Modo de fallo restaurado a observación',
      event_summary: 'Modo previamente descartado restaurado a la cola de observación.',
      payload: { system_failure_mode_id: input.systemFailureModeId },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  return { success: true };
}
