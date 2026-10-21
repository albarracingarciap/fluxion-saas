'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { cancelLiveApprovalRequest, openApprovalRequest } from '@/lib/approvals/open'
import { getAppAuthState } from '@/lib/auth/app-state'
import { hasAnyRole } from '@/lib/auth/roles'
import { buildGapsData, type GapLayer, type GapDispositionType } from '@/lib/gaps/data'
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

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

  const adminFluxion = createAdminFluxionClient()
  const { data: snapshot, error } = await adminFluxion
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
  /** Solo para el título de la solicitud de aprobación. */
  gapTitle?: string
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
}): Promise<{ ok: true; pending: number } | { error: string }> {
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

  const result = await excluirBrechas({
    fluxion,
    organizationId: membership.organization_id,
    profileId,
    gaps: [{ gapKey: input.gapKey, gapLayer: input.gapLayer, gapSourceId: input.gapSourceId, gapTitle: input.gapTitle }],
    disposition: input.disposition,
    rationale: input.rationale,
    expiresAt: input.expiresAt,
  })
  if ('error' in result) return result

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true, pending: result.pending }
}

export async function revertGapDispositionAction(
  dispositionId: string
): Promise<{ ok: true } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const { data: row } = await fluxion
    .from('gap_dispositions')
    .select('id, status, decided_by')
    .eq('id', dispositionId)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()
  if (row?.status === 'pending') {
    const retirada = await retirarPendientes(membership.organization_id, user.id, [row])
    if ('error' in retirada) return retirada
    revalidatePath('/gaps')
    revalidatePath('/gaps/excluded')
    return { ok: true }
  }

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
  gaps: Array<{ gapKey: string; gapLayer: GapLayer; gapSourceId: string; gapTitle?: string }>
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
}): Promise<{ ok: true; count: number; pending: number } | { error: string }> {
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

  const result = await excluirBrechas({
    fluxion,
    organizationId: membership.organization_id,
    profileId,
    gaps: input.gaps,
    disposition: input.disposition,
    rationale: input.rationale,
    expiresAt: input.expiresAt,
  })
  if ('error' in result) return result

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true, count: input.gaps.length, pending: result.pending }
}

/**
 * Registra las exclusiones. Cada una abre su solicitud de aprobación si una
 * política activa la gobierna (DP-07, B11d: por defecto, «Riesgo sin tratar» y
 * «Obligación sin cubrir», que aceptan un riesgo o un incumplimiento) y queda
 * pendiente hasta que se decide. Si no, queda activa como antes.
 */
async function excluirBrechas(params: {
  fluxion: ReturnType<typeof createFluxionClient>
  organizationId: string
  profileId: string | null
  gaps: Array<{ gapKey: string; gapLayer: GapLayer; gapSourceId: string; gapTitle?: string }>
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
}): Promise<{ pending: number } | { error: string }> {
  const { fluxion, organizationId, profileId } = params
  const now = new Date().toISOString()
  const expiresAt = params.expiresAt ? `${params.expiresAt}T23:59:59Z` : null

  // Una exclusión pendiente no se rehace: se retira y se vuelve a pedir.
  const { data: vivas } = await fluxion
    .from('gap_dispositions')
    .select('gap_key')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .in('gap_key', params.gaps.map((g) => g.gapKey))
  if ((vivas ?? []).length > 0) {
    return { error: 'Algún gap ya tiene una exclusión pendiente de aprobación: retírala antes de volver a pedirla.' }
  }

  const { data: filas, error } = await fluxion
    .from('gap_dispositions')
    .upsert(
      params.gaps.map((g) => ({
        organization_id: organizationId,
        gap_key: g.gapKey,
        gap_layer: g.gapLayer,
        gap_source_id: g.gapSourceId,
        disposition: params.disposition,
        rationale: params.rationale,
        decided_by: profileId,
        decided_at: now,
        expires_at: expiresAt,
        // La política decide: si ninguna la gobierna, pasa a activa abajo.
        status: profileId ? 'pending' : 'active',
      })),
      { onConflict: 'organization_id,gap_key' }
    )
    .select('id, gap_key, gap_layer, status')

  if (error) return { error: error.message }

  let pending = 0
  for (const fila of filas ?? []) {
    if (fila.status !== 'pending' || !profileId) continue
    const gap = params.gaps.find((g) => g.gapKey === fila.gap_key)
    const abierta = await openApprovalRequest({
      organizationId,
      objectType: 'gap_disposition',
      objectId: fila.id,
      requestedByProfileId: profileId,
      context: { gap_layer: fila.gap_layer, ...(gap?.gapTitle ? { gap_title: gap.gapTitle } : {}) },
    })
    // Con el rol de servicio: el trigger de la base no deja activar una
    // exclusión desde la sesión del usuario si hay política (B11d).
    const admin = createNoCacheAdminClient()
    if ('error' in abierta) {
      // Sin solicitud, la exclusión no puede quedarse esperando a nadie.
      await admin.from('gap_dispositions').delete().eq('id', fila.id).eq('organization_id', organizationId)
      return { error: abierta.error }
    }
    if (abierta.requestId === null) {
      // Ninguna política la gobierna: queda activa, como antes de B11d.
      await admin.from('gap_dispositions').update({ status: 'active' }).eq('id', fila.id).eq('organization_id', organizationId)
      continue
    }
    pending++
  }
  return { pending }
}

export async function bulkRevertGapDispositionsAction(
  gapKeys: string[]
): Promise<{ ok: true; count: number } | { error: string }> {
  const fluxion = createFluxionClient()
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  if (gapKeys.length === 0) return { error: 'No hay gaps para reactivar.' }

  const { data: pendientes } = await fluxion
    .from('gap_dispositions')
    .select('id, decided_by')
    .eq('organization_id', membership.organization_id)
    .eq('status', 'pending')
    .in('gap_key', gapKeys)
  if ((pendientes ?? []).length > 0) {
    const retirada = await retirarPendientes(membership.organization_id, user.id, pendientes ?? [])
    if ('error' in retirada) return retirada
  }

  const { error } = await fluxion
    .from('gap_dispositions')
    .delete()
    .eq('organization_id', membership.organization_id)
    .eq('status', 'active')
    .in('gap_key', gapKeys)

  if (error) return { error: error.message }

  revalidatePath('/gaps')
  revalidatePath('/gaps/excluded')
  return { ok: true, count: gapKeys.length }
}

/**
 * Retira exclusiones pendientes de aprobación: cancela su solicitud y las
 * borra. Puede quien las pidió y quien puede reactivar brechas (Administrador,
 * Responsable del SGAI, CAIO), como al cancelar desde Aprobaciones.
 */
async function retirarPendientes(
  organizationId: string,
  userId: string,
  filas: Array<{ id: string; decided_by: string | null }>,
): Promise<{ ok: true } | { error: string }> {
  // Sin caché: decide quién puede retirar.
  const admin = createNoCacheAdminClient()
  const { data: perfil } = await admin
    .from('profiles')
    .select('id, role, roles')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  const gestiona = hasAnyRole(perfil, ['org_admin', 'sgai_manager', 'caio'])
  if (!gestiona && filas.some((f) => f.decided_by !== perfil?.id)) {
    return { error: 'Solo quien pidió la exclusión, o un administrador, puede retirarla.' }
  }

  for (const f of filas) {
    await cancelLiveApprovalRequest('gap_disposition', f.id, 'Exclusión retirada: el gap vuelve a la cola.')
  }
  const { error } = await admin
    .from('gap_dispositions')
    .delete()
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .in('id', filas.map((f) => f.id))
  if (error) return { error: error.message }
  return { ok: true }
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
