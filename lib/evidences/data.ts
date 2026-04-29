import { createFluxionClient } from '@/lib/supabase/fluxion'

type EvidenceSystemRow = {
  id: string
  name: string
  internal_id: string | null
  status: string
  domain: string
  aiact_risk_level: string
}

type EvidenceRow = {
  id: string
  ai_system_id: string | null
  scope: 'system' | 'organization'
  title: string
  description: string | null
  evidence_type: string
  status: 'draft' | 'valid' | 'expired' | 'pending_review' | 'rejected'
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
}

type EvidenceProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
}

type EvidenceObligationLinkRow = {
  obligation_id: string
  evidence_id: string
}

type EvidenceSnapshotRow = {
  id: string
  ai_system_id: string | null
  report_type: string
  title: string
  created_at: string
}

export type EvidenceOrigin =
  | 'manual'
  | 'gap_report'
  | 'technical_dossier'
  | 'eu_registry'
  | 'gap_analysis'
  | 'snapshot'
  | 'unknown'

export type OrganizationEvidenceRecord = {
  id: string
  scope: 'system' | 'organization'
  system_id: string
  system_name: string
  system_code: string
  system_status: string
  system_domain: string
  aiact_risk_level: string
  title: string
  description: string | null
  evidence_type: string
  status: EvidenceRow['status']
  storage_path: string | null
  external_url: string | null
  version: string | null
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
  days_until_expiry: number | null
  linked_obligations_count: number
  is_orphan: boolean
  origin: EvidenceOrigin
  origin_label: string
  snapshot_id: string | null
  snapshot_url: string | null
  system_url: string
  quick_action_label: string
  quick_action_url: string
  detail_url: string
}

export type EvidenceSummary = {
  total: number
  valid: number
  draft: number
  pending_review: number
  expired: number
  rejected: number
  unassigned: number
  without_expiry: number
  orphan: number
  systems_affected: number
  coverage_score: number
  traceability_score: number | null
  by_origin: Record<EvidenceOrigin, number>
  by_status: Record<EvidenceRow['status'], number>
  by_type: Array<{ evidence_type: string; count: number }>
}

export type EvidenceSystemOverview = {
  system_id: string
  system_name: string
  system_code: string
  total: number
  valid: number
  pending_review: number
  expired: number
  orphan: number
}

export type EvidenceDataResult = {
  evidences: OrganizationEvidenceRecord[]
  summary: EvidenceSummary
  systems: EvidenceSystemOverview[]
  relation_access_limited: boolean
}

function getSystemCode(system: EvidenceSystemRow) {
  return system.internal_id ?? system.name
}

function formatPersonName(profile: EvidenceProfileRow | undefined) {
  if (!profile) return null
  return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Usuario'
}

