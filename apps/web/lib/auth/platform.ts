/**
 * Administración de la plataforma (`profiles.platform_role = 'platform_admin'`).
 *
 * Los catálogos de **Datos** (obligaciones, medidas, tipos de evidencia, modos
 * de fallo, relaciones causales y sus correspondencias) son globales: los
 * comparten todas las organizaciones. Cualquier usuario con sesión puede
 * consultarlos, pero solo la administración de la plataforma los modifica: un
 * cambio afecta a todos los clientes (`_inventario.md` §7.2).
 *
 * Las acciones de Datos escriben con la service role, así que esta comprobación
 * es la única barrera: debe ir en cada acción que escribe.
 */
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'

export const PLATFORM_ADMIN_REQUIRED =
  'Solo la administración de la plataforma puede modificar los catálogos de Datos.'

/** Usuario con sesión válida (verificada contra GoTrue). */
export async function requireSession(): Promise<User> {
  const { data: { user }, error } = await createClient().auth.getUser()
  if (error || !user) throw new Error('No autorizado')
  return user
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await createFluxionClient()
    .from('profiles')
    .select('platform_role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.platform_role === 'platform_admin'
}

/** Sesión válida y administración de la plataforma; si no, lanza un error. */
export async function requirePlatformAdmin(): Promise<User> {
  const user = await requireSession()
  if (!(await isPlatformAdmin(user.id))) throw new Error(PLATFORM_ADMIN_REQUIRED)
  return user
}
