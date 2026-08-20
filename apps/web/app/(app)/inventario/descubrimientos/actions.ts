'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'

/**
 * Conciliación de descubrimientos.
 *
 * Un descubrimiento es un activo que un conector ha encontrado en un sistema
 * externo. Nada entra en el inventario sin que alguien decida explícitamente
 * qué es: vincularlo a un sistema existente, crear uno nuevo, o descartarlo con
 * un motivo.
 *
 * Ese "con un motivo" no es burocracia: ante un auditor, poder enseñar por qué
 * un modelo detectado NO se consideró sistema de IA vale tanto como el propio
 * inventario.
 */

const RESOLVER_ROLES = ['org_admin', 'sgai_manager', 'caio', 'risk_analyst', 'compliance_analyst']

export type DiscoveryRow = {
  id:               string
  source_module:    string
  asset_type:       string
  external_id:      string
  external_url:     string | null
  name:             string
  description:      string | null
  metadata:         Record<string, unknown>
  status:           'pending' | 'linked' | 'ignored'
  linked_system_id: string | null
  linked_system_name: string | null
  ignore_reason:    string | null
  first_seen_at:    string
  last_seen_at:     string
  resolved_at:      string | null
}

export type SystemOption = { id: string; name: string }

export type ShadowFinding = {
  finding_type: 'library' | 'endpoint' | 'credential' | 'model_file'
  category:     string
  pattern:      string
  file_path:    string
  line_number:  number | null
  severity:     string
}

/**
 * Los hallazgos que explican por qué el escáner cree que un repositorio
 * contiene IA.
 *
 * Sin ellos la bandeja solo puede afirmar; con ellos, quien concilia ve
 * «usa openai en requirements.txt:3» y decide en diez segundos.
 */
export async function getShadowFindings(discoveryId: string): Promise<ShadowFinding[]> {
  const fluxion = createFluxionClient()

  const { data } = await fluxion
    .from('shadow_ai_findings')
    .select('finding_type, category, pattern, file_path, line_number, severity')
    .eq('discovered_asset_id', discoveryId)
    .is('resolved_at', null)
    .order('severity', { ascending: false })
    .limit(50)

  return ((data ?? []) as ShadowFinding[])
}

async function requireResolver() {
  const supabase = createClient()
  const fluxion  = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null }

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null }
  if (!RESOLVER_ROLES.includes(profile.role)) {
    return { error: 'Sin permisos para conciliar descubrimientos.' as const, profile: null }
  }

  return { error: null, profile }
}

export async function getDiscoveries(status?: 'pending' | 'linked' | 'ignored'): Promise<DiscoveryRow[]> {
  const supabase = createClient()
  const fluxion  = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = fluxion
    .from('discovered_assets')
    .select('id, source_module, asset_type, external_id, external_url, name, description, metadata, status, linked_system_id, ignore_reason, first_seen_at, last_seen_at, resolved_at, ai_systems:linked_system_id(name)')
    .order('last_seen_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id:                 r.id,
    source_module:      r.source_module,
    asset_type:         r.asset_type,
    external_id:        r.external_id,
    external_url:       r.external_url,
    name:               r.name,
    description:        r.description,
    metadata:           r.metadata ?? {},
    status:             r.status,
    linked_system_id:   r.linked_system_id,
    linked_system_name: r.ai_systems?.name ?? null,
    ignore_reason:      r.ignore_reason,
    first_seen_at:      r.first_seen_at,
    last_seen_at:       r.last_seen_at,
    resolved_at:        r.resolved_at,
  }))
}

export async function getSystemsForLinking(): Promise<SystemOption[]> {
  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .order('name')

  return (data ?? []) as SystemOption[]
}

export async function linkDiscovery(
  id: string,
  systemId: string
): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await requireResolver()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createAdminFluxionClient()

  // El sistema tiene que ser de la misma organización.
  const { data: system } = await admin
    .from('ai_systems')
    .select('id')
    .eq('id', systemId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!system) return { error: 'El sistema seleccionado no existe en esta organización.' }

  const { error: updErr } = await admin
    .from('discovered_assets')
    .update({
      status:           'linked',
      linked_system_id: systemId,
      ignore_reason:    null,
      resolved_by:      profile.id,
      resolved_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al vincular: ' + updErr.message }

  revalidatePath('/inventario/descubrimientos')
  return { success: true }
}

export async function ignoreDiscovery(
  id: string,
  reason: string
): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await requireResolver()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  if (!reason.trim()) {
    return { error: 'Indica por qué se descarta: es la justificación que verá un auditor.' }
  }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('discovered_assets')
    .update({
      status:           'ignored',
      linked_system_id: null,
      ignore_reason:    reason.trim(),
      resolved_by:      profile.id,
      resolved_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al descartar: ' + updErr.message }

  revalidatePath('/inventario/descubrimientos')
  return { success: true }
}

export async function reopenDiscovery(id: string): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await requireResolver()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('discovered_assets')
    .update({
      status:           'pending',
      linked_system_id: null,
      ignore_reason:    null,
      resolved_by:      null,
      resolved_at:      null,
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al reabrir: ' + updErr.message }

  revalidatePath('/inventario/descubrimientos')
  return { success: true }
}

/**
 * Crea un sistema en el inventario a partir de un descubrimiento y lo vincula.
 *
 * Solo se piden los campos obligatorios. La clasificación, el propósito y el
 * resto del expediente los completa la persona después: inventar esos datos
 * desde los metadatos de un modelo sería fabricar declaraciones que nadie ha
 * hecho.
 */
export async function createSystemFromDiscovery(
  id: string,
  input: { name: string; domain: string; status: string }
): Promise<{ systemId: string } | { error: string }> {
  const { error, profile } = await requireResolver()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const name = input.name.trim()
  if (!name) return { error: 'El nombre es obligatorio.' }

  const admin = createAdminFluxionClient()

  const { data: system, error: insErr } = await admin
    .from('ai_systems')
    .insert({
      organization_id: profile.organization_id,
      created_by:      profile.id,
      name,
      domain:          input.domain,
      status:          input.status,
    })
    .select('id')
    .single()

  if (insErr || !system) return { error: 'Error al crear el sistema: ' + (insErr?.message ?? '') }

  const linked = await linkDiscovery(id, system.id)
  if (linked.error) return { error: linked.error }

  revalidatePath('/inventario/descubrimientos')
  revalidatePath('/inventario')
  return { systemId: system.id }
}
