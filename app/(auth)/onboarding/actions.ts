'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

import type { NormativeModule, RiskAppetite } from '@/lib/organization/options'

export async function saveOnboarding(data: {
  sector: string,
  country: string,
  companySize: string,
  normativeModules: NormativeModule[],
  riskAppetite: RiskAppetite,
  plan: string,
  invitations: { email: string, role: string }[]
}) {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  
  // 1. Obtener usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error("Acceso denegado. No hay sesión.")

  // 2. Localizar a qué organización pertenece el usuario
  const { data: member, error: memberError } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) throw new Error("No se encontró una organización vinculada a este usuario.")
  const orgId = member.organization_id

  const { data: organization, error: organizationError } = await fluxion
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  if (organizationError) {
    throw new Error("No se pudo cargar la organización para finalizar el onboarding.")
  }

  const existingSettings =
    organization?.settings && typeof organization.settings === 'object'
      ? organization.settings
      : {}

  // 3. Guardar Perfil de Organización y marcar onboarding como completado
  const { error: orgError } = await fluxion
    .from('organizations')
    .update({
      sector: data.sector || null,
      country: data.country || 'Espana',
      size: data.companySize || null,
      normative_modules: data.normativeModules ?? [],
      apetito_riesgo: data.riskAppetite || 'moderado',
      plan: data.plan || 'starter',
      settings: {
        ...existingSettings,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      },
    })
    .eq('id', orgId)

  if (orgError) {
    throw new Error("No se pudo guardar la configuración inicial de la organización.")
  }

  // 4. Procesar Invitaciones de Equipo
  if (data.invitations && data.invitations.length > 0) {
    for (const invite of data.invitations) {
      if (!invite.email) continue;
      
      const { error: inviteError } = await fluxion
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: invite.email,
          role: invite.role || 'viewer',
          token: crypto.randomUUID(), // Generamos un token arbitrario temporal
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
        })
        
      if (inviteError) {
        console.error("Error insertando invitación en base de datos:", inviteError)
      }
    }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
