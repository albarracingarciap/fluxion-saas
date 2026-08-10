import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { Profile } from '@/lib/types/auth'

export async function getAppAuthState() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, profile: null, membership: null, organization: null, onboardingCompleted: false }
  }

  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('id, user_id, organization_id, role, onboarding_completed, full_name, avatar_url, is_active, copilot_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) throw profileError

  if (!profile) {
    return { user, profile: null, membership: null, organization: null, onboardingCompleted: false }
  }

  const { data: organization, error: organizationError } = await fluxion
    .from('organizations')
    .select('id, name, slug, plan, settings, logo_url')
    .eq('id', profile.organization_id)
    .maybeSingle()

  if (organizationError) throw organizationError

  // membership shim: mantiene compatibilidad con código existente que lee
  // membership.role y membership.organization_id. Se eliminará en Fase 7.
  const membership = { organization_id: profile.organization_id, role: profile.role }

  return {
    user,
    profile: profile as Profile,
    membership,
    organization,
    onboardingCompleted: profile.onboarding_completed,
  }
}
