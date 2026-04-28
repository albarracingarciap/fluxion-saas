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

  // 2. Fetch AI Systems for the selector
  const { data: aiSystems } = await fluxion
    .from('ai_systems')
    .select('id, name, internal_id')
    .eq('organization_id', organizationId)
    .order('name')

  // 2.b Fetch System Evidences for the selector
  const { data: evidences } = await fluxion
    .from('system_evidences')
    .select('id, title, status, ai_system_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // 2.c Fetch SoA Metadata
  const { data: metadata } = await fluxion
    .from('organization_soa_metadata')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  // 3. Merge static catalog with DB data
  const controls: SoAControlRecord[] = ISO_42001_CONTROLS.map((staticControl) => {
    const dbRecord = dbControls?.find((c) => c.control_code === staticControl.id)

    // @ts-expect-error - PostgREST typings
    const links: { ai_system_id: string }[] = dbRecord?.organization_soa_system_links || []

    return {
      ...staticControl,
      dbId: dbRecord?.id,
      isApplicable: dbRecord?.is_applicable ?? false,
      justification: dbRecord?.justification ?? null,
      status: dbRecord?.status ?? 'not_started',
      ownerUserId: dbRecord?.owner_user_id ?? null,
      ownerName: null,
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

  return {
    controls,
    aiSystems: aiSystems ?? [],
    evidences: evidences ?? [],
    kpis: {
      totalControls,
      applicableCount,
      implementedCount,
      inProgressCount,
      completionPercentage,
    },
    isInitialized: dbControls && dbControls.length > 0,
    metadata: metadata || {
      version: '1.0',
      owner_name: '',
      approved_by: '',
      scope: '',
    },
  }
}
