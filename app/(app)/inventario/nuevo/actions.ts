'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { buildIsoChecksSnapshot, calcISO, classifyAIAct } from '@/lib/ai-systems/scoring';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Map free-text data volume strings from the wizard to their ENUM values
const DATA_VOLUME_MAP: Record<string, string> = {
  '<1 GB': 'menos_1gb',
  '1-100 GB': '1_100gb',
  '100 GB - 1 TB': '100gb_1tb',
  '1-10 TB': '1_10tb',
  '>10 TB': 'mas_10tb',
  'Desconocido': 'desconocido',
};

const DATA_RETENTION_MAP: Record<string, string> = {
  '<6 meses': 'menos_6m',
  '6-12 meses': '6_12m',
  '1-3 años': '1_3a',
  '3-5 años': '3_5a',
  '>5 años': 'mas_5a',
  'Sin política definida': 'sin_politica',
};

const USAGE_SCALE_MAP: Record<string, string> = {
  '<100 decisiones/mes': 'menos_100m',
  '100-1.000/mes': '100_1k_m',
  '1.000-10.000/mes': '1k_10k_m',
  '10.000-100.000/mes': '10k_100k_m',
  '>100.000/mes': 'mas_100k_m',
};

const CERT_STATUS_MAP: Record<string, string> = {
  'Declaración de conformidad emitida': 'declaracion_emitida',
  'En proceso de evaluación': 'en_evaluacion',
  'Certificación CE obtenida': 'certificacion_ce',
  'Pendiente de iniciar': 'pendiente',
  'No aplica': 'no_aplica',
};

const RESIDUAL_RISK_MAP: Record<string, string> = {
  'Bajo': 'bajo',
  'Medio': 'medio',
  'Alto': 'alto',
  'Muy alto': 'muy_alto',
  'No determinado': 'no_determinado',
};

const DOC_STATUS_VALUES = new Set(['si', 'parcial', 'no', 'proceso']);

