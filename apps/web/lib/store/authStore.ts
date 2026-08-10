import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, OrgRole } from '@/lib/types/auth'

export type { Profile, OrgRole }

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  plan_started_at?: string | null
  plan_expires_at?: string | null
  sector?: string | null
  size?: string | null
  country?: string | null
  geography?: string[]
  normative_modules?: string[]
  apetito_riesgo?: string | null
  logo_url: string | null
  active_modules: string[]
  settings?: Record<string, unknown>
  // Legal fields (migration 081)
  legal_name?: string | null
  tax_id?: string | null
  vat_number?: string | null
  lei_code?: string | null
  website?: string | null
  description?: string | null
  registered_address?: {
    street?: string | null
    city?: string | null
    postal_code?: string | null
    country?: string | null
  } | null
  // Governance fields (migration 082)
  parent_org_id?: string | null
  dpo_name?: string | null
  dpo_email?: string | null
  dpo_phone?: string | null
  external_auditor_name?: string | null
  external_auditor_contact?: string | null
  external_auditor_cert?: string | null
  // Retention fields (migration 083)
  evidence_retention_months?: number | null
  audit_log_retention_months?: number | null
  personal_data_retention_months?: number | null
}

interface AuthState {
  user: User | null
  profile: Profile | null
  organization: Organization | null
  role: OrgRole | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setOrganization: (org: Organization | null) => void
  loadUserData: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  organization: null,
  role: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile, role: profile?.role ?? null }),
  setOrganization: (organization) => set({ organization }),

  loadUserData: async () => {
    set({ isLoading: true })
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ user: null, profile: null, organization: null, role: null, isLoading: false })
        return
      }

      set({ user })

      // Perfil en el nuevo modelo: query por user_id (no por id)
      const { data: profile } = await supabase
        .schema('fluxion')
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!profile) {
        set({ profile: null, organization: null, role: null, isLoading: false })
        return
      }

      set({ profile: profile as Profile, role: profile.role as OrgRole })

      const { data: organization } = await supabase
        .schema('fluxion')
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .maybeSingle()

      if (organization) {
        set({ organization: organization as Organization })
      }

    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, profile: null, organization: null, role: null })
  },
}))
