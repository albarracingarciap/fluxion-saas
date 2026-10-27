import { redirect } from 'next/navigation'

import { getRoleLabel } from '@/lib/auth/role-labels'
import { hasRole, rolesOf } from '@/lib/auth/roles'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

import { Bienvenida } from './bienvenida'
import { OnboardingWizard } from './onboarding-wizard'

/**
 * Onboarding (B18c, F-17). El Administrador de una organización sin
 * configurar hace los tres pasos; cualquier otro miembro solo ve la
 * bienvenida y no toca la organización (A2).
 */
export default async function OnboardingPage() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id, role, roles')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) redirect('/login')

  const { data: organization } = await fluxion
    .from('organizations')
    .select('name, settings')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const settings = (organization?.settings ?? {}) as Record<string, unknown>
  const organizationName = (organization?.name as string | undefined) ?? 'tu organización'
  const configurada = settings.onboarding_completed === true

  if (hasRole(profile, 'org_admin') && !configurada) {
    return <OnboardingWizard organizationName={organizationName} />
  }
  return <Bienvenida organizationName={organizationName} roleLabels={rolesOf(profile).map(getRoleLabel)} />
}
