'use server'

import { revalidatePath } from 'next/cache'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { logAuditEvent } from '@/lib/audit'
import { hasAnyRole } from '@/lib/auth/roles'
import { parseHitlCsv } from '@/lib/hitl/csv'
import { insertHitlDecisions } from '@/lib/hitl/ingest'
import { generateHitlReportEvidence } from '@/lib/hitl/report-server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { createClient } from '@/lib/supabase/server'

/**
 * Supervisión humana (B30b, DP-13): importar decisiones desde CSV y generar el
 * informe de un sistema como evidencia. Lo hacen quienes documentan la
 * supervisión de los sistemas (B24): Administrador, Responsable del SGAI y
 * Responsable del sistema.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const

async function ctx() {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, full_name, email, role, roles')
    .eq('user_id', user.id)
    .single()
  if (!profile || !hasAnyRole(profile, EDIT_ROLES)) return null
  return { fluxion, profile, userId: user.id }
}

export type HitlImportResult = {
  accepted: number
  duplicates: number
  rejected: number
  /** Primeros errores, con el número de fila del fichero (la cabecera es la 1). */
  errors: Array<{ row: number; error: string }>
}

export async function importHitlCsv(input: { text: string; systemId: string | null }): Promise<HitlImportResult | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema importan decisiones.' }
  const parsed = parseHitlCsv(input.text, input.systemId || null)
  if ('error' in parsed) return { error: parsed.error }

  const res = await insertHitlDecisions(createNoCacheAdminClient(), c.profile.organization_id, parsed.rows, {
    apiKeyId: null,
    metadata: { source: 'csv_import', imported_by: c.profile.id },
  })
  void logAuditEvent({
    organization_id: c.profile.organization_id,
    actor_id: c.profile.id,
    actor_name: c.profile.full_name ?? undefined,
    actor_email: c.profile.email ?? undefined,
    action: 'system.hitl_decisions_imported',
    target_type: 'organization',
    target_id: input.systemId ?? undefined,
    metadata: { accepted: res.accepted, duplicates: res.duplicates, rejected: res.rejected },
  })
  revalidatePath('/supervision')
  return {
    accepted: res.accepted,
    duplicates: res.duplicates,
    rejected: res.rejected,
    errors: res.results.filter((r) => !r.accepted && !r.duplicate).slice(0, 20).map((r) => ({ row: r.index + 2, error: r.error ?? 'Rechazada' })),
  }
}

export async function generateHitlReport(input: { systemId: string; from: string; to: string }): Promise<{ evidenceId: string } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema generan el informe.' }
  if (input.to > new Date().toISOString().slice(0, 10)) return { error: 'El periodo no puede terminar en el futuro.' }
  const res = await generateHitlReportEvidence({
    organizationId: c.profile.organization_id, systemId: input.systemId, from: input.from, to: input.to, actorUserId: c.userId,
  })
  if (!res.evidenceId) return { error: res.aviso ?? 'No se pudo generar el informe.' }

  await insertAiSystemHistoryEvents(c.fluxion, [{
    ai_system_id: input.systemId,
    organization_id: c.profile.organization_id,
    event_type: 'hitl_report_generated',
    event_title: 'Informe de supervisión humana generado',
    event_summary: `Periodo del ${input.from} al ${input.to}: ${res.decisions ?? 0} decisiones.`,
    payload: { evidence_id: res.evidenceId, from: input.from, to: input.to },
    actor_user_id: c.userId,
  }])
  void logAuditEvent({
    organization_id: c.profile.organization_id,
    actor_id: c.profile.id,
    actor_name: c.profile.full_name ?? undefined,
    actor_email: c.profile.email ?? undefined,
    action: 'system.hitl_report_generated',
    target_type: 'organization',
    target_id: input.systemId,
    metadata: { from: input.from, to: input.to, evidence_id: res.evidenceId },
  })
  revalidatePath('/supervision')
  return { evidenceId: res.evidenceId }
}
