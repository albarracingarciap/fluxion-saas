'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { callClassificationService, classificationColumns, classifyWithCatalog, enginePayload, loadAiActCatalog } from '@/lib/ai-act/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { normalizeOutputTypes } from '@/lib/ai-systems/output-types';
import { deploymentWarning, prohibitedStatusError } from '@/lib/evaluation-status/deployment';
import { loadSystemStages } from '@/lib/evaluation-status/load';
import { registerReevaluation } from '@/lib/evaluation-status/reevaluation-server';

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

/** JSON con las claves ordenadas, para comparar supuestos sin depender del orden. */
function jsonEstable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonEstable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as Record<string, unknown>).sort()
      .map((k) => `${JSON.stringify(k)}:${jsonEstable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateAISystem(formData: Record<string, any>) {
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

  const classification = classifyWithCatalog({
    inputs: formData.aiactInputs ?? null,
    fields: formData,
    roles: Array.isArray(formData.valueChainRoles) ? formData.valueChainRoles : [],
    catalog: await loadAiActCatalog(),
  });
  const cls = classification.result;

  // Build the insert payload mapping wizard fields → DB columns
  const payload = {
    organization_id: membership.organization_id,

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
    affects_persons: formData.affectsPersons ?? null,
    vulnerable_groups: formData.vulnerableGroups ?? false,
    involves_minors: formData.hasMinors ?? false,
    uses_biometric_data: formData.biometric ?? false,
    manages_critical_infra: formData.criticalInfra ?? false,

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
    // Rol en la cadena de valor: determina que articulos del Reglamento
    // obligan a esta organizacion sobre ESTE sistema. Va por sistema y no por
    // organizacion porque el Art. 25 puede cambiarlo sin que nadie lo note.
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
    critical_providers: Array.isArray(formData.criticalProviders)
      ? formData.criticalProviders.join(', ')
      : (formData.criticalProviders || null),

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

  const systemId = typeof formData.id === 'string' ? formData.id : null;
  if (!systemId) {
    return { error: 'Falta el identificador del sistema a actualizar.' };
  }

  const { data: previo } = await fluxion
    .from('ai_systems')
    .select('status, aiact_result, aiact_risk_level, aiact_inputs')
    .eq('id', systemId)
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  // B18b: una práctica prohibida no se pone en Producción ni en Piloto. Cuenta
  // la clasificación vigente y la que resulta de los datos editados.
  const nivelVigente = (previo?.aiact_result as { level?: string | null } | null)?.level ?? (previo?.aiact_risk_level as string | null) ?? null;
  const bloqueo = prohibitedStatusError(formData.status, [nivelVigente, cls.level]);
  if (bloqueo) return { error: bloqueo };

  const { data, error } = await fluxion
    .from('ai_systems')
    .update({
      ...payload,
      updated_by: user.id,
    })
    .eq('id', systemId)
    .eq('organization_id', membership.organization_id)
    .select('id')
    .single();

  if (error) {
    console.error('updateAISystem error:', error);
    return { error: error.message };
  }

  // La clasificación no se sobrescribe al editar (B13a, I17): se propone. El
  // servicio compara con la vigente; si cambia el nivel o las obligaciones,
  // abre una reclasificación que se concilia en la ficha. Si no cambia, se
  // actualiza su detalle (fundamento, versión de las reglas, supuestos).
  let reclasificacion: 'propuesta' | 'sin_cambios' | 'pendiente_previa' | 'no_disponible' = 'no_disponible';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const res = await callClassificationService({
        path: `/api/v1/systems/${systemId}/reclassify`,
        accessToken: session.access_token,
        body: {
          classification: enginePayload(classification),
          factors: { origen: 'edicion' },
          review_notes: 'Propuesta al editar la ficha del sistema.',
        },
      });
      const body = res.data as { data?: { has_changes?: boolean } } | null;
      if (res.status === 409) reclasificacion = 'pendiente_previa';
      else if (res.ok) reclasificacion = body?.data?.has_changes ? 'propuesta' : 'sin_cambios';
    }
  } catch (e) {
    console.error('updateAISystem · reclasificación (no bloqueante):', e);
  }

  if (reclasificacion === 'sin_cambios') {
    await fluxion
      .from('ai_systems')
      .update({
        ...classificationColumns(classification),
        aiact_inputs: formData.aiactInputs ?? null,
        prohibited_practice: cls.level === 'prohibited' || (cls.method === 'respaldo' && Boolean(formData.prohibitedPractice)),
        aiact_classified_at: now,
        aiact_classified_by: user.id,
      })
      .eq('id', systemId)
      .eq('organization_id', membership.organization_id);
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: systemId,
      organization_id: membership.organization_id,
      event_type: 'system_updated',
      event_title: 'Ficha del sistema actualizada',
      event_summary: `Se actualizaron los datos principales de ${formData.name}.`,
      payload: {
        status: formData.status ?? null,
        domain: formData.domain ?? null,
      },
      actor_user_id: user.id,
    },
    ...(reclasificacion === 'propuesta' ? [{
      ai_system_id: systemId,
      organization_id: membership.organization_id,
      event_type: 'classification_proposed',
      event_title: 'Reclasificación AI Act propuesta',
      event_summary: `Con los datos editados, el motor propone ${cls.display.label.toLowerCase()}. Pendiente de conciliar en la ficha.`,
      payload: {
        risk_level: cls.level,
        scope: cls.scope,
        basis: cls.display.basis,
        rules_version: cls.rulesVersion,
        obligations: classification.obligations.map((o) => o.code),
      },
      actor_user_id: user.id,
    }] : []),
  ]);

  // B21a: cambiar los supuestos AI Act de un sistema que ya los tenía abre una
  // reevaluación. La primera vez que se rellenan no es un cambio.
  if (previo?.aiact_inputs && formData.aiactInputs && jsonEstable(previo.aiact_inputs) !== jsonEstable(formData.aiactInputs)) {
    await registerReevaluation({
      organizationId: membership.organization_id,
      systemId,
      key: 'supuestos_aiact',
      sourceRef: null,
      detail: 'se han cambiado los supuestos AI Act en la ficha.',
      actorUserId: user.id,
    });
  }

  // B18b (decisión 2): pasar a Producción sin completar el plan de despliegue
  // avisa, no bloquea. Queda en el historial con lo que faltaba.
  let aviso: string | null = null;
  if (formData.status === 'produccion' && previo?.status !== 'produccion') {
    const [fila] = await loadSystemStages(fluxion, membership.organization_id, [systemId]);
    aviso = deploymentWarning(fila?.deployment ?? null);
    if (aviso && fila?.deployment) {
      await insertAiSystemHistoryEvents(fluxion, [{
        ai_system_id: systemId,
        organization_id: membership.organization_id,
        event_type: 'deployment_plan_incomplete',
        event_title: 'Paso a producción sin completar el plan de despliegue',
        event_summary: `Faltaba: ${fila.deployment.missing.map((i) => i.label).join('; ')}.`,
        payload: { missing: fila.deployment.missing.map((i) => i.key) },
        actor_user_id: user.id,
      }]);
    }
  }

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${systemId}`);
  return { success: true, id: data.id, reclasificacion, deploymentWarning: aviso };
}
