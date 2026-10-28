import 'server-only'

import { hasValidLiteracy } from '@/lib/governance/oversight'
import { loadTrainings } from '@/lib/governance/oversight-server'

import type { SgaiFacts } from './management-system'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/**
 * Datos de la aplicación que acreditan cláusulas del sistema de gestión
 * (B20a). El alcance es el de la Declaración de Aplicabilidad (etiquetas de
 * alcance; sin etiquetas, todos), sin los sistemas retirados.
 */
export async function loadSgaiFacts(fluxion: FluxionClient, organizationId: string): Promise<SgaiFacts> {
  const [{ data: meta }, { data: sistemas }, { data: miembros }, trainings, { data: revisiones }] = await Promise.all([
    fluxion.from('organization_soa_metadata').select('scope_system_tags').eq('organization_id', organizationId).maybeSingle(),
    fluxion.from('ai_systems').select('id, tags, status').eq('organization_id', organizationId),
    fluxion.from('profiles').select('id, is_active').eq('organization_id', organizationId),
    loadTrainings(fluxion, organizationId),
    fluxion.from('committee_sessions').select('ended_at, scheduled_at')
      .eq('organization_id', organizationId).eq('session_type', 'management_review').eq('status', 'completed'),
  ])
  const etiquetas: string[] = (meta?.scope_system_tags as string[] | null) ?? []
  const alcance = ((sistemas ?? []) as Array<{ id: string; tags: string[] | null; status: string | null }>)
    .filter((s) => s.status !== 'retirado')
    .filter((s) => etiquetas.length === 0 || (s.tags ?? []).some((t) => etiquetas.includes(t)))
    .map((s) => s.id)

  const [{ data: evaluaciones }, { data: aisias }] = alcance.length
    ? await Promise.all([
        fluxion.from('fmea_evaluations').select('system_id').eq('organization_id', organizationId).eq('state', 'approved').in('system_id', alcance),
        fluxion.from('documents').select('ai_system_id').eq('organization_id', organizationId).eq('template_key', 'aisia').eq('status', 'approved').in('ai_system_id', alcance),
      ])
    : [{ data: [] }, { data: [] }]

  const activos = ((miembros ?? []) as Array<{ id: string; is_active: boolean | null }>).filter((m) => m.is_active !== false)
  const hoy = new Date().toISOString().slice(0, 10)
  const fechas = ((revisiones ?? []) as Array<{ ended_at: string | null; scheduled_at: string }>)
    .map((r) => r.ended_at ?? r.scheduled_at).sort()

  return {
    inScopeSystems: alcance.length,
    riskEvaluationApproved: new Set(((evaluaciones ?? []) as Array<{ system_id: string }>).map((e) => e.system_id)).size,
    aisiaApproved: new Set(((aisias ?? []) as Array<{ ai_system_id: string }>).map((d) => d.ai_system_id)).size,
    activeMembers: activos.length,
    literacyMembers: activos.filter((m) => hasValidLiteracy(trainings.get(m.id) ?? [], hoy)).length,
    lastManagementReviewAt: fechas.length ? fechas[fechas.length - 1] : null,
  }
}
