import { notFound, redirect } from 'next/navigation';

import { computeCausalDegrees } from '@/lib/causal-graph/propagation';
import { buildSystemCausalGraph, type SystemCausalGraph } from '@/lib/causal-graph/system-graph';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

import {
  SystemDetailClient,
  type AisiaAssessmentEntry,
  type AisiaSectionEntry,
  type SoaControlState,
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
  const adminFluxion = createAdminFluxionClient();

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
      prohibited_uses,
      usage_scale,
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
      processes_personal_data,
      data_categories,
      special_categories,
      legal_bases,
      legal_bases_art9,
      intl_data_transfers,
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
      oss_model_name,
      oss_license,
      has_explainability,
      has_fine_tuning,
      has_external_tools,
      active_environments,
      mlops_integration,
      ai_owner,
      responsible_team,
      tech_lead,
      executive_sponsor,
      dpo_involved,
      has_sla,
      review_frequency,
      last_review_date,
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
      current_classification_event_id,
      tags,
      created_by,
      updated_by,
      created_at,
      updated_at
    `)
    .eq('organization_id', membership.organization_id)
    .eq('id', params.id)
    .single<SystemDetailData>();

  if (systemError || !system) notFound();

  // Historial de clasificaciones (versión, método, autor, fecha)
  const { data: classificationEventRows } = await fluxion
    .from('classification_events')
    .select('id, version, method, risk_level, risk_label, basis, reason, obligations_set, status, review_notes, created_by, created_at')
    .eq('ai_system_id', params.id)
    .order('version', { ascending: false });

  const { data: historyRows } = await fluxion
    .from('ai_system_history')
    .select('id, event_type, event_title, event_summary, payload, actor_user_id, created_at')
    .eq('organization_id', membership.organization_id)
    .eq('ai_system_id', params.id)
    .order('created_at', { ascending: false });

  const actorIds = Array.from(
    new Set([
      ...(historyRows ?? [])
        .map((row) => row.actor_user_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ...(classificationEventRows ?? [])
        .map((row) => row.created_by)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ])
  );

  const actorNames = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: profiles } = await fluxion
      .from('profiles')
      .select('id, user_id, full_name, display_name')
      .or(`id.in.(${actorIds.join(',')}),user_id.in.(${actorIds.join(',')})`);

    for (const profile of profiles ?? []) {
      const fullName = (profile.display_name || profile.full_name || '').trim();
      const name = fullName || 'Usuario';
      // Mapear tanto por profile.id como por user_id (auth UID)
      // porque distintos triggers guardan uno u otro en actor_user_id
      actorNames.set(profile.id, name);
      if (profile.user_id) actorNames.set(profile.user_id, name);
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

  const classificationEvents = (classificationEventRows ?? []).map((row) => ({
    id:              row.id as string,
    version:         row.version as number,
    method:          row.method as string,
    risk_level:      row.risk_level as string,
    risk_label:      row.risk_label as string,
    basis:           (row.basis ?? null) as string | null,
    reason:          (row.reason ?? null) as string | null,
    obligations_set: (row.obligations_set ?? []) as string[],
    status:          row.status as string,
    review_notes:    (row.review_notes ?? null) as string | null,
    created_by:      (row.created_by ?? null) as string | null,
    created_by_name: row.created_by ? actorNames.get(row.created_by) ?? 'Usuario' : null,
    created_at:      row.created_at as string,
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
      .select('id, full_name, display_name')
      .in('id', missingEvidenceActorIds);

    for (const profile of profiles ?? []) {
      const fullName = (profile.display_name || profile.full_name || '').trim();
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
      obligation_key,
      obligation_label,
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
    .is('archived_at', null)
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
      .select('id, full_name, display_name')
      .in('id', missingObligationActorIds);

    for (const profile of profiles ?? []) {
      const fullName = (profile.display_name || profile.full_name || '').trim();
      obligationNames.set(profile.id, fullName || 'Usuario');
    }
  }

  const evidenceStatusMap: Record<string, string> = {};
  for (const ev of evidences) {
    evidenceStatusMap[ev.id] = ev.status;
  }

  const obligationRecords: SystemObligationEntry[] = (obligationRows ?? []).map((row) => ({
    id: row.id,
    source_framework: row.source_framework,
    obligation_code: row.obligation_code ?? null,
    obligation_key: row.obligation_key ?? null,
    obligation_label: row.obligation_label ?? null,
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
      .select('id, full_name, display_name')
      .in('id', missingFailureModeCreatorIds);

    for (const profile of profiles ?? []) {
      const fullName = (profile.display_name || profile.full_name || '').trim();
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

  // ── AISIA — evaluación activa del sistema (draft o submitted primero; si no, la última aprobada) ──
  let aisia: AisiaAssessmentEntry | null = null;

  const { data: aisiaRow } = await fluxion
    .from('aisia_assessments')
    .select(`
      id,
      ai_system_id,
      status,
      version,
      title,
      created_by,
      submitted_at,
      approved_at,
      rejected_at,
      rejection_reason,
      created_at,
      updated_at,
      aisia_sections (
        id,
        assessment_id,
        section_code,
        data,
        status,
        last_generated_at,
        created_at,
        updated_at
      )
    `)
    .eq('ai_system_id', params.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aisiaRow) {
    // Resolver el nombre de quien lo creó
    let createdByName: string | null = null;
    if (aisiaRow.created_by) {
      const { data: creator } = await fluxion
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', aisiaRow.created_by)
        .single();
      if (creator) {
        createdByName = (creator.display_name || creator.full_name || '').trim() || 'Usuario';
      }
    }

    const sections: AisiaSectionEntry[] = ((aisiaRow.aisia_sections as AisiaSectionEntry[]) ?? [])
      .sort((a, b) => a.section_code.localeCompare(b.section_code));

    aisia = {
      id:               aisiaRow.id,
      ai_system_id:     aisiaRow.ai_system_id,
      status:           aisiaRow.status,
      version:          aisiaRow.version,
      title:            aisiaRow.title ?? null,
      created_by:       aisiaRow.created_by,
      created_by_name:  createdByName,
      submitted_at:     aisiaRow.submitted_at ?? null,
      approved_at:      aisiaRow.approved_at ?? null,
      rejected_at:      aisiaRow.rejected_at ?? null,
      rejection_reason: aisiaRow.rejection_reason ?? null,
      created_at:       aisiaRow.created_at,
      updated_at:       aisiaRow.updated_at,
      sections,
    };
  }

  // ── SoA — estado de controles Annexo A para este sistema ──
  const { data: soaControlRows } = await fluxion
    .from('organization_soa_controls')
    .select('id, control_code, is_applicable, status')
    .eq('organization_id', membership.organization_id);

  const soaControlIds = (soaControlRows ?? []).map((r) => r.id as string);
  const linkedSoaControlIdSet = new Set<string>();

  if (soaControlIds.length > 0) {
    const { data: linkRows } = await fluxion
      .from('organization_soa_system_links')
      .select('soa_control_id')
      .eq('ai_system_id', params.id)
      .in('soa_control_id', soaControlIds);

    for (const link of linkRows ?? []) {
      linkedSoaControlIdSet.add(link.soa_control_id as string);
    }
  }

  const soaControls: SoaControlState[] = (soaControlRows ?? []).map((r) => ({
    control_code:      r.control_code as string,
    is_applicable:     (r.is_applicable ?? false) as boolean,
    status:            (r.status ?? 'not_started') as string,
    linked_to_system:  linkedSoaControlIdSet.has(r.id as string),
  }));

  // ── SoA Scope — determinar si este sistema está en el alcance de la SoA org ──
  const { data: soaMetadata } = await adminFluxion
    .from('organization_soa_metadata')
    .select('scope_system_tags')
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  const soaScopeSystemTags: string[] = (soaMetadata?.scope_system_tags as string[] | null) ?? [];
  const systemTags: string[] = (system as unknown as { tags?: string[] }).tags ?? [];
  const isInSoaScope =
    soaScopeSystemTags.length > 0 &&
    systemTags.some((tag) => soaScopeSystemTags.includes(tag));

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
      classificationEvents={classificationEvents}
      evidences={evidences}
      evidenceStatusMap={evidenceStatusMap}
      obligationRecords={obligationRecords}
      failureModes={failureModes}
      systemGraph={systemGraph}
      treatmentPlanData={treatmentPlanData}
      aisia={aisia}
      soaControls={soaControls}
      isInSoaScope={isInSoaScope}
      soaScopeSystemTags={soaScopeSystemTags}
    />
  );
}
