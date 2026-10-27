import 'server-only'

import { createComplianceClient } from '@/lib/supabase/compliance'
import {
  soaControlProposal,
  templatesBySoaCode,
  type PlanControlFact,
  type SoaProposal,
  type SoaProposalControl,
} from './proposals'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/**
 * Hechos de la organización para las propuestas de la Declaración (B17e2):
 * la correspondencia plantilla → Anexo A y las acciones de los planes de
 * tratamiento con un control. El cliente debe filtrar por organización (se usa
 * también con service role).
 */
export async function loadSoaProposalFacts(fluxion: FluxionClient, organizationId: string): Promise<{
  templatesByCode: Record<string, string[]>
  facts: PlanControlFact[]
}> {
  const [{ data: correspondencia }, { data: acciones }] = await Promise.all([
    createComplianceClient()
      .from('control_template_soa_controls')
      .select('template_id, soa_control_code'),
    fluxion.from('treatment_actions')
      .select('option, status, control_id, evidence_id')
      .eq('organization_id', organizationId)
      .eq('option', 'mitigar')
      .eq('status', 'completed')
      .not('control_id', 'is', null),
  ])

  const filas = (acciones ?? []) as Array<{ option: string; status: string; control_id: string; evidence_id: string | null }>
  const controlIds = Array.from(new Set(filas.map((a) => a.control_id)))
  const evidenceIds = Array.from(new Set(filas.map((a) => a.evidence_id).filter((id): id is string => Boolean(id))))

  const [{ data: controles }, { data: evidencias }] = await Promise.all([
    controlIds.length
      ? fluxion.from('controls').select('id, system_id, template_id').eq('organization_id', organizationId).in('id', controlIds)
      : { data: [] },
    evidenceIds.length
      ? fluxion.from('system_evidences').select('id, status').eq('organization_id', organizationId).in('id', evidenceIds)
      : { data: [] },
  ])

  const templateIds = Array.from(new Set(
    ((controles ?? []) as Array<{ template_id: string | null }>).map((c) => c.template_id).filter((id): id is string => Boolean(id)),
  ))
  const { data: plantillas } = templateIds.length
    ? await createComplianceClient().from('control_templates').select('id, code').in('id', templateIds)
    : { data: [] }

  const controlMap = new Map(((controles ?? []) as Array<{ id: string; system_id: string; template_id: string | null }>).map((c) => [c.id, c]))
  const evidenceStatus = new Map(((evidencias ?? []) as Array<{ id: string; status: string }>).map((e) => [e.id, e.status]))
  const templateCode = new Map(((plantillas ?? []) as Array<{ id: string; code: string }>).map((t) => [t.id, t.code]))

  const facts: PlanControlFact[] = []
  for (const a of filas) {
    const c = controlMap.get(a.control_id)
    if (!c) continue
    facts.push({
      systemId: c.system_id,
      templateId: c.template_id,
      templateCode: c.template_id ? templateCode.get(c.template_id) ?? null : null,
      option: a.option,
      status: a.status,
      evidenceStatus: a.evidence_id ? evidenceStatus.get(a.evidence_id) ?? null : null,
    })
  }

  return {
    templatesByCode: templatesBySoaCode((correspondencia ?? []) as Array<{ template_id: string; soa_control_code: string }>),
    facts,
  }
}

/** Propuesta de cada control del Anexo A de la organización, por código. */
export async function loadSoaProposals(
  fluxion: FluxionClient,
  organizationId: string,
  controls: readonly SoaProposalControl[],
  systemNames: Readonly<Record<string, string>>,
): Promise<Record<string, SoaProposal>> {
  const candidatos = controls.filter((c) => c.isApplicable && c.linkedSystemIds.length > 0)
  if (candidatos.length === 0) return {}
  const { templatesByCode, facts } = await loadSoaProposalFacts(fluxion, organizationId)
  const out: Record<string, SoaProposal> = {}
  for (const c of candidatos) {
    const p = soaControlProposal(c, templatesByCode, facts, systemNames)
    if (p) out[c.code] = p
  }
  return out
}
