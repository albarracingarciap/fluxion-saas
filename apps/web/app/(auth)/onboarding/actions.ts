'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { revalidatePath } from 'next/cache'

import { hasRole, rolesOf } from '@/lib/auth/roles'
import type { NormativeModule, RiskAppetite } from '@/lib/organization/options'
import { addCommitteeMember, upsertCommittee } from '@/app/(app)/organizacion/actions'
import { inviteUser, updateMemberRoles } from '@/app/(app)/usuarios/actions'

/**
 * Onboarding en tres pasos (B18c, F-17, GAP-02): Organización, Equipo y
 * Primer sistema. Solo lo hace un Administrador de una organización sin
 * configurar; el resto de miembros (invitados, o administradores de una
 * organización ya configurada) solo ven la bienvenida y no tocan la
 * organización (A2).
 */

async function contexto() {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, roles')
    .eq('user_id', user.id)
    .single()
  if (!profile) return null
  return { fluxion, user, profile }
}

/** Paso 1 · Organización. Se guarda al continuar, para no perderlo si se deja a medias. */
export async function saveOnboardingOrganization(data: {
  sector: string
  country: string
  companySize: string
  normativeModules: NormativeModule[]
  riskAppetite: RiskAppetite
}): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'Acceso denegado. No hay sesión.' }
  if (!hasRole(ctx.profile, 'org_admin')) return { error: 'Solo un Administrador configura la organización.' }

  const { error } = await ctx.fluxion
    .from('organizations')
    .update({
      sector: data.sector || null,
      country: data.country || 'Espana',
      size: data.companySize || null,
      normative_modules: data.normativeModules ?? [],
      apetito_riesgo: data.riskAppetite || 'moderado',
    })
    .eq('id', ctx.profile.organization_id)

  if (error) return { error: 'No se pudo guardar la organización: ' + error.message }
  return { success: true }
}

/** Paso 2 · Equipo: invitar al Responsable del SGAI o al DPO con su rol. */
export async function inviteOnboardingMember(email: string, role: 'sgai_manager' | 'dpo') {
  if (!['sgai_manager', 'dpo'].includes(role)) return { error: 'Rol no válido.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return { error: 'Indica un correo válido.' }
  return inviteUser(email, role)
}

/** Paso 2 · Equipo: el Administrador asume él mismo el rol (organizaciones pequeñas). */
export async function assumeOnboardingRole(role: 'sgai_manager' | 'dpo') {
  const ctx = await contexto()
  if (!ctx) return { error: 'Acceso denegado. No hay sesión.' }
  if (!['sgai_manager', 'dpo'].includes(role)) return { error: 'Rol no válido.' }
  return updateMemberRoles(ctx.profile.id, [...rolesOf(ctx.profile), role])
}

/** Paso 2 · Equipo: constituye el Comité de IA con el Administrador como presidente. */
export async function createOnboardingCommittee(): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'Acceso denegado. No hay sesión.' }
  const orgId = ctx.profile.organization_id

  const { data: existente } = await ctx.fluxion
    .from('committees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('type', 'ai_committee')
    .maybeSingle()
  if (existente) return { success: true }

  const creado = await upsertCommittee({
    organization_id: orgId,
    type: 'ai_committee',
    name: 'Comité de IA',
    cadence_months: 3,
    established_at: new Date().toISOString().slice(0, 10),
  })
  if ('error' in creado && creado.error) return { error: creado.error }

  const { data: comite } = await ctx.fluxion
    .from('committees')
    .select('id')
    .eq('organization_id', orgId)
    .eq('type', 'ai_committee')
    .maybeSingle()
  if (!comite) return { error: 'No se pudo constituir el comité.' }

  const miembro = await addCommitteeMember({
    committee_id: comite.id,
    organization_id: orgId,
    profile_id: ctx.profile.id,
    committee_role: 'president',
  })
  if ('error' in miembro && miembro.error) return { error: miembro.error }
  return { success: true }
}

/** Paso 3 · Cierra el onboarding de la organización y del Administrador. */
export async function completeOnboarding(): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'Acceso denegado. No hay sesión.' }
  if (!hasRole(ctx.profile, 'org_admin')) return { error: 'Solo un Administrador configura la organización.' }

  const { data: organization } = await ctx.fluxion
    .from('organizations')
    .select('settings')
    .eq('id', ctx.profile.organization_id)
    .single()
  const settings = organization?.settings && typeof organization.settings === 'object' ? organization.settings : {}

  const { error } = await ctx.fluxion
    .from('organizations')
    .update({
      settings: { ...settings, onboarding_completed: true, onboarding_completed_at: new Date().toISOString() },
    })
    .eq('id', ctx.profile.organization_id)
  if (error) return { error: 'No se pudo cerrar la configuración inicial: ' + error.message }

  return completeWelcome()
}

/** Bienvenida: marca el onboarding del miembro, sin tocar la organización. */
export async function completeWelcome(): Promise<{ success: true } | { error: string }> {
  const ctx = await contexto()
  if (!ctx) return { error: 'Acceso denegado. No hay sesión.' }

  const { error } = await ctx.fluxion
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', ctx.user.id)
  if (error) return { error: 'No se pudo marcar el onboarding como completado.' }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
