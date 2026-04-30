'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { buildGapsData, type GapLayer, type GapDispositionType } from '@/lib/gaps/data'
import { createFluxionClient } from '@/lib/supabase/fluxion'

type GapAssignmentInput = {
  layer: GapLayer
  id: string
  systemId: string
  ownerId: string | null
  dueDate: string | null
}

type GapGroupAssignmentInput = {
  layer: GapLayer
  systemIds: string[]
  ids: string[]
  ownerId: string | null
  dueDate: string | null
}

export async function saveGapAnalysisSnapshot() {
  const fluxion = createFluxionClient()
  const { user, membership, organization, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  const data = await buildGapsData(membership.organization_id)
  const now = new Date().toISOString()
  const title = `Análisis de gaps · ${organization?.name ?? 'Organización'} · ${now.slice(0, 10)}`

  const { data: snapshot, error } = await fluxion
    .from('system_report_snapshots')
    .insert({
      ai_system_id: null,
      organization_id: membership.organization_id,
      report_type: 'gap_analysis',
      title,
      payload: data,
      generated_by: user.id,
    })
    .select('id')
    .single()

  if (error || !snapshot) {
    console.error('saveGapAnalysisSnapshot error:', error)
    return { error: error?.message ?? 'No se pudo guardar el snapshot del análisis de gaps.' }
  }

  revalidatePath('/gaps')

  return {
    success: true,
    snapshotId: snapshot.id,
  }
}

export async function bulkUpdateGapAssignmentAction(input: {
  gaps: Array<{ layer: GapLayer; id: string; systemId: string }>
  ownerId: string | null
  dueDate: string | null
}): Promise<{ ok: true; updated: number } | { error: string }> {
  const { fluxion, membership } = await assertGapWriteContext()

  const assignable = input.gaps.filter((g) => canAssignLayer(g.layer))
  if (assignable.length === 0) {
    return { error: 'No hay gaps asignables en la selección.' }
  }

  const byLayer: Partial<Record<GapLayer, string[]>> = {}
  for (const g of assignable) {
    const list = byLayer[g.layer] ?? []
    list.push(g.id)
    byLayer[g.layer] = list
  }

  let updated = 0
  for (const [layer, ids] of Object.entries(byLayer) as [GapLayer, string[]][]) {
    const result = await applyGapAssignmentUpdate({
      fluxion,
      organizationId: membership.organization_id,
      layer,
      ids,
      ownerId: input.ownerId,
      dueDate: input.dueDate,
    })
    if ('error' in result) return { error: result.error ?? 'Error al actualizar gaps' }
    updated += ids.length
  }

  const uniqueSystems = Array.from(new Set(assignable.map((g) => g.systemId)))
  revalidatePath('/gaps')
  for (const systemId of uniqueSystems) {
    revalidatePath(`/inventario/${systemId}`)
  }

  return { ok: true, updated }
}

export async function deleteGapAnalysisSnapshotAction(
  snapshotId: string
): Promise<{ ok: true } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { error } = await fluxion
    .from('system_report_snapshots')
    .delete()
    .eq('id', snapshotId)
    .eq('organization_id', membership.organization_id)
    .eq('report_type', 'gap_analysis')
    .is('ai_system_id', null)

  if (error) return { error: error.message }

  revalidatePath('/gaps/snapshots')
  return { ok: true }
}

function canAssignLayer(layer: GapLayer) {
  return layer === 'normativo' || layer === 'control' || layer === 'caducidad'
}

async function assertGapWriteContext() {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  return { fluxion, user, membership }
}

async function applyGapAssignmentUpdate(params: {
  fluxion: ReturnType<typeof createFluxionClient>
  organizationId: string
  layer: GapLayer
  ids: string[]
  ownerId: string | null
  dueDate: string | null
}) {
  if (!canAssignLayer(params.layer)) {
    return { error: 'Esta capa no admite asignación directa desde Análisis de gaps.' }
  }

  if (params.ids.length === 0) {
    return { error: 'No se encontraron registros para actualizar.' }
  }

  if (params.layer === 'normativo') {
    const { error } = await params.fluxion
      .from('system_obligations')
      .update({
        owner_user_id: params.ownerId,
        due_date: params.dueDate,
      })
      .eq('organization_id', params.organizationId)
      .in('id', params.ids)

    if (error) return { error: error.message }
    return { success: true }
  }

  if (params.layer === 'control') {
    const { error } = await params.fluxion
      .from('treatment_actions')
      .update({
        owner_id: params.ownerId,
        due_date: params.dueDate,
      })
      .eq('organization_id', params.organizationId)
      .in('id', params.ids)

    if (error) return { error: error.message }
    return { success: true }
  }

  const { error } = await params.fluxion
    .from('system_evidences')
    .update({
      owner_user_id: params.ownerId,
      expires_at: params.dueDate,
    })
    .eq('organization_id', params.organizationId)
    .in('id', params.ids)

  if (error) return { error: error.message }
  return { success: true }
}

