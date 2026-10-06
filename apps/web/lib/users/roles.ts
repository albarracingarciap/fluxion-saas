// Roles que un administrador puede asignar al invitar o dar de alta a un
// usuario. `org_admin` queda fuera a propósito: se concede al crear la
// organización, no desde esta pantalla.
export const INVITABLE_ROLES = [
  'viewer', 'auditor', 'executive', 'compliance_analyst',
  'risk_analyst', 'system_owner', 'dpo', 'caio', 'sgai_manager',
] as const

export type InvitableRole = typeof INVITABLE_ROLES[number]

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role)
}
