import 'server-only'

import { openApprovalRequest } from '@/lib/approvals/open'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import type { GapDispositionType, GapLayer } from './data'
import { GAP_LAYER_EXCLUSION, gapExclusionError } from './exclusion-rules'
import { excludeObligations } from './obligation-exclusion'

/**
 * Registra las exclusiones. Cada una abre su solicitud de aprobación si una
 * política activa la gobierna (DP-07, B11d: por defecto, «Riesgo sin tratar» y
 * «Obligación sin cubrir», que aceptan un riesgo o un incumplimiento) y queda
 * pendiente hasta que se decide. Si no, queda activa como antes.
 */
export async function excluirBrechas(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: any
  organizationId: string
  profileId: string | null
  gaps: Array<{ gapKey: string; gapLayer: GapLayer; gapSourceId: string; gapTitle?: string }>
  disposition: GapDispositionType
  rationale: string
  expiresAt: string | null
  /** auth.users.id de quien pide la exclusión (historial de la obligación). */
  actorUserId: string | null
}): Promise<{ pending: number } | { error: string }> {
  const { fluxion, organizationId, profileId } = params
  const now = new Date().toISOString()

  // F-14 (B17d): qué capas se excluyen desde aquí y cómo.
  for (const g of params.gaps) {
    const motivo = gapExclusionError(g.gapLayer, params.expiresAt)
    if (motivo) return { error: motivo }
  }
  // Excluir una obligación no caduca: se revierte.
  const caducidad = (layer: GapLayer) =>
    params.expiresAt && GAP_LAYER_EXCLUSION[layer] !== 'obligacion' ? `${params.expiresAt}T23:59:59Z` : null

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
        expires_at: caducidad(g.gapLayer),
        // La política decide: si ninguna la gobierna, pasa a activa abajo.
        status: profileId ? 'pending' : 'active',
      })),
      { onConflict: 'organization_id,gap_key' }
    )
    .select('id, gap_key, gap_layer, gap_source_id, status')

  if (error) return { error: error.message }

  const activadas: Array<{ gap_layer: string; gap_source_id: string }> = []
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
      activadas.push(fila)
      continue
    }
    pending++
  }
  if (!profileId) activadas.push(...(filas ?? []))

  // «Obligación sin cubrir»: la exclusión activa excluye la obligación (F-14).
  await excludeObligations({
    admin: createNoCacheAdminClient(),
    organizationId,
    obligationIds: activadas.filter((f) => f.gap_layer === 'normativo').map((f) => f.gap_source_id),
    rationale: params.rationale,
    actorUserId: params.actorUserId,
  })
  return { pending }
}