export async function updateGapAssignment(input: GapAssignmentInput) {
  const { fluxion, membership } = await assertGapWriteContext()

  const result = await applyGapAssignmentUpdate({
    fluxion,
    organizationId: membership.organization_id,
    layer: input.layer,
    ids: [input.id],
    ownerId: input.ownerId,
    dueDate: input.dueDate,
  })

  if ('error' in result) return result

  revalidatePath('/gaps')
  revalidatePath(`/inventario/${input.systemId}`)

  return { success: true }
}

export async function setGapDispositionAction(input: {
  gapKey: string
  gapLayer: GapLayer
  gapSourceId: string
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
}): Promise<{ ok: true } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const profileRes = await fluxion
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', membership.organization_id)
    .single()

  const profileId = profileRes.data?.id ?? null

  const { error } = await fluxion.from('gap_dispositions').upsert(
    {
      organization_id: membership.organization_id,
      gap_key: input.gapKey,
      gap_layer: input.gapLayer,
      gap_source_id: input.gapSourceId,
      disposition: input.disposition,
      rationale: input.rationale,
      decided_by: profileId,
      decided_at: new Date().toISOString(),
      expires_at: input.expiresAt ? `${input.expiresAt}T23:59:59Z` : null,
    },
    { onConflict: 'organization_id,gap_key' }
  )

  if (error) return { error: error.message }

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true }
}

export async function revertGapDispositionAction(
  dispositionId: string
): Promise<{ ok: true } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { error } = await fluxion
    .from('gap_dispositions')
    .delete()
    .eq('id', dispositionId)
    .eq('organization_id', membership.organization_id)

  if (error) return { error: error.message }

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true }
}

export async function bulkSetGapDispositionAction(input: {
  gaps: Array<{ gapKey: string; gapLayer: GapLayer; gapSourceId: string }>
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
}): Promise<{ ok: true; count: number } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  if (input.gaps.length === 0) return { error: 'No hay gaps para excluir.' }

  const profileRes = await fluxion
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', membership.organization_id)
    .single()

  const profileId = profileRes.data?.id ?? null
  const now = new Date().toISOString()
  const expiresAt = input.expiresAt ? `${input.expiresAt}T23:59:59Z` : null

  const { error } = await fluxion.from('gap_dispositions').upsert(
    input.gaps.map((g) => ({
      organization_id: membership.organization_id,
      gap_key: g.gapKey,
      gap_layer: g.gapLayer,
      gap_source_id: g.gapSourceId,
      disposition: input.disposition,
      rationale: input.rationale,
      decided_by: profileId,
      decided_at: now,
      expires_at: expiresAt,
    })),
    { onConflict: 'organization_id,gap_key' }
  )

  if (error) return { error: error.message }

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true, count: input.gaps.length }
}

export async function bulkRevertGapDispositionsAction(
  gapKeys: string[]
): Promise<{ ok: true; count: number } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  if (gapKeys.length === 0) return { error: 'No hay gaps para reactivar.' }

  const { error } = await fluxion
    .from('gap_dispositions')
    .delete()
    .eq('organization_id', membership.organization_id)
    .in('gap_key', gapKeys)

  if (error) return { error: error.message }

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true, count: gapKeys.length }
}

export async function updateGapGroupAssignment(input: GapGroupAssignmentInput) {
  const { fluxion, membership } = await assertGapWriteContext()

  const result = await applyGapAssignmentUpdate({
    fluxion,
    organizationId: membership.organization_id,
    layer: input.layer,
    ids: input.ids,
    ownerId: input.ownerId,
    dueDate: input.dueDate,
  })

  if ('error' in result) return result

  revalidatePath('/gaps')
  for (const systemId of input.systemIds) {
    revalidatePath(`/inventario/${systemId}`)
  }

  return { success: true, updated: input.ids.length }
}
