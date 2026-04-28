import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { AisiaWizardClient } from './aisia-wizard-client';
import type { AisiaAssessmentEntry, AisiaSectionEntry } from '../../system-detail-client';

export default async function AisiaWizardPage({
  params,
}: {
  params: { id: string; assessmentId: string };
}) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/login');

  // Verificar sistema
  const { data: system } = await fluxion
    .from('ai_systems')
    .select(`
      id, name, version, description, technical_description,
      intended_use, prohibited_uses, output_type,
      fully_automated, interacts_persons, target_users,
      usage_scale, geo_scope, ai_system_type,
      base_model, external_model, external_provider,
      oss_model_name, frameworks, provider_origin,
      processes_personal_data, data_categories, special_categories,
      legal_bases, data_sources, data_volume, data_retention,
      dpia_completed, ai_owner, responsible_team, tech_lead,
      dpo_involved, affects_persons, vulnerable_groups, involves_minors
    `)
    .eq('id', params.id)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!system) notFound();

  // Verificar evaluación
  const { data: aisiaRow } = await fluxion
    .from('aisia_assessments')
    .select(`
      id, ai_system_id, status, version, title,
      created_by, submitted_at, approved_at, rejected_at,
      rejection_reason, created_at, updated_at,
      aisia_sections (
        id, assessment_id, section_code, data,
        status, last_generated_at, created_at, updated_at
      )
    `)
    .eq('id', params.assessmentId)
    .eq('ai_system_id', params.id)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!aisiaRow) notFound();

  // Solo se puede editar en borrador
  if (aisiaRow.status !== 'draft') {
    redirect(`/inventario/${params.id}?tab=ISO+42001`);
  }

  const sections: AisiaSectionEntry[] = (
    (aisiaRow.aisia_sections as AisiaSectionEntry[]) ?? []
  ).sort((a, b) => a.section_code.localeCompare(b.section_code));

  const aisia: AisiaAssessmentEntry = {
    id:               aisiaRow.id,
    ai_system_id:     aisiaRow.ai_system_id,
    status:           aisiaRow.status,
    version:          aisiaRow.version,
    title:            aisiaRow.title ?? null,
    created_by:       aisiaRow.created_by,
    created_by_name:  null,
    submitted_at:     aisiaRow.submitted_at ?? null,
    approved_at:      aisiaRow.approved_at ?? null,
    rejected_at:      aisiaRow.rejected_at ?? null,
    rejection_reason: aisiaRow.rejection_reason ?? null,
    created_at:       aisiaRow.created_at,
    updated_at:       aisiaRow.updated_at,
    sections,
  };

  // Modos de fallo del sistema (para S3)
  const { data: failureModeRows } = await fluxion
    .from('system_failure_modes')
    .select('id, failure_mode_id, dimension_id, activation_source, priority_level, priority_score')
    .eq('ai_system_id', params.id)
    .eq('organization_id', profile.organization_id)
    .order('dimension_id');

  // Plan de tratamiento activo (para S4)
  const { data: treatmentPlanRows } = await fluxion
    .from('treatment_plans')
    .select('id, code, status, zone_at_creation, zone_target, actions_total, actions_completed, residual_risk_notes')
    .eq('system_id', params.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-ltbg">
      {/* ── Breadcrumb header ── */}
      <div className="border-b border-ltb bg-ltcard px-6 py-3 flex items-center gap-3">
        <Link
          href={`/inventario/${params.id}?tab=ISO+42001`}
          className="font-plex text-[12px] text-lttm hover:text-ltt transition-colors"
        >
          ← {system.name}
        </Link>
        <span className="text-lttm text-[12px]">/</span>
        <span className="font-plex text-[12px] text-ltt font-medium">
          Evaluación AISIA v{aisia.version}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-plex text-[10.5px] bg-ltcard2 text-lttm border border-ltb">
          <span className="w-1.5 h-1.5 rounded-full bg-lttm inline-block" />
          Borrador
        </span>
      </div>

      <AisiaWizardClient
        aisia={aisia}
        system={system as Record<string, unknown>}
        failureModes={failureModeRows ?? []}
        treatmentPlans={treatmentPlanRows ?? []}
      />
    </div>
  );
}
