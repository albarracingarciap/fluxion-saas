'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getAppAuthState } from '@/lib/auth/app-state'
import { buildGapsData, type GapLayer } from '@/lib/gaps/data'
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
