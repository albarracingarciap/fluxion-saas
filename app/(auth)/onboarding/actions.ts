'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

import type { NormativeModule, RiskAppetite } from '@/lib/organization/options'

type Iso42001Status = 'certified' | 'in_progress' | 'none'
type AiInventoryStatus = 'complete' | 'partial' | 'none'
type ComplianceMaturity = 0 | 25 | 50 | 75
type FirstFocus = 'inventory' | 'compliance' | 'risk' | 'governance'

export async function saveOnboarding(data: {
  sector: string
  country: string
  companySize: string
  normativeModules: NormativeModule[]
  riskAppetite: RiskAppetite
  iso42001Status: Iso42001Status
  iso42001CertDate?: string | null
  iso42001CertBody?: string | null
  aiInventoryStatus: AiInventoryStatus
  complianceMaturity: ComplianceMaturity
  firstFocus: FirstFocus
}) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Acceso denegado. No hay sesión.')

  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) throw new Error('No se encontró una organización vinculada a este usuario.')
  const orgId = profile.organization_id

  const { data: organization, error: organizationError } = await fluxion
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (organizationError) throw new Error('No se pudo cargar la organización para finalizar el onboarding.')

  const existingSettings =
    organization?.settings && typeof organization.settings === 'object'
      ? organization.settings
      : {}

  const { error: orgError } = await fluxion
    .from('organizations')
    .update({
      sector: data.sector || null,
      country: data.country || 'Espana',
      size: data.companySize || null,
      normative_modules: data.normativeModules ?? [],
      apetito_riesgo: data.riskAppetite || 'moderado',
      iso_42001_status: data.iso42001Status,
      iso_42001_cert_date: data.iso42001Status === 'certified' ? (data.iso42001CertDate ?? null) : null,
      iso_42001_cert_body: data.iso42001Status === 'certified' ? (data.iso42001CertBody ?? null) : null,
      ai_inventory_status: data.aiInventoryStatus,
      compliance_maturity: data.complianceMaturity,
      settings: {
        ...existingSettings,
        first_focus: data.firstFocus,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      },
    })
    .eq('id', orgId)

  if (orgError) throw new Error('No se pudo guardar la configuración inicial de la organización.')

  const { error: profileUpdateError } = await fluxion
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', user.id)

  if (profileUpdateError) throw new Error('No se pudo marcar el onboarding como completado.')

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
