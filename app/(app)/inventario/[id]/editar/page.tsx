import { notFound, redirect } from 'next/navigation';

import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import EditSystemClient from './edit-system-client';

const DATA_VOLUME_MAP: Record<string, string> = {
  menos_1gb: '<1 GB',
  '1_100gb': '1-100 GB',
  '100gb_1tb': '100 GB - 1 TB',
  '1_10tb': '1-10 TB',
  mas_10tb: '>10 TB',
  desconocido: 'Desconocido',
};

const DATA_RETENTION_MAP: Record<string, string> = {
  menos_6m: '<6 meses',
  '6_12m': '6-12 meses',
  '1_3a': '1-3 años',
  '3_5a': '3-5 años',
  mas_5a: '>5 años',
  sin_politica: 'Sin política definida',
};

const USAGE_SCALE_MAP: Record<string, string> = {
  menos_100m: '<100 decisiones/mes',
  '100_1k_m': '100-1.000/mes',
  '1k_10k_m': '1.000-10.000/mes',
  '10k_100k_m': '10.000-100.000/mes',
  mas_100k_m: '>100.000/mes',
};

const CERT_STATUS_MAP: Record<string, string> = {
  declaracion_emitida: 'Declaración de conformidad emitida',
  en_evaluacion: 'En proceso de evaluación',
  certificacion_ce: 'Certificación CE obtenida',
  pendiente: 'Pendiente de iniciar',
  no_aplica: 'No aplica',
};

const RESIDUAL_RISK_MAP: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  muy_alto: 'Muy alto',
  no_determinado: 'No determinado',
};

export default async function EditSystemPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership, error: memberError } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership && memberError?.code === 'PGRST116') redirect('/onboarding');
  if (memberError || !membership) notFound();

  const { data: system, error: systemError } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      version,
      internal_id,
      domain,
      status,
      deployed_at,
      description,
      technical_description,
      tags,
      intended_use,
      prohibited_uses,
      output_type,
      fully_automated,
      interacts_persons,
      target_users,
      usage_scale,
      geo_scope,
      is_ai_system,
      is_gpai,
      prohibited_practice,
      affects_persons,
      vulnerable_groups,
      uses_biometric_data,
      manages_critical_infra,
      involves_minors,
      processes_personal_data,
      data_categories,
      special_categories,
      legal_bases,
      data_sources,
      training_data_doc,
      data_volume,
      data_retention,
      dpia_completed,
      ai_system_type,
      base_model,
      external_model,
      external_provider,
      frameworks,
      provider_origin,
      has_fine_tuning,
      has_external_tools,
      active_environments,
      mlops_integration,
      ai_owner,
      responsible_team,
      dpo_involved,
      tech_lead,
      executive_sponsor,
      critical_providers,
      review_frequency,
      has_sla,
      incident_contact,
      has_tech_doc,
      has_logging,
      has_human_oversight,
      oversight_type,
      has_complaint_mechanism,
      has_risk_assessment,
      residual_risk,
      mitigation_notes,
      has_adversarial_test,
      cert_status,
      next_audit_date
    `)
    .eq('organization_id', membership.organization_id)
    .eq('id', params.id)
    .single();

  if (systemError || !system) notFound();

  const initialForm = {
    name: system.name ?? '',
    version: system.version ?? '1.0.0',
    internalId: system.internal_id ?? '',
    domain: system.domain ?? '',
    status: system.status ?? '',
    deployedAt: system.deployed_at ?? '',
    description: system.description ?? '',
    technicalDesc: system.technical_description ?? '',
    intendedUse: system.intended_use ?? '',
    prohibitedUses: system.prohibited_uses ?? '',
    outputType: system.output_type ?? '',
    fullyAutomated: system.fully_automated,
    interactsPersons: system.interacts_persons ?? false,
    targetUsers: system.target_users ?? [],
    usageScale: system.usage_scale ? USAGE_SCALE_MAP[system.usage_scale] ?? '' : '',
    geoScope: system.geo_scope ?? [],
    isAISystem: system.is_ai_system,
    isGPAI: system.is_gpai ?? false,
    prohibitedPractice: system.prohibited_practice ?? false,
    affectsPersons: system.affects_persons,
    vulnerableGroups: system.vulnerable_groups ?? false,
    biometric: system.uses_biometric_data ?? false,
    criticalInfra: system.manages_critical_infra ?? false,
    hasMinors: system.involves_minors ?? false,
    processesPersonalData: system.processes_personal_data,
    dataCategories: system.data_categories ?? [],
    specialCategories: system.special_categories ?? [],
    legalBases: system.legal_bases ?? [],
    dataSources: system.data_sources ?? [],
    trainingDataDoc: system.training_data_doc ?? null,
    dataVolume: system.data_volume ? DATA_VOLUME_MAP[system.data_volume] ?? '' : '',
    dataRetention: system.data_retention ? DATA_RETENTION_MAP[system.data_retention] ?? '' : '',
    dpiaCompleted: system.dpia_completed ?? null,
    aiSystemType: system.ai_system_type ?? '',
    baseModel: system.base_model ?? '',
    externalModel: system.external_model ?? '',
    extProvider: system.external_provider ?? '',
    frameworks: system.frameworks ?? '',
    origin: system.provider_origin ?? '',
    hasFineTuning: system.has_fine_tuning ?? false,
    hasExternalTools: system.has_external_tools ?? false,
    environments: system.active_environments ?? [],
    mlopsIntegration: system.mlops_integration ?? '',
    aiOwner: system.ai_owner ?? '',
    responsibleTeam: system.responsible_team ?? '',
    dpoInvolved: system.dpo_involved ?? false,
    techLead: system.tech_lead ?? '',
    executiveSponsor: system.executive_sponsor ?? '',
    criticalProviders: system.critical_providers ?? '',
    reviewFrequency: system.review_frequency ?? '',
    hasSLA: system.has_sla ?? false,
    incidentContact: system.incident_contact ?? '',
    hasTechDoc: system.has_tech_doc ?? null,
    hasLogging: system.has_logging ?? null,
    humanOversight: system.has_human_oversight ?? null,
    oversightType: system.oversight_type ?? '',
    hasComplaintMechanism: system.has_complaint_mechanism ?? false,
    hasRiskAssessment: system.has_risk_assessment ?? null,
    residualRisk: system.residual_risk ? RESIDUAL_RISK_MAP[system.residual_risk] ?? '' : '',
    mitigationNotes: system.mitigation_notes ?? '',
    hasAdversarialTest: system.has_adversarial_test ?? false,
    certStatus: system.cert_status ? CERT_STATUS_MAP[system.cert_status] ?? '' : '',
    nextAudit: system.next_audit_date ?? '',
  };

  return (
    <EditSystemClient
      systemId={system.id}
      systemName={system.name}
      initialForm={initialForm}
      initialTags={system.tags ?? []}
    />
  );
}
