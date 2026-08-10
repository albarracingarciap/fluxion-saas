export type OrgRole =
  | 'org_admin'
  | 'sgai_manager'
  | 'caio'
  | 'dpo'
  | 'system_owner'
  | 'risk_analyst'
  | 'compliance_analyst'
  | 'executive'
  | 'auditor'
  | 'viewer'

export type PlatformRole = 'platform_admin' | 'partner'

export interface Profile {
  id: string
  user_id: string
  organization_id: string
  // Identidad
  full_name: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  // Contacto y estructura
  phone: string | null
  secondary_email: string | null
  manager_id: string | null
  bio: string | null
  pronouns: string | null
  // Rol y estado
  role: OrgRole
  platform_role: PlatformRole | null
  is_active: boolean
  onboarding_completed: boolean
  copilot_enabled: boolean
  // Preferencias serializadas
  preferences: Record<string, unknown> | null
  // Timestamps
  created_at: string
  updated_at: string
  last_active_at: string | null
}
