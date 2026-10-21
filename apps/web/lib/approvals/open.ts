import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { notifyApprovalStep } from './notify'
import type { ApprovalObjectType } from './catalog'

/**
 * Apertura de solicitudes de Flujos de aprobación desde cada dominio (B11a).
 *
 * Todo objeto aprobable abre su solicitud al enviarse a aprobación. Si la
 * organización tiene una política activa para su tipo, la decisión se toma en
 * Aprobaciones y el efecto lo aplica `lib/approvals/effects.ts`. Sin política,
 * el dominio sigue con su aprobación propia hasta que B11b siembre las
 * políticas por defecto.
 */

export type OpenApprovalResult =
  | { requestId: string }
  | { requestId: null }
  | { error: string }

export async function openApprovalRequest(params: {
  organizationId: string
  objectType: ApprovalObjectType
  objectId: string
  /** profiles.id de quien pide la aprobación. */
  requestedByProfileId: string
  context?: Record<string, unknown>
}): Promise<OpenApprovalResult> {
  const admin = createNoCacheAdminClient()

  const { data: requestId, error } = await admin.rpc('approval_open', {
    p_organization_id: params.organizationId,
    p_object_type:     params.objectType,
    p_object_id:       params.objectId,
    p_requested_by:    params.requestedByProfileId,
    p_context:         params.context ?? {},
  })

  if (error) {
    console.error('[approvals/open] no se pudo abrir la solicitud:', error)
    return { error: 'No se pudo abrir la solicitud de aprobación: ' + error.message }
  }
  if (!requestId) return { requestId: null }

  // Aviso a quien le toca el primer paso.
  await notifyApprovalStep(String(requestId))
  return { requestId: String(requestId) }
}

/**
 * Solicitud viva (pendiente) de un objeto, o null.
 *
 * Ante un fallo de lectura devuelve un id ficticio: si no se puede saber, se
 * bloquea la vía propia del dominio. Equivocarse hacia el bloqueo deja al
 * usuario yendo a Aprobaciones; equivocarse hacia el paso libre deja decidir
 * por detrás del circuito.
 */
export async function liveApprovalRequest(
  objectType: ApprovalObjectType,
  objectId: string,
): Promise<string | null> {
  const admin = createNoCacheAdminClient()
  const { data, error } = await admin
    .from('approval_requests')
    .select('id')
    .eq('object_type', objectType)
    .eq('object_id', objectId)
    .eq('status', 'pending')
    .maybeSingle()

  if (error) {
    console.error('[approvals/open] no se pudo comprobar la solicitud viva:', error)
    return 'desconocida'
  }
  return data?.id ?? null
}

/** Mensaje cuando la decisión está en Aprobaciones y no en la pantalla del objeto. */
export const EN_CIRCUITO = 'Está en un circuito de aprobación: decide desde Aprobaciones.'

/**
 * Cancela la solicitud viva de un objeto porque quien lo preparó lo retira
 * (vuelve a borrador). No lanza: si no hay solicitud, no hace nada.
 */
export async function cancelLiveApprovalRequest(
  objectType: ApprovalObjectType,
  objectId: string,
  reason: string,
): Promise<void> {
  const id = await liveApprovalRequest(objectType, objectId)
  if (!id || id === 'desconocida') return
  const admin = createNoCacheAdminClient()
  const { error } = await admin.rpc('approval_cancel', { p_request_id: id, p_reason: reason })
  if (error) console.error('[approvals/open] no se pudo cancelar la solicitud:', error)
}

/** ¿Hay una política activa que gobierne este objeto? Sin política, el dominio decide solo. */
export async function hasApprovalPolicy(
  organizationId: string,
  objectType: ApprovalObjectType,
  context: Record<string, unknown> = {},
): Promise<boolean> {
  const admin = createNoCacheAdminClient()
  const { data, error } = await admin.rpc('approval_policy_for', {
    p_organization_id: organizationId,
    p_object_type:     objectType,
    p_context:         context,
  })
  if (error) {
    console.error('[approvals/open] no se pudo resolver la política:', error)
    return false
  }
  return Boolean(data)
}

/**
 * Abre la revisión de una evidencia que el sistema crea ya «pendiente de
 * revisión» (PDF de un expediente sin aprobar, informes generados). La pide y
 * la prepara quien la aporta, que por eso no puede decidirla (DP-01). Sin
 * política o sin solicitud, la evidencia queda en borrador: pendiente sin
 * circuito no la decidiría nadie (B11g). No lanza.
 */
export async function openEvidenceReview(params: {
  organizationId: string
  evidenceId: string
  /** auth.users.id de quien aporta la evidencia. */
  ownerUserId: string
}): Promise<void> {
  const admin = createNoCacheAdminClient()
  const { data: perfil } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', params.ownerUserId)
    .eq('organization_id', params.organizationId)
    .maybeSingle()

  const apertura = perfil
    ? await openApprovalRequest({
        organizationId: params.organizationId,
        objectType: 'evidence',
        objectId: params.evidenceId,
        requestedByProfileId: perfil.id,
        context: { prepared_by: [perfil.id] },
      })
    : { requestId: null }

  if ('error' in apertura || apertura.requestId === null) {
    await admin
      .from('system_evidences')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', params.evidenceId)
      .eq('organization_id', params.organizationId)
  }
}
