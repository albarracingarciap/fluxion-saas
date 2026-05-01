'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { revalidatePath } from 'next/cache';

import type { RiskAppetite } from '@/lib/organization/options';

interface SgaiSettings {
  sgai_responsible?: string
  sgai_email?: string
  fiscal_year_start?: number
  report_language?: string
  brand_primary_color?: string
  doc_footer_text?: string
}

export async function updateOrganizationProfile(formData: {
  id: string
  name: string
  slug: string
  sector: string
  country: string
  size: string
  geography: string[]
  normative_modules: string[]
  apetito_riesgo: RiskAppetite
  logo_url?: string
  settings?: SgaiSettings
  // Legal fields (migration 081)
  legal_name?: string
  tax_id?: string
  vat_number?: string
  lei_code?: string
  website?: string
  description?: string
  registered_address?: {
    street?: string
    city?: string
    postal_code?: string
    country?: string
  }
  // Governance fields (migration 082)
  dpo_name?: string
  dpo_email?: string
  dpo_phone?: string
  external_auditor_name?: string
  external_auditor_contact?: string
  external_auditor_cert?: string
  // Retention fields (migration 083)
  evidence_retention_months?: number
  audit_log_retention_months?: number
  personal_data_retention_months?: number
}) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'No autorizado' };
  }

  const { data: membership, error: memberError } = await fluxion
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', formData.id)
    .single();

  if (memberError || !membership || membership.role !== 'org_admin') {
    return { error: 'No tienes permisos de administrador para realizar esta acción.' };
  }

  const { data: current } = await fluxion
    .from('organizations')
    .select('settings')
    .eq('id', formData.id)
    .single()

  const mergedSettings = {
    ...(typeof current?.settings === 'object' && current.settings !== null ? current.settings : {}),
    ...(formData.settings ?? {}),
  }

  const { error } = await fluxion
    .from('organizations')
    .update({
      name:                formData.name,
      slug:                formData.slug,
      sector:              formData.sector,
      country:             formData.country,
      size:                formData.size,
      geography:           formData.geography,
      normative_modules:   formData.normative_modules,
      apetito_riesgo:      formData.apetito_riesgo,
      logo_url:            formData.logo_url || null,
      settings:            mergedSettings,
      // Legal fields
      legal_name:          formData.legal_name || null,
      tax_id:              formData.tax_id || null,
      vat_number:          formData.vat_number || null,
      lei_code:            formData.lei_code || null,
      website:             formData.website || null,
      description:         formData.description || null,
      registered_address:      formData.registered_address ?? null,
      // Governance fields
      dpo_name:                formData.dpo_name || null,
      dpo_email:               formData.dpo_email || null,
      dpo_phone:               formData.dpo_phone || null,
      external_auditor_name:   formData.external_auditor_name || null,
      external_auditor_contact: formData.external_auditor_contact || null,
      external_auditor_cert:          formData.external_auditor_cert || null,
      evidence_retention_months:      formData.evidence_retention_months ?? 84,
      audit_log_retention_months:     formData.audit_log_retention_months ?? 36,
      personal_data_retention_months: formData.personal_data_retention_months ?? 60,
      updated_at:                     new Date().toISOString(),
    })
    .eq('id', formData.id);

  if (error) {
    console.error('updateOrganizationProfile error:', error);
    return { error: 'Error al actualizar la organización: ' + error.message };
  }

  revalidatePath('/organizacion');
  return { success: true };
}

// ─── Comités ─────────────────────────────────────────────────────────────────

const COMMITTEE_MANAGE_ROLES = ['org_admin', 'sgai_manager', 'caio'];

export async function getCommittees() {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Sin organización.' };

  const { data: committees, error: ce } = await fluxion
    .from('committees')
    .select('id, type, name, description, cadence_months, is_active, established_at')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: true });

  if (ce) return { error: ce.message };

  const committeeIds = (committees ?? []).map((c: any) => c.id);
  let members: any[] = [];
  if (committeeIds.length > 0) {
    const { data: mData } = await fluxion
      .from('committee_members')
      .select('id, committee_id, committee_role, is_active, joined_at, external_name, external_email, external_org, external_role_desc, profile_id, profiles!committee_members_profile_id_fkey(id, full_name, avatar_url, role)')
      .in('committee_id', committeeIds)
      .eq('is_active', true);
    members = mData ?? [];
  }

  // Org profiles for the member picker
  const { data: orgProfiles } = await fluxion
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('organization_id', profile.organization_id)
    .order('full_name', { ascending: true });

  return {
    success: true,
    organizationId: profile.organization_id,
    currentUserRole: profile.role,
    committees: (committees ?? []).map((c: any) => ({
      ...c,
      members: members.filter((m: any) => m.committee_id === c.id),
    })),
    orgProfiles: orgProfiles ?? [],
  };
}

export async function upsertCommittee(data: {
  id?: string
  organization_id: string
  type: string
  name: string
  description?: string
  cadence_months: number
  established_at?: string
  is_active?: boolean
}) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !COMMITTEE_MANAGE_ROLES.includes(profile.role)) {
    return { error: 'No tienes permisos para gestionar comités.' };
  }

  const payload = {
    organization_id: data.organization_id,
    type: data.type,
    name: data.name,
    description: data.description || null,
    cadence_months: data.cadence_months,
    established_at: data.established_at || null,
    is_active: data.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  let error;
  if (data.id) {
    const res = await fluxion.from('committees').update(payload).eq('id', data.id);
    error = res.error;
  } else {
    const res = await fluxion.from('committees').insert(payload);
    error = res.error;
  }

  if (error) return { error: 'Error al guardar el comité: ' + error.message };

  revalidatePath('/organizacion');
  return { success: true };
}

export async function addCommitteeMember(data: {
  committee_id: string
  organization_id: string
  profile_id?: string | null
  external_name?: string
  external_email?: string
  external_org?: string
  external_role_desc?: string
  committee_role: string
}) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !COMMITTEE_MANAGE_ROLES.includes(profile.role)) {
    return { error: 'No tienes permisos.' };
  }

  const { error } = await fluxion.from('committee_members').insert({
    committee_id:       data.committee_id,
    organization_id:    data.organization_id,
    profile_id:         data.profile_id || null,
    external_name:      data.external_name || null,
    external_email:     data.external_email || null,
    external_org:       data.external_org || null,
    external_role_desc: data.external_role_desc || null,
    committee_role:     data.committee_role,
    added_by:           profile.id,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Este miembro ya está en el comité.' };
    return { error: 'Error al añadir miembro: ' + error.message };
  }

  revalidatePath('/organizacion');
  return { success: true };
}

export async function removeCommitteeMember(memberId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !COMMITTEE_MANAGE_ROLES.includes(profile.role)) {
    return { error: 'No tienes permisos.' };
  }

  const { error } = await fluxion.from('committee_members').update({
    is_active: false,
    left_at: new Date().toISOString().split('T')[0],
  }).eq('id', memberId);

  if (error) return { error: 'Error al eliminar miembro: ' + error.message };

  revalidatePath('/organizacion');
  return { success: true };
}