function getDaysUntil(dateString: string | null, now: Date) {
  if (!dateString) return null
  const target = new Date(`${dateString}T00:00:00`)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function inferSnapshotId(externalUrl: string | null) {
  if (!externalUrl) return null
  const match = externalUrl.match(/\/snapshots\/([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

function getOriginFromSnapshotType(reportType: string | null): EvidenceOrigin {
  if (reportType === 'gap_report') return 'gap_report'
  if (reportType === 'technical_dossier') return 'technical_dossier'
  if (reportType === 'eu_registry') return 'eu_registry'
  if (reportType === 'gap_analysis') return 'gap_analysis'
  if (reportType) return 'snapshot'
  return 'unknown'
}

function getOriginLabel(origin: EvidenceOrigin) {
  switch (origin) {
    case 'manual':
      return 'Carga manual'
    case 'gap_report':
      return 'Gap report'
    case 'technical_dossier':
      return 'Dossier técnico'
    case 'eu_registry':
      return 'Registro EU'
    case 'gap_analysis':
      return 'Análisis de gaps'
    case 'snapshot':
      return 'Snapshot'
    case 'unknown':
    default:
      return 'Origen no identificado'
  }
}

function getSnapshotUrl(systemId: string, snapshotId: string, origin: EvidenceOrigin) {
  if (origin === 'gap_report') return `/inventario/${systemId}/gap-report/snapshots/${snapshotId}`
  if (origin === 'technical_dossier') {
    return `/inventario/${systemId}/technical-dossier/snapshots/${snapshotId}`
  }
  if (origin === 'eu_registry') return `/inventario/${systemId}/eu-registry/snapshots/${snapshotId}`
  if (origin === 'gap_analysis') return `/gaps/snapshots/${snapshotId}`
  return null
}

function getQuickAction(params: {
  systemId: string
  snapshotId: string | null
  origin: EvidenceOrigin
}) {
  if (params.snapshotId) {
    const snapshotUrl = getSnapshotUrl(params.systemId, params.snapshotId, params.origin)
    if (snapshotUrl) {
      return {
        label:
          params.origin === 'gap_report'
            ? 'Abrir gap report'
            : params.origin === 'technical_dossier'
              ? 'Abrir dossier'
              : params.origin === 'eu_registry'
                ? 'Abrir registro EU'
                : params.origin === 'gap_analysis'
                  ? 'Abrir snapshot'
                  : 'Abrir snapshot',
        url: snapshotUrl,
      }
    }
  }

  return {
    label: 'Ver sistema',
    url: `/inventario/${params.systemId}`,
  }
}

function inferEvidenceOrigin(params: {
  evidence: EvidenceRow
  snapshotType: string | null
}): EvidenceOrigin {
  if (params.snapshotType) {
    return getOriginFromSnapshotType(params.snapshotType)
  }

  if (params.evidence.evidence_type === 'technical_doc') {
    return 'technical_dossier'
  }

  if (params.evidence.evidence_type === 'report') {
    return 'snapshot'
  }

  if (params.evidence.storage_path || params.evidence.external_url) {
    return 'manual'
  }

  return 'unknown'
}

export async function buildEvidencesData(organizationId: string): Promise<EvidenceDataResult> {
  const fluxion = createFluxionClient()
  const now = new Date()

  const [systemsResult, evidencesResult, snapshotsResult] = await Promise.all([
    fluxion
      .from('ai_systems')
      .select('id, name, internal_id, status, domain, aiact_risk_level')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    fluxion
      .from('system_evidences')
      .select(
        'id, ai_system_id, scope, title, description, evidence_type, status, storage_path, external_url, version, owner_user_id, reviewed_by, issued_at, expires_at, reviewed_at, validation_notes, created_at, updated_at'
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    fluxion
      .from('system_report_snapshots')
      .select('id, ai_system_id, report_type, title, created_at')
      .eq('organization_id', organizationId),
  ])

  if (systemsResult.error) {
    throw new Error(`No se pudieron cargar los sistemas para evidencias: ${systemsResult.error.message}`)
  }
  if (evidencesResult.error) {
    throw new Error(`No se pudieron cargar las evidencias: ${evidencesResult.error.message}`)
  }
  if (snapshotsResult.error) {
    throw new Error(`No se pudieron cargar los snapshots de informes: ${snapshotsResult.error.message}`)
  }

  const systems = (systemsResult.data ?? []) as EvidenceSystemRow[]
  const evidences = (evidencesResult.data ?? []) as EvidenceRow[]
  const snapshots = (snapshotsResult.data ?? []) as EvidenceSnapshotRow[]

  const evidenceIds = evidences.map((row) => row.id)
  let obligationLinks: EvidenceObligationLinkRow[] = []
  let relationAccessLimited = false

  if (evidenceIds.length > 0) {
    const { data: obligationLinksResult, error: obligationLinksError } = await fluxion
      .from('system_obligation_evidences')
      .select('obligation_id, evidence_id')
      .in('evidence_id', evidenceIds)

    if (obligationLinksError) {
      relationAccessLimited = true
    } else {
      obligationLinks = (obligationLinksResult ?? []) as EvidenceObligationLinkRow[]
    }
  }

  const profileIds = Array.from(
    new Set(
      evidences.flatMap((row) =>
        [row.owner_user_id, row.reviewed_by].filter((value): value is string => Boolean(value))
      )
    )
  )

  const { data: profilesResult, error: profilesError } = await fluxion
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000'])

  if (profilesError && profileIds.length > 0) {
    throw new Error(`No se pudieron cargar los perfiles de evidencias: ${profilesError.message}`)
  }

  const profileMap = new Map(((profilesResult ?? []) as EvidenceProfileRow[]).map((row) => [row.id, row]))
  const systemMap = new Map(systems.map((row) => [row.id, row]))
  const obligationCounts = new Map<string, number>()
  const snapshotById = new Map(snapshots.map((row) => [row.id, row]))

  for (const link of obligationLinks) {
    obligationCounts.set(link.evidence_id, (obligationCounts.get(link.evidence_id) ?? 0) + 1)
  }

  const records: OrganizationEvidenceRecord[] = evidences
    .map((evidence): OrganizationEvidenceRecord | null => {
      const daysUntilExpiry = getDaysUntil(evidence.expires_at, now)
      const linkedObligationsCount = obligationCounts.get(evidence.id) ?? 0
      const isOrgScope = evidence.scope === 'organization' || !evidence.ai_system_id

      if (isOrgScope) {
        const origin = inferEvidenceOrigin({ evidence, snapshotType: null })
        return {
          id: evidence.id,
          scope: 'organization' as const,
          system_id: '',
          system_name: 'Organización',
          system_code: 'ORG',
          system_status: 'active',
          system_domain: 'organization',
          aiact_risk_level: 'N/A',
          title: evidence.title,
          description: evidence.description,
          evidence_type: evidence.evidence_type,
          status: evidence.status,
          storage_path: evidence.storage_path,
          external_url: evidence.external_url,
          version: evidence.version,
          owner_id: evidence.owner_user_id,
          owner_name: formatPersonName(profileMap.get(evidence.owner_user_id ?? '')),
          reviewed_by: evidence.reviewed_by,
          reviewer_name: formatPersonName(profileMap.get(evidence.reviewed_by ?? '')),
          issued_at: evidence.issued_at,
          expires_at: evidence.expires_at,
          reviewed_at: evidence.reviewed_at,
          validation_notes: evidence.validation_notes,
          created_at: evidence.created_at,
          updated_at: evidence.updated_at,
          days_until_expiry: daysUntilExpiry,
          linked_obligations_count: linkedObligationsCount,
          is_orphan: linkedObligationsCount === 0,
          origin,
          origin_label: getOriginLabel(origin),
          snapshot_id: null,
          snapshot_url: null,
          system_url: '/evidencias',
          quick_action_label: 'Ver evidencias',
          quick_action_url: '/evidencias',
          detail_url: '/evidencias',
        }
      }

      const system = systemMap.get(evidence.ai_system_id!)
      if (!system) return null

      const snapshotId = inferSnapshotId(evidence.external_url)
      const snapshot = snapshotId ? snapshotById.get(snapshotId) ?? null : null
      const origin = inferEvidenceOrigin({
        evidence,
        snapshotType: snapshot?.report_type ?? null,
      })
      const snapshotUrl = snapshotId ? getSnapshotUrl(system.id, snapshotId, origin) : null
      const quickAction = getQuickAction({
        systemId: system.id,
        snapshotId,
        origin,
      })

      return {
        id: evidence.id,
        scope: 'system' as const,
        system_id: system.id,
        system_name: system.name,
        system_code: getSystemCode(system),
        system_status: system.status,
        system_domain: system.domain,
        aiact_risk_level: system.aiact_risk_level,
        title: evidence.title,
        description: evidence.description,
        evidence_type: evidence.evidence_type,
        status: evidence.status,
        storage_path: evidence.storage_path,
        external_url: evidence.external_url,
        version: evidence.version,
        owner_id: evidence.owner_user_id,
        owner_name: formatPersonName(profileMap.get(evidence.owner_user_id ?? '')),
        reviewed_by: evidence.reviewed_by,
        reviewer_name: formatPersonName(profileMap.get(evidence.reviewed_by ?? '')),
        issued_at: evidence.issued_at,
        expires_at: evidence.expires_at,
        reviewed_at: evidence.reviewed_at,
        validation_notes: evidence.validation_notes,
        created_at: evidence.created_at,
        updated_at: evidence.updated_at,
        days_until_expiry: daysUntilExpiry,
        linked_obligations_count: linkedObligationsCount,
        is_orphan: linkedObligationsCount === 0,
        origin,
        origin_label: getOriginLabel(origin),
        snapshot_id: snapshot?.id ?? null,
        snapshot_url: snapshotUrl,
        system_url: `/inventario/${system.id}`,
        quick_action_label: quickAction.label,
        quick_action_url: quickAction.url,
        detail_url: `/inventario/${system.id}?tab=evidencias`,
      }
    })
    .filter((value): value is OrganizationEvidenceRecord => value !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const byOrigin: Record<EvidenceOrigin, number> = {
    manual: 0,
    gap_report: 0,
    technical_dossier: 0,
    eu_registry: 0,
    gap_analysis: 0,
    snapshot: 0,
    unknown: 0,
  }

  const byStatus: Record<EvidenceRow['status'], number> = {
    draft: 0,
    valid: 0,
    expired: 0,
    pending_review: 0,
    rejected: 0,
  }

  const typeCounts = new Map<string, number>()

  for (const record of records) {
    byOrigin[record.origin] += 1
    byStatus[record.status] += 1
    typeCounts.set(record.evidence_type, (typeCounts.get(record.evidence_type) ?? 0) + 1)
  }

  const systemsOverview = systems
    .map<EvidenceSystemOverview>((system) => {
      const systemRecords = records.filter((record) => record.system_id === system.id)
      return {
        system_id: system.id,
        system_name: system.name,
        system_code: getSystemCode(system),
        total: systemRecords.length,
        valid: systemRecords.filter((record) => record.status === 'valid').length,
        pending_review: systemRecords.filter((record) => record.status === 'pending_review').length,
        expired: systemRecords.filter(
          (record) =>
            record.status === 'expired' ||
            (typeof record.days_until_expiry === 'number' && record.days_until_expiry < 0)
        ).length,
        orphan: systemRecords.filter((record) => record.is_orphan).length,
      }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)

  return {
    evidences: records,
    summary: {
      total: records.length,
      valid: records.filter((record) => record.status === 'valid').length,
      draft: records.filter((record) => record.status === 'draft').length,
      pending_review: records.filter((record) => record.status === 'pending_review').length,
      expired: records.filter(
        (record) =>
          record.status === 'expired' ||
          (typeof record.days_until_expiry === 'number' && record.days_until_expiry < 0)
      ).length,
      rejected: records.filter((record) => record.status === 'rejected').length,
      unassigned: records.filter((record) => !record.owner_id).length,
      without_expiry: records.filter((record) => !record.expires_at).length,
      orphan: records.filter((record) => record.is_orphan).length,
      systems_affected: new Set(records.map((record) => record.system_id)).size,
      coverage_score:
        records.length === 0
          ? 0
          : Math.round(
              ((records.filter((record) => record.status === 'valid').length +
                records.filter((record) => record.status === 'pending_review').length * 0.5) /
                records.length) *
                100
            ),
      traceability_score:
        relationAccessLimited || records.length === 0
          ? null
          : Math.round(
              (records.filter((record) => !record.is_orphan).length / records.length) * 100
            ),
      by_origin: byOrigin,
      by_status: byStatus,
      by_type: Array.from(typeCounts.entries())
        .map(([evidence_type, count]) => ({ evidence_type, count }))
        .sort((a, b) => b.count - a.count),
    },
    systems: systemsOverview,
    relation_access_limited: relationAccessLimited,
  }
}
