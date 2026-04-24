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

  if (memberError || !membership || membership.role !== 'admin') {
    return { error: 'No tienes permisos de administrador para realizar esta acción.' };
  }

  // Leer settings actuales para no sobreescribir onboarding_completed ni otros flags
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
      name:               formData.name,
      slug:               formData.slug,
      sector:             formData.sector,
      country:            formData.country,
      size:               formData.size,
      geography:          formData.geography,
      normative_modules:  formData.normative_modules,
      apetito_riesgo:     formData.apetito_riesgo,
      logo_url:           formData.logo_url || null,
      settings:           mergedSettings,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', formData.id);

  if (error) {
    console.error('updateOrganizationProfile error:', error);
    return { error: 'Error al actualizar la organización: ' + error.message };
  }

  revalidatePath('/organizacion');
  return { success: true };
}
