'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient } from '@/lib/supabase/fluxion'
// Sin cache: esto decide quien puede aprobar que, y `createAdminFluxionClient`
// no desactiva la cache de fetch de Next. Es el mecanismo que mantuvo viva una
// clave API ya revocada.
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { logAuditEvent } from '@/lib/audit'
import type { ApprovalObjectType } from '@/lib/approvals/catalog'

export type ApprovalRequestRow = {
  id:                 string
  object_type:        ApprovalObjectType
  object_id:          string
  object_label:       string | null
  status:             'pending' | 'approved' | 'rejected' | 'cancelled'
  policy_name:        string | null
  current_position:   number
  total_steps:        number
  approvals_in_step:  number
  quorum:             number
  requested_by:       string
  requested_by_name:  string | null
  requested_at:       string
  closed_at:          string | null
  closed_reason:      string | null
  /** Por qué puedo decidir: 'role', 'profile', 'committee' o 'delegation'. */
  can_decide:         string | null
  /** Titular por cuenta de quien actúo, si llega por delegación. */
  on_behalf_of:       string | null
}

export type ApprovalDecisionRow = {
  position:         number
  actor_name:       string | null
  on_behalf_name:   string | null
  decision:         'approved' | 'rejected' | 'abstained'
  reason:           string | null
  decided_at:       string
}

async function contexto() {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, full_name, email')
    .eq('user_id', user.id)
    .single()

  return profile ?? null
}

/**
 * Solicitudes vivas que esta persona puede decidir.
 *
 * Quién puede decidir lo resuelve `fluxion.approval_can_decide`, no esta
 * función. Se llama una vez por solicitud —N+1— y es deliberado: las
 * solicitudes vivas de una organización se cuentan con los dedos, y duplicar
 * aquí la lógica de roles, comités, delegaciones y segregación de funciones
 * garantizaría que las dos copias divergieran.
 */
export async function getMyPendingApprovals(): Promise<ApprovalRequestRow[]> {
  const profile = await contexto()
  if (!profile) return []

  const admin = createNoCacheAdminClient()

  const { data: solicitudes, error } = await admin
    .from('v_approval_requests')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('status', 'pending')
    .order('requested_at')

  if (error || !solicitudes?.length) return []

  const filas = await Promise.all(
    solicitudes.map(async (r: Record<string, unknown>) => {
      const { data } = await admin.rpc('approval_can_decide', {
        p_request_id: r.id as string,
        p_profile_id: profile.id,
      })
      const veredicto = Array.isArray(data) ? data[0] : data
      return {
        ...(r as unknown as ApprovalRequestRow),
        quorum: Number((r.current_step as { quorum?: number } | null)?.quorum ?? 1),
        can_decide:   veredicto?.motivo ?? null,
        on_behalf_of: veredicto?.on_behalf_of ?? null,
      }
    })
  )

  return filas.filter((f) => f.can_decide !== null)
}

/** Todas las solicitudes de la organización, para el histórico. */
export async function getApprovalHistory(limite = 50): Promise<ApprovalRequestRow[]> {
  const profile = await contexto()
  if (!profile) return []

  const admin = createNoCacheAdminClient()

  const { data } = await admin
    .from('v_approval_requests')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .neq('status', 'pending')
    .order('closed_at', { ascending: false })
    .limit(limite)

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...(r as unknown as ApprovalRequestRow),
    quorum: Number((r.current_step as { quorum?: number } | null)?.quorum ?? 1),
    can_decide: null,
    on_behalf_of: null,
  }))
}

