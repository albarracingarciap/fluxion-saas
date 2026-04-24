'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { classifyAIAct } from '@/lib/ai-systems/scoring';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type ReviewClassificationInput = {
  aiSystemId: string;
  domain: string;
  intendedUse?: string;
  outputType?: string;
  interactsPersons: boolean;
  isAISystem: boolean | null;
  isGPAI: boolean;
  prohibitedPractice: boolean;
  affectsPersons: boolean | null;
  vulnerableGroups: boolean;
  hasMinors: boolean;
  biometric: boolean;
  criticalInfra: boolean;
  reviewNotes?: string;
};

function buildChangedFields(
  previous: Record<string, unknown>,
  next: Record<string, unknown>
) {
  const changed: Record<string, { previous: unknown; next: unknown }> = {};

  for (const [key, value] of Object.entries(next)) {
    if (previous[key] !== value) {
      changed[key] = {
        previous: previous[key] ?? null,
        next: value ?? null,
      };
    }
  }

  return changed;
}

export async function reviewSystemClassification(input: ReviewClassificationInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!input.aiSystemId || !input.domain) {
    return { error: 'Faltan datos obligatorios para revisar la clasificación.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      domain,
      intended_use,
      output_type,
      interacts_persons,
      is_ai_system,
      is_gpai,
      prohibited_practice,
      affects_persons,
      vulnerable_groups,
      involves_minors,
      uses_biometric_data,
      manages_critical_infra,
      aiact_risk_level,
      aiact_risk_basis,
      aiact_risk_reason,
      aiact_obligations
    `)
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId)
    .maybeSingle();

  if (systemError || !system) {
    return { error: 'No se pudo localizar el sistema a revisar.' };
  }

  const classificationInput = {
    domain: input.domain,
    intendedUse: input.intendedUse ?? null,
    outputType: input.outputType ?? null,
    interactsPersons: input.interactsPersons,
    isAISystem: input.isAISystem,
    isGPAI: input.isGPAI,
    prohibitedPractice: input.prohibitedPractice,
    affectsPersons: input.affectsPersons,
    vulnerableGroups: input.vulnerableGroups,
    hasMinors: input.hasMinors,
    biometric: input.biometric,
    criticalInfra: input.criticalInfra,
  };

  const classification = classifyAIAct(classificationInput);
  const now = new Date().toISOString();

  const updatePayload = {
    domain: input.domain,
    intended_use: input.intendedUse?.trim() || null,
    output_type: input.outputType || null,
    interacts_persons: input.interactsPersons,
    is_ai_system: input.isAISystem,
    is_gpai: input.isGPAI,
    prohibited_practice: input.prohibitedPractice,
    affects_persons: input.affectsPersons,
    vulnerable_groups: input.vulnerableGroups,
    involves_minors: input.hasMinors,
    uses_biometric_data: input.biometric,
    manages_critical_infra: input.criticalInfra,
    aiact_risk_level: classification?.level ?? 'pending',
    aiact_risk_basis: classification?.basis ?? null,
    aiact_risk_reason: classification?.reason ?? null,
    aiact_obligations: classification?.obls ?? [],
    aiact_classified_at: now,
    aiact_classified_by: user.id,
    updated_by: user.id,
  };

  const { error: updateError } = await fluxion
    .from('ai_systems')
    .update(updatePayload)
    .eq('organization_id', membership.organization_id)
    .eq('id', input.aiSystemId);

  if (updateError) {
    console.error('reviewSystemClassification update error:', updateError);
    return { error: updateError.message };
  }

  const changedFields = buildChangedFields(
    {
      domain: system.domain,
      intended_use: system.intended_use,
      output_type: system.output_type,
      interacts_persons: system.interacts_persons,
      is_ai_system: system.is_ai_system,
      is_gpai: system.is_gpai,
      prohibited_practice: system.prohibited_practice,
      affects_persons: system.affects_persons,
      vulnerable_groups: system.vulnerable_groups,
      involves_minors: system.involves_minors,
      uses_biometric_data: system.uses_biometric_data,
      manages_critical_infra: system.manages_critical_infra,
    },
    {
      domain: updatePayload.domain,
      intended_use: updatePayload.intended_use,
      output_type: updatePayload.output_type,
      interacts_persons: updatePayload.interacts_persons,
      is_ai_system: updatePayload.is_ai_system,
      is_gpai: updatePayload.is_gpai,
      prohibited_practice: updatePayload.prohibited_practice,
      affects_persons: updatePayload.affects_persons,
      vulnerable_groups: updatePayload.vulnerable_groups,
      involves_minors: updatePayload.involves_minors,
      uses_biometric_data: updatePayload.uses_biometric_data,
      manages_critical_infra: updatePayload.manages_critical_infra,
    }
  );

  const { error: reviewError } = await fluxion
    .from('ai_system_classification_reviews')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      previous_risk_level: system.aiact_risk_level,
      new_risk_level: updatePayload.aiact_risk_level,
      previous_basis: system.aiact_risk_basis,
      new_basis: updatePayload.aiact_risk_basis,
      previous_reason: system.aiact_risk_reason,
      new_reason: updatePayload.aiact_risk_reason,
      previous_obligations: system.aiact_obligations ?? [],
      new_obligations: updatePayload.aiact_obligations,
      review_notes: input.reviewNotes?.trim() || null,
      changed_fields: changedFields,
      reviewed_by: user.id,
      reviewed_at: now,
    });

  if (reviewError) {
    console.error('reviewSystemClassification review insert error:', reviewError);
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'classification_reviewed',
      event_title: 'Clasificación revisada',
      event_summary:
        classification?.label
          ? `La revisión confirmó o actualizó la clasificación a ${classification.label.toLowerCase()}.`
          : 'Se revisó la clasificación del sistema y quedó pendiente de completar datos.',
      payload: {
        previous_risk_level: system.aiact_risk_level,
        new_risk_level: updatePayload.aiact_risk_level,
        changed_fields: Object.keys(changedFields),
        obligations: updatePayload.aiact_obligations,
      },
      actor_user_id: user.id,
      created_at: now,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath('/inventario');

  return {
    success: true,
    classification: {
      level: updatePayload.aiact_risk_level,
      basis: updatePayload.aiact_risk_basis,
      reason: updatePayload.aiact_risk_reason,
      obligations: updatePayload.aiact_obligations,
    },
  };
}

// Conservamos este mock mientras exista la ruta /clasificacion heredada.
export async function runClassificationEngine(systemId: string) {
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return {
    success: true,
    result: {
      riskLevel: 'high_risk',
      floorZone: 'Zona II',
      baseRule: 'Anexo III · 5(b) — Evaluación de acceso a crédito',
      appliedArticles: ['Art. 9', 'Art. 10', 'Art. 11', 'Art. 12', 'Art. 13', 'Art. 14', 'Art. 15'],
      extraObligations: ['dora_art_28', 'gdpr_art_22'],
      ambiguityDetected: false,
      systemId,
    },
  };
}
