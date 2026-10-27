'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { syncCeaseUseTasks } from '@/lib/ai-act/cease-use-server';
import { callClassificationService, classificationColumns, classifyWithCatalog, enginePayload, loadAiActCatalog } from '@/lib/ai-act/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { normalizeOutputTypes } from '@/lib/ai-systems/output-types';
import { deploymentWarning, prohibitedStatusError } from '@/lib/evaluation-status/deployment';
import { loadSystemStages } from '@/lib/evaluation-status/load';

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

  // Alta desde un cuestionario preliminar (B13c): tiene que ser de la
  // organización, estar completado y no tener sistema vinculado (RN-W01, RN-W12).
  const questionnaireId = typeof formData.questionnaireId === 'string' ? formData.questionnaireId : null;
  let cuestionario: { id: string; title: string; classification: { result?: { display?: { label?: string }; level?: string | null } } | null } | null = null;
  if (questionnaireId) {
    const { data: q } = await fluxion
      .from('preliminary_questionnaires')
      .select('id, title, status, ai_system_id, classification')
      .eq('organization_id', membership.organization_id)
      .eq('id', questionnaireId)
      .maybeSingle();
    if (!q) return { error: 'No se encontró el cuestionario de origen.' };
    if (q.status !== 'completado') return { error: 'El cuestionario de origen no está completado.' };
    if (q.ai_system_id) return { error: 'El cuestionario de origen ya tiene un sistema vinculado.' };
    cuestionario = q;
  }

  // Motor único (B13a): con los supuestos AI Act si los hay; si no, por dominio y tipo de output.
  const classification = classifyWithCatalog({
    inputs: formData.aiactInputs ?? null,
    fields: formData,
    roles: Array.isArray(formData.valueChainRoles) ? formData.valueChainRoles : [],
    catalog: await loadAiActCatalog(),
  });
  const cls = classification.result;

  // B18b: una práctica prohibida no se da de alta en Producción ni en Piloto.
  const bloqueo = prohibitedStatusError(formData.status, [cls.level]);
  if (bloqueo) return { error: bloqueo };

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
    // Todos los tipos marcados; el principal (output_type) lo fija el trigger (TODO 78).
    output_types: normalizeOutputTypes(formData.outputTypes, formData.outputType),
    fully_automated: formData.fullyAutomated ?? null,
    interacts_persons: formData.interactsPersons ?? false,
    target_users: formData.targetUsers ?? [],
    usage_scale: USAGE_SCALE_MAP[formData.usageScale] ?? null,
    geo_scope: formData.geoScope ?? [],

    // Step 3 — AI Act classification
    is_ai_system: formData.isAISystem ?? null,
    // Con supuestos, la práctica prohibida la decide el motor.
    prohibited_practice: cls.method === 'supuestos' ? cls.level === 'prohibited' : (formData.prohibitedPractice ?? false),
    affects_persons: formData.affectsPersons ?? null,
    vulnerable_groups: formData.vulnerableGroups ?? false,
    involves_minors: formData.hasMinors ?? false,
    uses_biometric_data: formData.biometric ?? false,
    manages_critical_infra: formData.criticalInfra ?? false,
    ...classificationColumns(classification),
    aiact_inputs: formData.aiactInputs ?? null,
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
    // Igual que en la edicion: el rol determina que obligaciones aplican, y se
    // declara por sistema porque el Art. 25 puede cambiarlo.
    value_chain_roles: Array.isArray(formData.valueChainRoles) ? formData.valueChainRoles : [],
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

  // RN-W09: vínculo con el cuestionario en la misma operación. Solo si sigue
  // sin vincular; si otra persona lo vinculó entretanto, el alta se deshace.
  if (cuestionario) {
    const { data: vinculado } = await fluxion
      .from('preliminary_questionnaires')
      .update({ ai_system_id: data.id })
      .eq('id', cuestionario.id)
      .eq('organization_id', membership.organization_id)
      .is('ai_system_id', null)
      .select('id');
    if (!vinculado || vinculado.length === 0) {
      await fluxion.from('ai_systems').delete().eq('id', data.id).eq('organization_id', membership.organization_id);
      return { error: 'No se pudo vincular el cuestionario: ya tiene un sistema. No se ha registrado el sistema.' };
    }
  }

  await insertAiSystemHistoryEvents(fluxion, [
    ...(cuestionario ? [{
      ai_system_id: data.id,
      organization_id: membership.organization_id,
      event_type: 'system_registered_from_questionnaire',
      event_title: 'Sistema registrado desde el cuestionario preliminar',
      event_summary: `Registrado desde el cuestionario «${cuestionario.title}». Clasificación preliminar: `
        + `${cuestionario.classification?.result?.display?.label ?? 'sin guardar'}; clasificación al registrar: ${cls.display.label}.`,
      payload: {
        questionnaire_id: cuestionario.id,
        preliminary: cuestionario.classification?.result?.display?.label ?? null,
        preliminary_level: cuestionario.classification?.result?.level ?? null,
        final: cls.display.label,
        final_level: cls.level,
      },
      actor_user_id: user.id,
      created_at: now,
    }] : []),
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
      event_summary: `El sistema quedó clasificado como ${cls.display.label.toLowerCase()}`
        + (cls.method === 'respaldo' ? ' (aproximación sin supuestos AI Act).' : '.'),
      payload: {
        risk_level: cls.level ?? 'pending',
        scope: cls.scope,
        basis: cls.display.basis,
        method: cls.method,
        rules_version: cls.rulesVersion,
        obligations: classification.obligations.map((o) => o.code),
      },
      actor_user_id: user.id,
      created_at: payload.aiact_classified_at,
    },
  ]);

  // Llamar al backend para crear el classification_event inicial y las system_obligations.
  // Si falla, el alta no se deshace: se avisa y la ficha permite recuperarlo con
  // «✏ Revisar clasificación», que propone todas las obligaciones (B13e).
  let clasificacionInicial: 'registrada' | 'no_disponible' = 'no_disponible';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // El servicio registra el evento inicial y las obligaciones sugeridas con
      // el resultado del motor único; ya no clasifica por su cuenta (B13a).
      const res = await callClassificationService({
        path: `/api/v1/systems/${data.id}/classify`,
        accessToken: session.access_token,
        body: { classification: enginePayload(classification) },
      });
      if (res.ok) clasificacionInicial = 'registrada';
      else console.error('Clasificación inicial no registrada:', res.status, res.data);
    }
  } catch (classifyError) {
    console.error('Error en clasificación inicial (no bloqueante):', classifyError);
  }

  // B18b (decisión 2): de alta directamente en Producción sin el plan de
  // despliegue completo: aviso, sin bloquear, y constancia en el historial.
  let aviso: string | null = null;
  if (formData.status === 'produccion') {
    const [fila] = await loadSystemStages(fluxion, membership.organization_id, [data.id]);
    aviso = deploymentWarning(fila?.deployment ?? null);
    if (aviso && fila?.deployment) {
      await insertAiSystemHistoryEvents(fluxion, [{
        ai_system_id: data.id,
        organization_id: membership.organization_id,
        event_type: 'deployment_plan_incomplete',
        event_title: 'Alta en producción sin completar el plan de despliegue',
        event_summary: `Faltaba: ${fila.deployment.missing.map((i) => i.label).join('; ')}.`,
        payload: { missing: fila.deployment.missing.map((i) => i.key) },
        actor_user_id: user.id,
      }]);
    }
  }

  // B27: una práctica prohibida abre la tarea «Cesar el uso».
  await syncCeaseUseTasks(membership.organization_id, [data.id]);

  revalidatePath('/inventario');
  return { success: true, id: data.id, clasificacionInicial, deploymentWarning: aviso };
}
