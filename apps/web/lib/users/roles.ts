// Roles que un administrador puede asignar al invitar, al dar de alta o al
// editar un miembro. Desde B23a incluye `org_admin`: puede haber varios
// Administradores y el rol se combina con cualquier otro (DP-01). La
// organización debe conservar siempre al menos un Administrador activo.
export const ASSIGNABLE_ROLES = [
  'org_admin', 'sgai_manager', 'caio', 'dpo', 'system_owner',
  'risk_analyst', 'compliance_analyst', 'executive', 'auditor', 'viewer',
] as const

export type AssignableRole = typeof ASSIGNABLE_ROLES[number]

/** Se mantiene el nombre anterior: invitar admite los mismos roles. */
export const INVITABLE_ROLES = ASSIGNABLE_ROLES
export type InvitableRole = AssignableRole

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role)
}

export const isInvitableRole = isAssignableRole
