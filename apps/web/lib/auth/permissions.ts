import { OrgRole } from '@/lib/types/auth'

export const PERMISSIONS = {
  'ai_systems:read':              ['*'],
  'ai_systems:write':             ['org_admin', 'sgai_manager', 'caio', 'risk_analyst'],
  'ai_systems:write_own':         ['system_owner'],

  'fmea:read':                    ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst', 'auditor', 'system_owner'],
  'fmea:write':                   ['sgai_manager', 'caio', 'risk_analyst'],

  'treatment_plans:approve_z3_z4': ['sgai_manager', 'caio'],
  'treatment_plans:approve_z1_z2': ['caio'],

  'evidence:write':               ['sgai_manager', 'caio', 'risk_analyst', 'compliance_analyst', 'system_owner', 'dpo'],
  'evidence:read':                ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst', 'auditor', 'system_owner'],

  'soa:write':                    ['sgai_manager', 'caio', 'compliance_analyst'],
  'soa:read':                     ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst', 'auditor'],

  'committees:manage':            ['org_admin', 'sgai_manager', 'caio'],
  'committees:read':              ['*'],

  'reporting:read':               ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst', 'executive', 'auditor'],

  'users:manage':                 ['org_admin'],
  'billing:manage':               ['org_admin'],
} as const satisfies Record<string, readonly string[]>

export type PermissionKey = keyof typeof PERMISSIONS

export function hasPermission(role: OrgRole, permission: PermissionKey): boolean {
  const allowed: readonly string[] = PERMISSIONS[permission]
  if (allowed.includes('*')) return true
  return allowed.includes(role)
}

export function requireRole(role: OrgRole, permission: PermissionKey): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: role '${role}' cannot perform '${permission}'`)
  }
}
