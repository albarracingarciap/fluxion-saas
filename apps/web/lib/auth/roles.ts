/**
 * Comprobación de roles con roles múltiples por miembro (B23a, DP-01).
 *
 * `profiles.roles` guarda todos los roles del miembro; `profiles.role` es el
 * principal (= roles[1]) y se conserva por compatibilidad. Toda comprobación de
 * permisos debe usar estas funciones, que miran la lista completa: comparar
 * `role` a secas ignora los roles secundarios.
 *
 * Módulo puro (sin Supabase ni Next): se puede usar en servidor, en cliente y
 * en los tests.
 */

/** Cualquier objeto con el rol principal y, si se ha leído, la lista de roles. */
export type RoleHolder =
  | { role?: string | null; roles?: readonly string[] | null }
  | null
  | undefined

/** Todos los roles del miembro. Si no se leyó `roles`, se usa el principal. */
export function rolesOf(holder: RoleHolder): string[] {
  if (!holder) return []
  if (holder.roles && holder.roles.length > 0) return [...holder.roles]
  return holder.role ? [holder.role] : []
}

export function hasRole(holder: RoleHolder, role: string): boolean {
  return rolesOf(holder).includes(role)
}

export function hasAnyRole(holder: RoleHolder, roles: readonly string[] | ReadonlySet<string>): boolean {
  const propios = rolesOf(holder)
  return Array.from(roles).some((role) => propios.includes(role))
}

/**
 * Incompatibilidades de DP-01: no pueden recaer en la misma persona. La base de
 * datos también lo impide (chk_profiles_dpo_no_sgai).
 */
export const INCOMPATIBLE_ROLE_PAIRS: ReadonlyArray<readonly [string, string]> = [['dpo', 'sgai_manager']]

/** Devuelve la primera pareja incompatible presente en la lista, o null. */
export function findIncompatibleRoles(roles: readonly string[]): readonly [string, string] | null {
  for (const pair of INCOMPATIBLE_ROLE_PAIRS) {
    if (roles.includes(pair[0]) && roles.includes(pair[1])) return pair
  }
  return null
}
