import 'server-only'

import { applicabilityFacts, documentApplicability } from '@/lib/documents/applicability'
import { createComplianceClient } from '@/lib/supabase/compliance'
import type { ApprovedDocumentFact, LinkedEvidenceFact, ProposalFacts } from './proposals'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

const PLANTILLAS = ['annex_iv', 'fria', 'eu_registry'] as const

/** Hechos de un sistema para las propuestas de estado de sus obligaciones (B17c). */
export async function loadProposalFacts(fluxion: FluxionClient, aiSystemId: string): Promise<ProposalFacts> {
  const [{ data: evaluaciones }, { data: documentos }, { data: sistema }] = await Promise.all([
    fluxion.from('fmea_evaluations')
      .select('version, approved_at')
      .eq('system_id', aiSystemId).eq('state', 'approved')
      .order('version', { ascending: false }).limit(1),
    fluxion.from('documents')
      .select('id, template_key, version, approved_at')
      .eq('ai_system_id', aiSystemId).eq('status', 'approved')
      .in('template_key', PLANTILLAS as unknown as string[]),
    fluxion.from('ai_systems')
      .select('value_chain_roles, aiact_result, aiact_risk_level, aiact_inputs, is_gpai, manages_critical_infra, processes_personal_data')
      .eq('id', aiSystemId).maybeSingle(),
  ])

  const docs = (documentos ?? []) as Array<{ id: string; template_key: string; version: number; approved_at: string | null }>
  const { data: notificaciones } = docs.length
    ? await fluxion.from('document_notifications').select('document_id').in('document_id', docs.map((d) => d.id))
    : { data: [] }
  const notificados = new Set(((notificaciones ?? []) as Array<{ document_id: string }>).map((n) => n.document_id))

  const approvedDocuments: ProposalFacts['approvedDocuments'] = {}
  for (const d of docs) {
    const key = d.template_key as (typeof PLANTILLAS)[number]
    const actual = approvedDocuments[key]
    if (actual && actual.version >= d.version) continue
    approvedDocuments[key] = {
      version: Number(d.version ?? 1),
      approvedAt: d.approved_at ?? new Date().toISOString(),
      notified: notificados.has(d.id),
    } satisfies ApprovedDocumentFact
  }

  // Tipos de evidencia obligatorios del catálogo, por obligación (B17e1).
  const { data: exigidos } = await createComplianceClient()
    .from('obligation_evidence_types')
    .select('requirement_level, obligations(code), evidence_types(id, name)')
    .eq('requirement_level', 'mandatory')
  const mandatoryEvidenceTypes: Record<string, Array<{ id: string; name: string }>> = {}
  // PostgREST devuelve la relación como objeto o como lista según cómo infiere la clave.
  const uno = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
  for (const r of (exigidos ?? []) as unknown as Array<{
    obligations: { code: string } | { code: string }[] | null
    evidence_types: { id: string; name: string } | { id: string; name: string }[] | null
  }>) {
    const o = uno(r.obligations), t = uno(r.evidence_types)
    if (!o || !t) continue
    ;(mandatoryEvidenceTypes[o.code] ??= []).push(t)
  }

  const e = (evaluaciones ?? [])[0] as { version: number; approved_at: string | null } | undefined
  return {
    mandatoryEvidenceTypes,
    approvedEvaluation: e ? { version: Number(e.version), approvedAt: e.approved_at ?? new Date().toISOString() } : null,
    approvedDocuments,
    euRegistrySection: sistema
      ? documentApplicability('eu_registry', applicabilityFacts(sistema as Record<string, unknown>)).euRegistrySection ?? null
      : null,
  }
}

/** Evidencias vinculadas a cada obligación del sistema, con su estado y su tipo del catálogo (B17e1). */
export async function loadLinkedEvidenceFacts(fluxion: FluxionClient, obligationIds: string[]): Promise<Record<string, LinkedEvidenceFact[]>> {
  if (obligationIds.length === 0) return {}
  const { data } = await fluxion
    .from('system_obligation_evidences')
    .select('obligation_id, system_evidences(status, evidence_type_id)')
    .in('obligation_id', obligationIds)
  const out: Record<string, LinkedEvidenceFact[]> = {}
  type Ev = { status: string; evidence_type_id: string | null }
  for (const r of (data ?? []) as unknown as Array<{ obligation_id: string; system_evidences: Ev | Ev[] | null }>) {
    const e = Array.isArray(r.system_evidences) ? r.system_evidences[0] : r.system_evidences
    if (!e) continue
    ;(out[r.obligation_id] ??= []).push({ status: e.status, typeId: e.evidence_type_id })
  }
  return out
}
