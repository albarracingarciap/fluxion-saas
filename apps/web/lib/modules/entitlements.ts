/**
 * ¿Tiene esta organización contratado este módulo?
 *
 * Se usa en Server Components y Server Actions:
 *
 *   if (await hasModule(orgId, 'drift-monitor')) { … }
 *
 * Y en rutas de API de módulo:
 *
 *   const guard = await requireModule(orgId, 'telemetry')
 *   if (guard) return guard
 */

import { cache } from 'react'
import { NextResponse } from 'next/server'

import { createAdminFluxionClient } from '@/lib/supabase/fluxion'
import type { ModuleKey, ModuleStatus } from './registry'

const ACTIVE_STATUSES: ModuleStatus[] = ['enabled', 'trial']

/**
 * Módulos activos de una organización.
 *
 * `cache()` de React memoriza el resultado durante el renderizado de una misma
 * petición: una página que consulta cinco módulos hace una sola consulta.
 */
const getActiveModules = cache(async (organizationId: string): Promise<Set<string>> => {
  const admin = createAdminFluxionClient()

  const { data, error } = await admin
    .from('organization_modules')
    .select('module_key, status, licensed_until')
    .eq('organization_id', organizationId)

  if (error) {
    // Ante la duda, no conceder. Un fallo de lectura no debe abrir módulos.
    console.error('[entitlements] no se pudieron leer los módulos:', error)
    return new Set()
  }

  const today = new Date().toISOString().slice(0, 10)

  const active = (data ?? [])
    .filter((row: { status: string; licensed_until: string | null }) => {
      if (!ACTIVE_STATUSES.includes(row.status as ModuleStatus)) return false
      if (row.licensed_until && row.licensed_until < today) return false
      return true
    })
    .map((row: { module_key: string }) => row.module_key)

  return new Set(active)
})

export async function hasModule(organizationId: string, key: ModuleKey): Promise<boolean> {
  const active = await getActiveModules(organizationId)
  return active.has(key)
}

export async function listActiveModules(organizationId: string): Promise<string[]> {
  return Array.from(await getActiveModules(organizationId))
}

/**
 * Guarda para rutas de API que pertenecen a un módulo.
 * Devuelve una respuesta 402 si no está contratado, o `null` si puede seguir.
 *
 * 402 y no 403 a propósito: no es que falten permisos, es que la capacidad no
 * está contratada. Distinguirlo permite que la interfaz ofrezca contratarlo en
 * lugar de decir "acceso denegado".
 */
export async function requireModule(
  organizationId: string,
  key: ModuleKey
): Promise<NextResponse | null> {
  if (await hasModule(organizationId, key)) return null

  return NextResponse.json(
    {
      error: 'module_not_enabled',
      message: `El módulo "${key}" no está activo para esta organización.`,
      module: key,
    },
    { status: 402 }
  )
}
