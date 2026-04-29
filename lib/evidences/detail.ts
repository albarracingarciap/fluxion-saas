import { createFluxionClient } from '@/lib/supabase/fluxion'
import { computeVersionDiff, getChangeTypeLabel, type EvidenceVersionRecord } from './versions'

// ─── Raw DB types ────────────────────────────────────────────────────────────

type EvidenceDetailRow = {
  id: string
  ai_system_id: string | null
  scope: 'system' | 'organization'
  title: string
  description: string | null
  evidence_type: string
  status: string
  storage_path: string | null
  external_url: string | null
  version: string | null
  owner_user_id: string | null
  reviewed_by: string | null
  issued_at: string | null
  expires_at: string | null
  reviewed_at: string | null
  validation_notes: string | null
  created_at: string
  updated_at: string
  tags: string[]
  organization_id: string
}

type SystemRow = {
  id: string
  name: string
  internal_id: string | null
  status: string
  domain: string
  aiact_risk_level: string
}

type ObligationLinkRow = {
  obligation_id: string
  system_obligations: {
    id: string
    obligation_code: string
    title: string
    status: string
    priority: string | null
    ai_system_id: string
  } | null
}

type FailureModeEvidenceLinkRow = {
  system_failure_mode_id: string
  system_failure_modes: {
    id: string
    failure_mode_id: string
    priority_status: string
    ai_system_id: string
    failure_modes: {
      code: string
      name: string
    } | null
  } | null
}

type HistoryEventRow = {
  id: string
  event_type: string
  event_title: string
  event_summary: string | null
  payload: Record<string, unknown>
  actor_user_id: string | null
  created_at: string
}

type ProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

// ─── Public types ────────────────────────────────────────────────────────────

export type EvidenceLinkedObligation = {
  id: string
  obligation_code: string
  title: string
  status: string
  priority: string | null
  system_id: string
}

export type EvidenceLinkedFailureMode = {
  system_failure_mode_id: string
  failure_mode_id: string
  code: string
  name: string
  priority_status: string
  system_id: string
}

export type EvidenceHistoryEvent = {
  id: string
  event_type: string
  event_title: string
  event_summary: string | null
  actor_name: string | null
  created_at: string
}

export type EvidenceVersionWithDiff = EvidenceVersionRecord & {
  diffs: ReturnType<typeof computeVersionDiff>
}