function normalizeDocStatus(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  return DOC_STATUS_VALUES.has(value) ? value : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveAISystem(formData: Record<string, any>) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const now = new Date().toISOString();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // Get user's organization (fluxion schema)
  const { data: membership, error: memberError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user!.id)
    .single();

  if (memberError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const classification = classifyAIAct(formData);
  const iso = calcISO({
    aiOwner: formData.aiOwner,
    hasTechDoc: formData.hasTechDoc,
    hasLogging: formData.hasLogging,
    humanOversight: formData.humanOversight,
    hasRiskAssessment: formData.hasRiskAssessment,
    dpoInvolved: formData.dpoInvolved,
    reviewFrequency: formData.reviewFrequency,
    incidentContact: formData.incidentContact,
    dpiaCompleted: formData.dpiaCompleted,
    hasAdversarialTest: formData.hasAdversarialTest,
  });

  // Build the insert payload mapping wizard fields → DB columns
  const payload = {
    organization_id: membership.organization_id,
    created_by: user.id,

    // Step 1 — Identification
    name: formData.name,
    version: formData.version || '1.0.0',
    internal_id: formData.internalId || null,
    domain: formData.domain,
    status: formData.status,
    deployed_at: formData.deployedAt || null,
    description: formData.description || null,
    technical_description: formData.technicalDesc || null,
    tags: formData.tags ?? [],

    // Step 2 — Purpose
    intended_use: formData.intendedUse || null,
    prohibited_uses: formData.prohibitedUses || null,
    output_type: formData.outputType || null,
    fully_automated: formData.fullyAutomated ?? null,
    interacts_persons: formData.interactsPersons ?? false,
    target_users: formData.targetUsers ?? [],
    usage_scale: USAGE_SCALE_MAP[formData.usageScale] ?? null,
    geo_scope: formData.geoScope ?? [],

    // Step 3 — AI Act classification
    is_ai_system: formData.isAISystem ?? null,
    is_gpai: formData.isGPAI ?? false,
    prohibited_practice: formData.prohibitedPractice ?? false,
    affects_persons: formData.affectsPersons ?? null,
    vulnerable_groups: formData.vulnerableGroups ?? false,
    involves_minors: formData.hasMinors ?? false,
    uses_biometric_data: formData.biometric ?? false,
    manages_critical_infra: formData.criticalInfra ?? false,
    aiact_risk_level: classification?.level ?? 'pending',
    aiact_risk_basis: classification?.basis ?? null,
    aiact_risk_reason: classification?.reason ?? null,
    aiact_obligations: classification?.obls ?? [],
    aiact_classified_at: now,
    aiact_classified_by: user.id,

    // Step 4 — Data
    processes_personal_data: formData.processesPersonalData ?? null,
    data_categories: formData.dataCategories ?? [],
    special_categories: formData.specialCategories ?? [],
    legal_bases: formData.legalBases ?? [],
    legal_bases_art9: formData.legalBasesArt9 ?? [],
    intl_data_transfers: formData.intlDataTransfers ?? false,
    data_sources: formData.dataSources ?? [],
    training_data_doc: formData.trainingDataDoc || null,
    data_volume: DATA_VOLUME_MAP[formData.dataVolume] ?? null,
    data_retention: DATA_RETENTION_MAP[formData.dataRetention] ?? null,
    dpia_completed: normalizeDocStatus(formData.dpiaCompleted),

    // Step 5 — Technology
    ai_system_type: formData.aiSystemType || null,
    base_model: formData.baseModel || null,
    external_model: formData.externalModel || null,
    external_provider: formData.extProvider || null,
    oss_model_name: formData.ossModelName || null,
    oss_license: formData.ossLicense || null,
    has_explainability: normalizeDocStatus(formData.hasExplainability),
    frameworks: formData.frameworks || null,
    provider_origin: formData.origin || null,
    has_fine_tuning: formData.hasFineTuning ?? false,
    has_external_tools: formData.hasExternalTools ?? false,
    active_environments: formData.environments ?? [],
    mlops_integration: formData.mlopsIntegration || null,

    // Step 6 — Governance
    ai_owner: formData.aiOwner || null,
    responsible_team: formData.responsibleTeam || null,
    tech_lead: formData.techLead || null,
    executive_sponsor: formData.executiveSponsor || null,
    dpo_involved: formData.dpoInvolved ?? false,
    has_sla: formData.hasSLA ?? false,
    review_frequency: formData.reviewFrequency || null,
    last_review_date: formData.lastReviewDate || null,
    incident_contact: formData.incidentContact || null,
    critical_providers: formData.criticalProviders || null,

    // Step 7 — Controls
    has_tech_doc: normalizeDocStatus(formData.hasTechDoc),
    has_logging: normalizeDocStatus(formData.hasLogging),
    has_human_oversight: normalizeDocStatus(formData.humanOversight),
    oversight_type: formData.oversightType || null,
    has_complaint_mechanism: formData.hasComplaintMechanism ?? false,
    has_risk_assessment: normalizeDocStatus(formData.hasRiskAssessment),
    residual_risk: RESIDUAL_RISK_MAP[formData.residualRisk] ?? null,
    mitigation_notes: formData.mitigationNotes || null,
    has_adversarial_test: formData.hasAdversarialTest ?? false,
    cert_status: CERT_STATUS_MAP[formData.certStatus] ?? null,
    next_audit_date: formData.nextAudit || null,

    // ISO 42001 score (passed from frontend)
    iso_42001_score: iso.score,
    iso_42001_checks: buildIsoChecksSnapshot(iso.checks),
    iso_42001_updated_at: now,
  };

  const { data, error } = await fluxion
    .from('ai_systems')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('saveAISystem error:', error);
    return { error: error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: data.id,
      organization_id: membership.organization_id,
      event_type: 'system_created',
      event_title: 'Sistema registrado',
      event_summary: `Se registró ${formData.name} en el inventario de la organización.`,
      payload: {
        status: formData.status ?? null,
        domain: formData.domain ?? null,
      },
      actor_user_id: user.id,
      created_at: now,
    },
    {
      ai_system_id: data.id,
      organization_id: membership.organization_id,
      event_type: 'classification_recalculated',
      event_title: 'Clasificación AI Act calculada',
      event_summary: classification?.label
        ? `El sistema quedó clasificado como ${classification.label.toLowerCase()}.`
        : 'Se recalculó la clasificación inicial del sistema.',
      payload: {
        risk_level: classification?.level ?? 'pending',
        basis: classification?.basis ?? null,
        obligations: classification?.obls ?? [],
      },
      actor_user_id: user.id,
      created_at: payload.aiact_classified_at,
    },
    {
      ai_system_id: data.id,
      organization_id: membership.organization_id,
      event_type: 'iso_recalculated',
      event_title: 'Madurez ISO 42001 calculada',
      event_summary: `Se registró un score inicial de ${iso.score}%.`,
      payload: {
        score: iso.score,
        implemented_checks: iso.checks.filter((check) => check.status === 'si').length,
        partial_checks: iso.checks.filter((check) => check.status === 'parcial' || check.status === 'proceso').length,
        pending_checks: iso.checks.filter((check) => !check.status || check.status === 'no').length,
      },
      actor_user_id: user.id,
      created_at: payload.iso_42001_updated_at,
    },
  ]);

  // Llamar al backend para crear el classification_event inicial y las system_obligations
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const agentUrl = process.env.AGENT_SERVER_URL || 'http://localhost:8001';
      await fetch(`${agentUrl}/api/v1/systems/${data.id}/classify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (classifyError) {
    // No bloquear el registro si la clasificación inicial falla — el usuario puede
    // relanzarla manualmente desde la vista de detalle del sistema.
    console.error('Error en clasificación inicial (no bloqueante):', classifyError);
  }

  revalidatePath('/inventario');
  return { success: true, id: data.id };
}