export async function getApprovalDecisions(requestId: string): Promise<ApprovalDecisionRow[]> {
  const profile = await contexto()
  if (!profile) return []

  const admin = createNoCacheAdminClient()

  // La solicitud tiene que ser de mi organización. La vista lleva
  // security_invoker, pero este cliente es de servicio y lo esquiva: la
  // comprobación toca hacerla aquí.
  const { data: propia } = await admin
    .from('approval_requests')
    .select('id')
    .eq('id', requestId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!propia) return []

  const { data } = await admin
    .from('approval_decisions')
    .select('position, decision, reason, decided_at, actor_profile_id, on_behalf_of')
    .eq('request_id', requestId)
    .order('decided_at')

  if (!data?.length) return []

  // Sin Set ni spread: el target de compilacion no itera Set. Array.from lo
  // haria, pero un filtro de indice es igual de claro y no depende de la opcion.
  const ids = data
    .flatMap((d: { actor_profile_id: string; on_behalf_of: string | null }) =>
      [d.actor_profile_id, d.on_behalf_of].filter(Boolean) as string[])
    .filter((id: string, i: number, todos: string[]) => todos.indexOf(id) === i)

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids)

  const nombre = (id: string | null) => {
    if (!id) return null
    const p = (perfiles ?? []).find((x: { id: string }) => x.id === id)
    return p?.full_name || p?.email || null
  }

  return data.map((d: {
    position: number; decision: ApprovalDecisionRow['decision']; reason: string | null
    decided_at: string; actor_profile_id: string; on_behalf_of: string | null
  }) => ({
    position:       d.position,
    decision:       d.decision,
    reason:         d.reason,
    decided_at:     d.decided_at,
    actor_name:     nombre(d.actor_profile_id),
    on_behalf_name: nombre(d.on_behalf_of),
  }))
}

/**
 * Registra una decisión.
 *
 * Toda la validación —quién puede, quorum, avance de paso, cierre— vive en
 * `fluxion.approval_decide`. Aquí no se replica ninguna: si la función lanza,
 * se devuelve su mensaje. Duplicar esas comprobaciones en la capa web dejaría
 * dos verdades sobre quién puede aprobar qué.
 */
export async function decideApproval(input: {
  requestId: string
  decision:  'approved' | 'rejected' | 'abstained'
  reason?:   string
}): Promise<{ status: string } | { error: string }> {
  const profile = await contexto()
  if (!profile) return { error: 'No autenticado.' }

  if (input.decision === 'rejected' && !input.reason?.trim()) {
    return { error: 'Rechazar exige un motivo: quien rehaga el objeto necesita saber qué corregir.' }
  }

  const admin = createNoCacheAdminClient()

  const { data, error } = await admin.rpc('approval_decide', {
    p_request_id: input.requestId,
    p_profile_id: profile.id,
    p_decision:   input.decision,
    p_reason:     input.reason?.trim() || null,
  })

  if (error) return { error: error.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    actor_name:      profile.full_name,
    actor_email:     profile.email,
    action:          'approval.decided',
    target_type:     'organization',
    target_id:       input.requestId,
    metadata:        { decision: input.decision, resultado: data },
  })

  revalidatePath('/aprobaciones')
  revalidatePath('/', 'layout')
  return { status: String(data) }
}

export async function cancelApproval(requestId: string, reason: string):
  Promise<{ success?: true; error?: string }> {
  const profile = await contexto()
  if (!profile) return { error: 'No autenticado.' }

  const admin = createNoCacheAdminClient()

  const { data: solicitud } = await admin
    .from('approval_requests')
    .select('id, requested_by')
    .eq('id', requestId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!solicitud) return { error: 'La solicitud no existe.' }

  // La cancela quien la abrió o un administrador. La función de base no puede
  // decidirlo: no conoce al usuario.
  const permitido = solicitud.requested_by === profile.id
    || ['org_admin', 'sgai_manager'].includes(profile.role)

  if (!permitido) return { error: 'Solo quien la solicitó o un administrador puede cancelarla.' }
  if (!reason.trim()) return { error: 'Indica por qué se cancela.' }

  const { error } = await admin.rpc('approval_cancel', {
    p_request_id: requestId,
    p_reason:     reason.trim(),
  })

  if (error) return { error: error.message }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id:        profile.id,
    action:          'approval.cancelled',
    target_type:     'organization',
    target_id:       requestId,
    metadata:        { reason: reason.trim() },
  })

  revalidatePath('/aprobaciones')
  return { success: true }
}
