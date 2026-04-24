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
  full_name: string
  display_name: string | null
  avatar_url: string | null
  job_title: string | null
  department: string | null
  role: OrgRole
  platform_role: PlatformRole | null
  is_active: boolean
  onboarding_completed: boolean
  copilot_enabled: boolean
  created_at: string
  updated_at: string
  last_active_at: string | null
}
