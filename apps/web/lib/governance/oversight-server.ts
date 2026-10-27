import 'server-only'

import {
  hasValidOversightTraining,
  oversightDocumentation,
  type OversightCheck,
  type TrainingFact,
  type TrainingKind,
} from './oversight'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

export type TrainingRow = TrainingFact & {
  id: string
  profileId: string
  title: string
  provider: string | null
  evidenceId: string | null
  evidenceTitle: string | null
}

const hoy = () => new Date().toISOString().slice(0, 10)

/** Formaciones de la organización (o de unas personas), con el estado de su evidencia. */
export async function loadTrainings(
  fluxion: FluxionClient,
  organizationId: string,
  profileIds?: readonly string[],
): Promise<Map<string, TrainingRow[]>> {
  let q = fluxion
    .from('member_trainings')
    .select('id, profile_id, kind, ai_system_id, title, provider, completed_at, expires_at, evidence_id')
    .eq('organization_id', organizationId)
    .order('completed_at', { ascending: false })
  if (profileIds) {
    if (profileIds.length === 0) return new Map()
    q = q.in('profile_id', profileIds)
  }
  const { data } = await q
  const filas = (data ?? []) as Array<{
    id: string; profile_id: string; kind: TrainingKind; ai_system_id: string | null; title: string
    provider: string | null; completed_at: string; expires_at: string | null; evidence_id: string | null
  }>

  const evidenceIds = Array.from(new Set(filas.map((f) => f.evidence_id).filter((id): id is string => Boolean(id))))
  const { data: evidencias } = evidenceIds.length
    ? await fluxion.from('system_evidences').select('id, title, status').eq('organization_id', organizationId).in('id', evidenceIds)
    : { data: [] }
  const evid = new Map(((evidencias ?? []) as Array<{ id: string; title: string; status: string }>).map((e) => [e.id, e]))

  const out = new Map<string, TrainingRow[]>()
  for (const f of filas) {
    const e = f.evidence_id ? evid.get(f.evidence_id) : undefined
    const row: TrainingRow = {
      id: f.id,
      profileId: f.profile_id,
      kind: f.kind,
      aiSystemId: f.ai_system_id,
      title: f.title,
      provider: f.provider,
      completedAt: f.completed_at,
      expiresAt: f.expires_at,
      evidenceId: f.evidence_id,
      evidenceTitle: e?.title ?? null,
      evidenceStatus: e?.status ?? null,
    }
    ;(out.get(f.profile_id) ?? out.set(f.profile_id, []).get(f.profile_id)!).push(row)
  }
  return out
}

export type SystemOversightStatus = { documented: boolean; checks: OversightCheck[] }

/** Supervisión humana documentada de cada sistema (Art. 26.2). */
export async function loadOversightStatus(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, SystemOversightStatus>> {
  const out = new Map<string, SystemOversightStatus>()
  if (systemIds.length === 0) return out

  const { data: sistemas } = await fluxion
    .from('ai_systems')
    .select('id, human_oversight_owner_id, oversight_measures')
    .eq('organization_id', organizationId)
    .in('id', systemIds)
  const filas = (sistemas ?? []) as Array<{ id: string; human_oversight_owner_id: string | null; oversight_measures: string | null }>
  const owners = Array.from(new Set(filas.map((s) => s.human_oversight_owner_id).filter((id): id is string => Boolean(id))))

  const [{ data: docs }, trainings] = await Promise.all([
    owners.length
      ? fluxion.from('system_oversight_documentation')
          .select('ai_system_id, profile_id, competence, authority_confirmed')
          .eq('organization_id', organizationId)
          .in('ai_system_id', systemIds)
          .in('profile_id', owners)
      : { data: [] },
    loadTrainings(fluxion, organizationId, owners),
  ])
  const docDe = new Map(((docs ?? []) as Array<{ ai_system_id: string; profile_id: string; competence: string | null; authority_confirmed: boolean }>)
    .map((d) => [`${d.ai_system_id}:${d.profile_id}`, d]))

  const today = hoy()
  for (const s of filas) {
    const owner = s.human_oversight_owner_id
    const doc = owner ? docDe.get(`${s.id}:${owner}`) : undefined
    out.set(s.id, oversightDocumentation({
      ownerId: owner,
      ownerDoc: doc ? { competence: doc.competence, authorityConfirmed: doc.authority_confirmed } : null,
      ownerTrained: owner ? hasValidOversightTraining(trainings.get(owner) ?? [], s.id, today) : false,
      measures: s.oversight_measures,
    }))
  }
  return out
}
