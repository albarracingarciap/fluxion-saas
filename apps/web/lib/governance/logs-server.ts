import 'server-only'

import { logRetentionStatus, type LogControl, type LogRetentionFact, type LogRetentionStatus } from './logs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

export type LogRetentionRow = LogRetentionFact & {
  aiSystemId: string
  evidenceId: string | null
  evidenceTitle: string | null
  notes: string | null
  updatedAt: string
}

const hoy = () => new Date().toISOString().slice(0, 10)

/** Registro de logs declarado de cada sistema (B25c), con el estado de su evidencia. */
export async function loadLogRetention(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, LogRetentionRow>> {
  const out = new Map<string, LogRetentionRow>()
  if (systemIds.length === 0) return out
  const { data } = await fluxion
    .from('system_log_retention')
    .select('ai_system_id, controlled_by, storage_location, retention_months, evidence_id, verified_at, notes, updated_at')
    .eq('organization_id', organizationId)
    .in('ai_system_id', systemIds)
  const filas = (data ?? []) as Array<{
    ai_system_id: string; controlled_by: LogControl; storage_location: string | null; retention_months: number | null
    evidence_id: string | null; verified_at: string | null; notes: string | null; updated_at: string
  }>
  const evidenceIds = Array.from(new Set(filas.map((f) => f.evidence_id).filter((id): id is string => Boolean(id))))
  const { data: evidencias } = evidenceIds.length
    ? await fluxion.from('system_evidences').select('id, title, status').eq('organization_id', organizationId).in('id', evidenceIds)
    : { data: [] }
  const evid = new Map(((evidencias ?? []) as Array<{ id: string; title: string; status: string }>).map((e) => [e.id, e]))

  for (const f of filas) {
    const e = f.evidence_id ? evid.get(f.evidence_id) : undefined
    out.set(f.ai_system_id, {
      aiSystemId: f.ai_system_id,
      controlledBy: f.controlled_by,
      storageLocation: f.storage_location,
      retentionMonths: f.retention_months,
      verifiedAt: f.verified_at,
      evidenceId: f.evidence_id,
      evidenceTitle: e?.title ?? null,
      evidenceStatus: e?.status ?? null,
      notes: f.notes,
      updatedAt: f.updated_at,
    })
  }
  return out
}

/** Estado del registro de logs de cada sistema (Art. 26.6). */
export async function loadLogRetentionStatus(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, LogRetentionStatus>> {
  const filas = await loadLogRetention(fluxion, organizationId, systemIds)
  const today = hoy()
  return new Map(systemIds.map((id) => [id, logRetentionStatus(filas.get(id) ?? null, today)]))
}
