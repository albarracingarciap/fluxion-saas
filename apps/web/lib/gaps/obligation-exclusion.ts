import 'server-only'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any

/**
 * «Obligación sin cubrir» se excluye excluyendo la obligación (F-14, B17d). Se
 * aplica cuando la exclusión del gap queda activa: al pedirla, si ninguna
 * política la gobierna, o al aprobarla. Revertir la exclusión devuelve la
 * obligación a Pendiente.
 */
export async function excludeObligations(params: {
  admin: Client
  organizationId: string
  obligationIds: string[]
  rationale: string
  actorUserId: string | null
}): Promise<void> {
  if (params.obligationIds.length === 0) return
  const { data: filas } = await params.admin
    .from('system_obligations')
    .update({
      status: 'excluded',
      exclusion_justification: params.rationale,
      notes: params.rationale,
      resolved_at: new Date().toISOString(),
      resolved_by: params.actorUserId,
    })
    .eq('organization_id', params.organizationId)
    .in('id', params.obligationIds)
    .select('id, ai_system_id, obligation_code')

  await insertAiSystemHistoryEvents(params.admin, ((filas ?? []) as Array<{ id: string; ai_system_id: string; obligation_code: string | null }>).map((o) => ({
    ai_system_id: o.ai_system_id,
    organization_id: params.organizationId,
    event_type: 'obligation_excluded',
    event_title: 'Obligación excluida',
    event_summary: `Se ha excluido la obligación ${o.obligation_code ?? ''}. Justificación: ${params.rationale}`,
    actor_user_id: params.actorUserId,
    payload: { obligation_id: o.id, obligation_code: o.obligation_code },
  })))
}

export async function restoreExcludedObligations(params: {
  admin: Client
  organizationId: string
  obligationIds: string[]
  actorUserId: string | null
}): Promise<void> {
  if (params.obligationIds.length === 0) return
  const { data: filas } = await params.admin
    .from('system_obligations')
    .update({ status: 'pending', exclusion_justification: null, resolved_at: null, resolved_by: null })
    .eq('organization_id', params.organizationId)
    .eq('status', 'excluded')
    .in('id', params.obligationIds)
    .select('id, ai_system_id, obligation_code')

  await insertAiSystemHistoryEvents(params.admin, ((filas ?? []) as Array<{ id: string; ai_system_id: string; obligation_code: string | null }>).map((o) => ({
    ai_system_id: o.ai_system_id,
    organization_id: params.organizationId,
    event_type: 'obligation_status_changed',
    event_title: 'Exclusión de la obligación revertida',
    event_summary: `La obligación ${o.obligation_code ?? ''} vuelve a Pendiente al revertir su exclusión.`,
    actor_user_id: params.actorUserId,
    payload: { obligation_id: o.id, obligation_code: o.obligation_code },
  })))
}
