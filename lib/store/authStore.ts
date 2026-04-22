import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Tipos basados en nuestro modelo SQL
export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  preferences: Record<string, unknown>
  created_at?: string | null
}

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
}

interface AuthState {
  user: User | null
  profile: Profile | null
  organization: Organization | null
  role: string | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setOrganization: (org: Organization | null, role?: string | null) => void
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
  setProfile: (profile) => set({ profile }),
  setOrganization: (organization, role) => set({ organization, role }),
  
  loadUserData: async () => {
    set({ isLoading: true })
    const supabase = createClient()
    
    try {
      // 1. Obtener usuario base de Supabase Auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ user: null, profile: null, organization: null, role: null, isLoading: false })
        return
      }
      
      set({ user })

      const fallbackProfile: Profile = {
        id: user.id,
        first_name:
          typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name : null,
        last_name:
          typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name : null,
        avatar_url: null,
        preferences: {},
      }

      set({ profile: fallbackProfile })

      // 2. Obtener Perfil persistido en fluxion.profiles
      const { data: profile } = await supabase.schema('fluxion')
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        
      if (profile) set({ profile })

      // 3. Obtener membresía
      const { data: membership } = await supabase.schema('fluxion')
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership?.organization_id) {
        const { data: organization } = await supabase.schema('fluxion')
          .from('organizations')
          .select('*')
          .eq('id', membership.organization_id)
          .maybeSingle()

        if (organization) {
          set({
            organization: organization as Organization,
            role: membership.role,
          })
        } else {
          set({ role: membership.role })
        }
      } else {
        set({ 
          organization: null,
          role: null
        })
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
  }
}))
