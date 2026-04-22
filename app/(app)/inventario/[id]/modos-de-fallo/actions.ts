'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  activateFailureModesForSystem,
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
    .from('organization_members')
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
    console.error('activateSystemFailureModes catalog error:', catalogError);
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
      priority_changed_by: user.id,
      priority_changed_at: new Date().toISOString(),
      created_by: user.id,
    }));

    const { error: insertError } = await fluxion
      .from('system_failure_modes')
      .insert(insertPayload);

    if (insertError) {
      console.error('activateSystemFailureModes insert error:', insertError);
      return { error: insertError.message };
    }
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'failure_modes_activated',
      event_title: 'Modos de fallo activados',
      event_summary:
        activation.activatedModes.length === 0
          ? 'Se ejecutó el motor de activación y no se detectaron modos de fallo candidatos con las reglas actuales.'
          : `Se activaron ${activation.activatedModes.length} modos de fallo: ${activation.activatedModes.filter((mode) => mode.priority_status === 'prioritized').length} prioritarios y ${activation.activatedModes.filter((mode) => mode.priority_status === 'monitoring').length} en observación.`,
      payload: {
        activation_source: 'rule',
        activated_count: activation.activatedModes.length,
        prioritized_count: activation.activatedModes.filter((mode) => mode.priority_status === 'prioritized').length,
        monitoring_count: activation.activatedModes.filter((mode) => mode.priority_status === 'monitoring').length,
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
  };
}