export type EvidenceDetail = {
  id: string
  scope: 'system' | 'organization'
  organization_id: string
  system_id: string | null
  system_name: string | null
  system_code: string | null
  system_status: string | null
  system_domain: string | null
  title: string
  description: string | null
  evidence_type: string
  status: string
  storage_path: string | null
  external_url: string | null
  version: string | null
  tags: string[]
  owner_id: string | null
  owner_name: string | null
  reviewed_by: string | null
  reviewer_name: string | null
  issued_at: string | null
  expires_at: string | null
  reviewed_at: string | null
  validation_notes: string | null
  created_at: string
  updated_at: string
  obligations: EvidenceLinkedObligation[]
  failure_modes: EvidenceLinkedFailureMode[]
  versions: EvidenceVersionWithDiff[]
  history_events: EvidenceHistoryEvent[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatName(p: ProfileRow | undefined): string | null {
  if (!p) return null
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || null
}

function getSystemCode(s: SystemRow): string {
  return s.internal_id ? s.internal_id.toUpperCase() : s.name.slice(0, 4).toUpperCase()
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getEvidenceDetail(
  evidenceId: string,
  organizationId: string,
): Promise<EvidenceDetail | null> {
  const fluxion = createFluxionClient()

  // 1. Evidence base
  const { data: evidence, error: evError } = await fluxion
    .from('system_evidences')
    .select(
      'id, ai_system_id, scope, title, description, evidence_type, status, storage_path, external_url, version, owner_user_id, reviewed_by, issued_at, expires_at, reviewed_at, validation_notes, created_at, updated_at, tags, organization_id',
    )
    .eq('id', evidenceId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (evError || !evidence) return null
  const ev = evidence as EvidenceDetailRow

  // Parallel fetches
  const [
    systemResult,
    obligationsResult,
    failureModesResult,
    versionsResult,
    historyResult,
  ] = await Promise.all([
    // 2. System (only if scope=system)
    ev.ai_system_id
      ? fluxion
          .from('ai_systems')
          .select('id, name, internal_id, status, domain, aiact_risk_level')
          .eq('id', ev.ai_system_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),

    // 3. Linked obligations
    fluxion
      .from('system_obligation_evidences')
      .select('obligation_id, system_obligations(id, obligation_code, title, status, priority, ai_system_id)')
      .eq('evidence_id', evidenceId),

    // 4. Linked failure modes (bridge → system_failure_modes → failure_modes catalog)
    fluxion
      .from('system_failure_mode_evidences')
      .select(
        'system_failure_mode_id, system_failure_modes(id, failure_mode_id, priority_status, ai_system_id, failure_modes(code, name))',
      )
      .eq('evidence_id', evidenceId),

    // 5. Version history
    fluxion
      .from('system_evidence_versions')
      .select(
        'id, evidence_id, changed_by, changed_at, change_type, title, description, evidence_type, status, external_url, version, issued_at, expires_at, validation_notes',
      )
      .eq('evidence_id', evidenceId)
      .order('changed_at', { ascending: false }),

    // 6. History events mentioning this evidence in payload
    fluxion
      .from('ai_system_history')
      .select('id, event_type, event_title, event_summary, payload, actor_user_id, created_at')
      .eq('organization_id', organizationId)
      .filter('payload->>evidence_id', 'eq', evidenceId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const system = systemResult.data as SystemRow | null

  // Collect all profile IDs to resolve names
  const profileIds = new Set<string>()
  if (ev.owner_user_id) profileIds.add(ev.owner_user_id)
  if (ev.reviewed_by) profileIds.add(ev.reviewed_by)
  const versionRows = (versionsResult.data ?? []) as EvidenceVersionRecord[]
  versionRows.forEach((v) => { if (v.changed_by) profileIds.add(v.changed_by) })
  ;(historyResult.data ?? []).forEach((h: HistoryEventRow) => { if (h.actor_user_id) profileIds.add(h.actor_user_id) })

  const ids = Array.from(profileIds)
  const { data: profiles } = ids.length > 0
    ? await fluxion
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', ids)
    : { data: [] }

  const profileMap = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  )

  // Supabase returns related records as arrays (PostgREST FK joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obligationLinks = (obligationsResult.data ?? []) as unknown as ObligationLinkRow[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmLinks = (failureModesResult.data ?? []) as unknown as FailureModeEvidenceLinkRow[]

  const obligations: EvidenceLinkedObligation[] = obligationLinks.flatMap((link) => {
    const ob = Array.isArray(link.system_obligations)
      ? link.system_obligations[0]
      : link.system_obligations
    if (!ob) return []
    return [{
      id: ob.id,
      obligation_code: ob.obligation_code,
      title: ob.title,
      status: ob.status,
      priority: ob.priority,
      system_id: ob.ai_system_id,
    }]
  })

  const failure_modes: EvidenceLinkedFailureMode[] = fmLinks.flatMap((link) => {
    const sfm = Array.isArray(link.system_failure_modes)
      ? link.system_failure_modes[0]
      : link.system_failure_modes
    if (!sfm) return []
    const fm = Array.isArray(sfm.failure_modes) ? sfm.failure_modes[0] : sfm.failure_modes
    return [{
      system_failure_mode_id: sfm.id,
      failure_mode_id: sfm.failure_mode_id,
      code: fm?.code ?? '—',
      name: fm?.name ?? '—',
      priority_status: sfm.priority_status,
      system_id: sfm.ai_system_id,
    }]
  })

  // Versions with computed diffs (newest first — diff vs what came after)
  const versionsWithDiff: EvidenceVersionWithDiff[] = versionRows.map((v, idx) => {
    const afterState: EvidenceVersionRecord | null =
      idx === 0
        ? ({
            title: ev.title,
            description: ev.description,
            evidence_type: ev.evidence_type,
            status: ev.status,
            external_url: ev.external_url,
            version: ev.version,
            issued_at: ev.issued_at,
            expires_at: ev.expires_at,
            validation_notes: ev.validation_notes,
          } as EvidenceVersionRecord)
        : versionRows[idx - 1]
    return { ...v, change_type: v.change_type, diffs: afterState ? computeVersionDiff(v, afterState) : [] }
  })

  // History events
  const history_events: EvidenceHistoryEvent[] = ((historyResult.data ?? []) as HistoryEventRow[]).map((h) => ({
    id: h.id,
    event_type: h.event_type,
    event_title: h.event_title,
    event_summary: h.event_summary,
    actor_name: h.actor_user_id ? formatName(profileMap.get(h.actor_user_id)) : null,
    created_at: h.created_at,
  }))

  return {
    id: ev.id,
    scope: ev.scope,
    organization_id: ev.organization_id,
    system_id: ev.ai_system_id,
    system_name: system?.name ?? null,
    system_code: system ? getSystemCode(system) : null,
    system_status: system?.status ?? null,
    system_domain: system?.domain ?? null,
    title: ev.title,
    description: ev.description,
    evidence_type: ev.evidence_type,
    status: ev.status,
    storage_path: ev.storage_path,
    external_url: ev.external_url,
    version: ev.version,
    tags: ev.tags ?? [],
    owner_id: ev.owner_user_id,
    owner_name: formatName(profileMap.get(ev.owner_user_id ?? '')),
    reviewed_by: ev.reviewed_by,
    reviewer_name: formatName(profileMap.get(ev.reviewed_by ?? '')),
    issued_at: ev.issued_at,
    expires_at: ev.expires_at,
    reviewed_at: ev.reviewed_at,
    validation_notes: ev.validation_notes,
    created_at: ev.created_at,
    updated_at: ev.updated_at,
    obligations,
    failure_modes,
    versions: versionsWithDiff,
    history_events,
  }
}
