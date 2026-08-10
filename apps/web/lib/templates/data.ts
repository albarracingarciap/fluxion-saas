import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { ISO_42001_CONTROLS, type Iso42001Control } from './iso42001-catalog'

export type SoAControlRecord = Iso42001Control & {
  dbId?: string
  isApplicable: boolean
  justification: string | null
  status: string
  ownerUserId: string | null
  ownerName: string | null
  validationEvidenceId: string | null
  notes: string | null
  linkedSystemIds: string[]
}

export type OrgMember = {
  id: string
  display_name: string
  role: string | null
}

export type SoAMetadata = {
  version: string
  owner_name: string
  approved_by: string
  approved_by_role: string
  approved_at: string | null
  next_review_date: string | null
  scope: string
  scope_system_tags: string[]
  lifecycle_status: string
}

export async function buildSoAData(organizationId: string) {
  const fluxion = createFluxionClient()
  // RLS en organization_soa_controls referenciaba organization_members (eliminada).
  // Usar adminClient hasta que se aplique la migración 058_fix_soa_rls.sql.
  const adminFluxion = createAdminFluxionClient()

  // 1. Fetch DB controls
  const { data: dbControls } = await adminFluxion
    .from('organization_soa_controls')
    .select(`
      id,
      control_code,
      is_applicable,
      justification,
      status,
      owner_user_id,
      validation_evidence_id,
      notes,
      organization_soa_system_links ( ai_system_id )
    `)
    .eq('organization_id', organizationId)

  // 2. Fetch AI Systems (tags needed to compute in-scope set)
  const { data: aiSystems } = await fluxion
    .from('ai_systems')
    .select('id, name, internal_id, tags')
    .eq('organization_id', organizationId)
    .order('name')

  // 2.b Fetch System Evidences for the selector
  const { data: evidences } = await fluxion
    .from('system_evidences')
    .select('id, title, status, ai_system_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // 2.c Fetch SoA Metadata (adminFluxion — RLS referenciaba organization_members)
  const { data: metadata } = await adminFluxion
    .from('organization_soa_metadata')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  // 2.d Fetch org members for owner selector
  const { data: profileRows } = await fluxion
    .from('profiles')
    .select('id, full_name, display_name, role')
    .eq('organization_id', organizationId)
    .order('full_name')

  const members: OrgMember[] = (profileRows ?? []).map((p) => ({
    id: p.id as string,
    display_name: ((p.display_name || p.full_name || '') as string).trim() || 'Usuario',
    role: (p.role as string | null) ?? null,
  }))

  const memberNameMap = new Map(members.map((m) => [m.id, m.display_name]))

  // 2.e Fetch latest AISIA assessment status per system
  const { data: aisiaRows } = await fluxion
    .from('aisia_assessments')
    .select('ai_system_id, status, version')
    .eq('organization_id', organizationId)
    .order('version', { ascending: false })

  // Keep only the highest-version assessment per system
  const aisiaStatusMap: Record<string, string> = {}
  for (const row of aisiaRows ?? []) {
    const systemId = row.ai_system_id as string
    if (!aisiaStatusMap[systemId]) {
      aisiaStatusMap[systemId] = row.status as string
    }
  }

  // 2.f Compute available tags + in-scope systems from aiSystems (already fetched with tags)
  const scopeTags: string[] = metadata?.scope_system_tags ?? []

  const availableTags: string[] = Array.from(
    new Set(
      (aiSystems ?? [])
        .flatMap((s) => (s.tags as string[] | null) ?? [])
        .filter(Boolean)
    )
  ).sort() as string[]

  // Systems whose tags intersect scope_system_tags (or ALL systems if no scope tags defined)
  const inScopeSystems = (aiSystems ?? []).filter((s) => {
    if (scopeTags.length === 0) return true
    const sysTags: string[] = (s.tags as string[] | null) ?? []
    return sysTags.some((t) => scopeTags.includes(t))
  })

  // 3. Merge static catalog with DB data
  const controls: SoAControlRecord[] = ISO_42001_CONTROLS.map((staticControl) => {
    const dbRecord = dbControls?.find((c) => c.control_code === staticControl.id)

    const links: { ai_system_id: string }[] = (dbRecord?.organization_soa_system_links as { ai_system_id: string }[] | undefined) || []

    return {
      ...staticControl,
      dbId: dbRecord?.id,
      isApplicable: dbRecord?.is_applicable ?? false,
      justification: dbRecord?.justification ?? null,
      status: dbRecord?.status ?? 'not_started',
      ownerUserId: dbRecord?.owner_user_id ?? null,
      ownerName: dbRecord?.owner_user_id ? (memberNameMap.get(dbRecord.owner_user_id) ?? null) : null,
      validationEvidenceId: dbRecord?.validation_evidence_id ?? null,
      notes: dbRecord?.notes ?? null,
      linkedSystemIds: links.map((l) => l.ai_system_id),
    }
  })

  // Calculate KPIs
  const totalControls = controls.length
  const applicableControls = controls.filter((c) => c.isApplicable)
  const implementedCount = applicableControls.filter((c) => c.status === 'implemented').length
  const inProgressCount = applicableControls.filter((c) => c.status === 'in_progress').length
  const applicableCount = applicableControls.length

  const completionPercentage =
    applicableCount > 0 ? Math.round((implementedCount / applicableCount) * 100) : 0

  const defaultMetadata: SoAMetadata = {
    version: '1.0',
    owner_name: '',
    approved_by: '',
    approved_by_role: '',
    approved_at: null,
    next_review_date: null,
    scope: '',
    scope_system_tags: [],
    lifecycle_status: 'draft',
  }

  return {
    controls,
    aiSystems: aiSystems ?? [],
    inScopeSystems,
    evidences: evidences ?? [],
    members,
    aisiaStatusMap,
    availableTags,
    kpis: {
      totalControls,
      applicableCount,
      implementedCount,
      inProgressCount,
      completionPercentage,
    },
    isInitialized: dbControls && dbControls.length > 0,
    metadata: metadata
      ? {
          version: metadata.version ?? '1.0',
          owner_name: metadata.owner_name ?? '',
          approved_by: metadata.approved_by ?? '',
          approved_by_role: metadata.approved_by_role ?? '',
          approved_at: metadata.approved_at ?? null,
          next_review_date: metadata.next_review_date ?? null,
          scope: metadata.scope ?? '',
          scope_system_tags: metadata.scope_system_tags ?? [],
          lifecycle_status: metadata.lifecycle_status ?? 'draft',
        }
      : defaultMetadata,
  }
}
