import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'

type OrganizationSettings = {
  onboarding_completed?: boolean
  onboarding_completed_at?: string
  [key: string]: unknown
}

function isOrganizationSettings(value: unknown): value is OrganizationSettings {
  return typeof value === 'object' && value !== null
}

export async function getAppAuthState() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      membership: null,
      organization: null,
      onboardingCompleted: false,
    }
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    throw membershipError
  }

  if (!membership) {
    return {
      user,
      membership: null,
      organization: null,
      onboardingCompleted: false,
    }
  }

  const { data: organization, error: organizationError } = await fluxion
    .from('organizations')
    .select('id, name, slug, plan, settings, logo_url')
    .eq('id', membership.organization_id)
    .maybeSingle()

  if (organizationError) {
    throw organizationError
  }

  const settings = isOrganizationSettings(organization?.settings) ? organization.settings : {}

  return {
    user,
    membership,
    organization,
    onboardingCompleted: settings.onboarding_completed === true,
  }
}
