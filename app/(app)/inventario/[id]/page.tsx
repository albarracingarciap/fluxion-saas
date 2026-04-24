import { notFound, redirect } from 'next/navigation';

import { computeCausalDegrees } from '@/lib/causal-graph/propagation';
import { buildSystemCausalGraph, type SystemCausalGraph } from '@/lib/causal-graph/system-graph';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import {
  SystemDetailClient,
  type SystemDetailData,
  type SystemEvidenceEntry,
  type SystemFailureModeEntry,
  type SystemHistoryEntry,
  type SystemObligationEntry,
} from './system-detail-client';

export default async function SystemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const compliance = createComplianceClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership, error: memberError } = await fluxion
    .from('profiles')
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
      intended_use,
      output_type,
      fully_automated,
      interacts_persons,
      target_users,
      geo_scope,
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
      aiact_obligations,
      aiact_classified_at,
      aiact_classified_by,
      training_data_doc,
      data_sources,
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
      tech_lead,
      executive_sponsor,
      dpo_involved,
      review_frequency,
      incident_contact,
      critical_providers,
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
      next_audit_date,
      iso_42001_score,
      iso_42001_checks,
      iso_42001_updated_at,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq('organization_id', membership.organization_id)
    .eq('id', params.id)
    .single<SystemDetailData>();

  if (systemError || !system) notFound();

  const { data: historyRows } = await fluxion
    .from('ai_system_history')
    .select('id, event_type, event_title, event_summary, payload, actor_user_id, created_at')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .order('created_at', { ascending: false });

  const actorIds = Array.from(
    new Set(
      (historyRows ?? [])
        .map((row) => row.actor_user_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const actorNames = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profiles } = await fluxion
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', actorIds);

    for (const profile of profiles ?? []) {
      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
      actorNames.set(profile.id, fullName || 'Usuario');
    }
  }

  const history: SystemHistoryEntry[] = (historyRows ?? []).map((row) => ({
    id: row.id,
    event_type: row.event_type,
    event_title: row.event_title,
    event_summary: row.event_summary,
    payload: row.payload ?? {},
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_user_id ? actorNames.get(row.actor_user_id) ?? 'Usuario' : null,
    created_at: row.created_at,
    synthetic: false,
  }));

  const { data: evidenceRows } = await fluxion
    .from('system_evidences')
    .select(`
      id,
      title,
      description,
      evidence_type,
      status,
      storage_path,
      external_url,
      version,
      owner_user_id,
      reviewed_by,
      issued_at,
      expires_at,
      reviewed_at,
      validation_notes,
      created_at,
      updated_at
    `)
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .order('created_at', { ascending: false });

  const evidenceActorIds = Array.from(
    new Set(
      (evidenceRows ?? []).flatMap((row) =>
        [row.owner_user_id, row.reviewed_by].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      )
    )
  );

  const evidenceNames = new Map<string, string>(actorNames);

  const missingEvidenceActorIds = evidenceActorIds.filter((id) => !evidenceNames.has(id));
  if (missingEvidenceActorIds.length > 0) {
    const { data: profiles } = await fluxion
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', missingEvidenceActorIds);

    for (const profile of profiles ?? []) {
      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
      evidenceNames.set(profile.id, fullName || 'Usuario');
    }
  }

  const evidenceIds = (evidenceRows ?? []).map((row) => row.id);
  const obligationLinksCount = new Map<string, number>();

  if (evidenceIds.length > 0) {
    const { data: linkRows } = await fluxion
      .from('system_obligation_evidences')
      .select('evidence_id')
      .in('evidence_id', evidenceIds);

    for (const link of linkRows ?? []) {
      const current = obligationLinksCount.get(link.evidence_id) ?? 0;
      obligationLinksCount.set(link.evidence_id, current + 1);
    }
  }

  const evidences: SystemEvidenceEntry[] = (evidenceRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    evidence_type: row.evidence_type,
    status: row.status,
    storage_path: row.storage_path,
    external_url: row.external_url,
    version: row.version,
    owner_user_id: row.owner_user_id,
    owner_name: row.owner_user_id ? evidenceNames.get(row.owner_user_id) ?? 'Usuario' : null,
    reviewed_by: row.reviewed_by,
    reviewer_name: row.reviewed_by ? evidenceNames.get(row.reviewed_by) ?? 'Usuario' : null,
    issued_at: row.issued_at,
    expires_at: row.expires_at,
    reviewed_at: row.reviewed_at,
    validation_notes: row.validation_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    linked_obligations_count: obligationLinksCount.get(row.id) ?? 0,
  }));

  const { data: obligationRows } = await fluxion
    .from('system_obligations')
    .select(`
      id,
      source_framework,
      obligation_code,
      title,
      description,
      status,
      priority,
      owner_user_id,
      due_date,
      notes,
      resolution_notes,
      resolved_at,
      resolved_by,
      created_at,
      updated_at
    `)
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .order('created_at', { ascending: false });

  const obligationIds = (obligationRows ?? []).map((row) => row.id);
  const obligationEvidenceIds = new Map<string, string[]>();

  if (obligationIds.length > 0) {
    const { data: relationRows } = await fluxion
      .from('system_obligation_evidences')
      .select('obligation_id, evidence_id')
      .in('obligation_id', obligationIds);

    for (const relation of relationRows ?? []) {
      const current = obligationEvidenceIds.get(relation.obligation_id) ?? [];
      current.push(relation.evidence_id);
      obligationEvidenceIds.set(relation.obligation_id, current);
    }
  }

  const obligationActorIds = Array.from(
    new Set(
      (obligationRows ?? []).flatMap((row) =>
        [row.owner_user_id, row.resolved_by].filter(
          (value): value is string => typeof value === 'string' && value.length > 0
        )
      )
    )
  );

  const obligationNames = new Map<string, string>(evidenceNames);
  const missingObligationActorIds = obligationActorIds.filter((id) => !obligationNames.has(id));
  if (missingObligationActorIds.length > 0) {
    const { data: profiles } = await fluxion
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', missingObligationActorIds);

    for (const profile of profiles ?? []) {
      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
      obligationNames.set(profile.id, fullName || 'Usuario');
    }
  }

  const obligationRecords: SystemObligationEntry[] = (obligationRows ?? []).map((row) => ({
    id: row.id,
    source_framework: row.source_framework,
    obligation_code: row.obligation_code,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    owner_user_id: row.owner_user_id,
    owner_name: row.owner_user_id ? obligationNames.get(row.owner_user_id) ?? 'Usuario' : null,
    due_date: row.due_date,
    notes: row.notes,
    resolution_notes: row.resolution_notes,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolved_by_name: row.resolved_by ? obligationNames.get(row.resolved_by) ?? 'Usuario' : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    evidence_ids: obligationEvidenceIds.get(row.id) ?? [],
  }));

  const { data: failureModeRows } = await fluxion
    .from('system_failure_modes')
    .select(`
      id,
      failure_mode_id,
      dimension_id,
      activation_source,
      activation_reason,
      activation_family_ids,
      activation_family_labels,
      priority_status,
      priority_source,
      priority_notes,
      priority_score,
      priority_level,
      created_by,
      created_at,
      updated_at
    `)
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .order('dimension_id', { ascending: true })
    .order('created_at', { ascending: true });

  const failureModeCreatorIds = Array.from(
    new Set(
      (failureModeRows ?? [])
        .map((row) => row.created_by)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const failureModeNames = new Map<string, string>(obligationNames);
  const missingFailureModeCreatorIds = failureModeCreatorIds.filter((id) => !failureModeNames.has(id));

  if (missingFailureModeCreatorIds.length > 0) {
    const { data: profiles } = await fluxion
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', missingFailureModeCreatorIds);

    for (const profile of profiles ?? []) {
      const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
      failureModeNames.set(profile.id, fullName || 'Usuario');
    }
  }

  const failureModeIds = (failureModeRows ?? []).map((row) => row.failure_mode_id);
  const failureModeCatalog = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      description: string | null;
      dimension_id: string;
      bloque: string | null;
      subcategoria: string | null;
      tipo: string | null;
      s_default: number | null;
    }
  >();

  if (failureModeIds.length > 0) {
    const { data: catalogRows } = await compliance
      .from('failure_modes')
      .select('id, code, name, description, dimension_id, bloque, subcategoria, tipo, s_default')
      .in('id', failureModeIds);

    for (const row of catalogRows ?? []) {
      failureModeCatalog.set(row.id, row);
    }
  }

  const failureModesBase = (failureModeRows ?? [])
    .map((row) => {
      const catalog = failureModeCatalog.get(row.failure_mode_id);
      if (!catalog) return null;

      return {
        id: row.id,
        failure_mode_id: row.failure_mode_id,
        code: catalog.code,
        name: catalog.name,
        description: catalog.description,
        dimension_id: catalog.dimension_id,
        bloque: catalog.bloque,
        subcategoria: catalog.subcategoria,
        tipo: catalog.tipo,
        s_default: catalog.s_default,
        activation_source: row.activation_source,
        activation_reason: row.activation_reason,
        activation_family_ids: row.activation_family_ids ?? [],
        activation_family_labels: row.activation_family_labels ?? [],
        priority_status: row.priority_status,
        priority_source: row.priority_source,
        priority_notes: row.priority_notes,
        priority_score: row.priority_score,
        priority_level: row.priority_level,
        created_by: row.created_by,
        created_by_name: row.created_by ? failureModeNames.get(row.created_by) ?? 'Usuario' : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        causal_out_degree: null as number | null,
        causal_in_degree: null as number | null,
      };
    })
    .filter((row) => row !== null);

  // Enrich failure modes with causal propagation degrees + build system graph (parallel)
  const [causalDegrees, systemGraph] = await Promise.all([
    computeCausalDegrees(failureModesBase.map((fm) => fm.failure_mode_id)),
    buildSystemCausalGraph(params.id, membership.organization_id),
  ]);

  const failureModes = failureModesBase.map((fm) => {
    const degrees = causalDegrees.get(fm.failure_mode_id);
    if (!degrees) return fm;
    return {
      ...fm,
      causal_out_degree: degrees.outDegree,
      causal_in_degree: degrees.inDegree,
    };
  });

  // Fetch treatment plan data for the latest evaluation
  const { data: latestEvaluation } = await fluxion
    .from('fmea_evaluations')
    .select('id')
    .eq('system_id', params.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  let treatmentPlanData = null;
  if (latestEvaluation) {
    const { buildTreatmentPlanData } = await import('@/lib/fmea/treatment-plan');
    treatmentPlanData = await buildTreatmentPlanData({
      organizationId: membership.organization_id,
      aiSystemId: params.id,
      evaluationId: latestEvaluation.id,
    });
  }

  return (
    <SystemDetailClient
      system={system}
      organizationId={membership.organization_id}
      history={history}
      evidences={evidences}
      obligationRecords={obligationRecords}
      failureModes={failureModes}
      systemGraph={systemGraph}
      treatmentPlanData={treatmentPlanData}
    />
  );
}
