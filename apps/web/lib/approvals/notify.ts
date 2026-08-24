import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { createNotification } from '@/lib/notifications/sender'
import { enqueueChannelMessage } from '@/lib/channels/send'
import { emitEvent } from '@/lib/outbox/emit'

/**
 * Avisa a quien le toca decidir el paso actual.
 *
 * Se llama al abrir la solicitud y cada vez que avanza de paso. Sin esto, una
 * aprobación depende de que alguien se acuerde de mirar la bandeja — y una
 * decisión que nadie sabe que tiene pendiente es una decisión que no se toma.
 *
 * No lanza: el aviso es accesorio. La solicitud ya está abierta y visible en la
 * bandeja aunque el correo o Slack fallen.
 */
export async function notifyApprovalStep(requestId: string): Promise<void> {
  try {
    const admin = createNoCacheAdminClient()

    const { data: request } = await admin
      .from('v_approval_requests')
      .select('id, organization_id, object_type, object_label, status, current_position, total_steps, requested_by_name')
      .eq('id', requestId)
      .maybeSingle()

    if (!request || request.status !== 'pending') return

    const { data: candidatos, error } = await admin.rpc('approval_step_candidates', {
      p_request_id: requestId,
    })

    if (error) {
      console.error('[approvals/notify] no se pudieron resolver los destinatarios:', error)
      return
    }

    const ids = (candidatos ?? []).map((c: { profile_id: string }) => c.profile_id)

    // Nadie puede decidir este paso. No es un fallo del aviso, es un circuito
    // mal configurado: se registra para que se vea, porque si no la solicitud
    // se queda esperando indefinidamente a nadie.
    if (!ids.length) {
      console.warn(
        `[approvals/notify] solicitud ${requestId}: nadie puede decidir el paso ${request.current_position}`
      )
      return
    }

    const { data: perfiles } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)

    const objeto = request.object_label ?? 'un objeto'
    const titulo = `Aprobación pendiente: ${objeto}`
    const cuerpo = `Paso ${request.current_position} de ${request.total_steps}. `
      + `Solicitada por ${request.requested_by_name ?? 'un usuario'}.`

    await Promise.all(
      (perfiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) =>
        createNotification({
          recipientProfileId: p.id,
          organizationId:     request.organization_id,
          type:               'approval_pending',
          title:              titulo,
          body:               cuerpo,
          linkUrl:            '/aprobaciones',
          recipientEmail:     p.email ?? undefined,
          recipientName:      p.full_name ?? undefined,
        })
      )
    )

    // Al outbox tambien: los canales de aviso son para personas, los webhooks
    // para sistemas del cliente. Hasta ahora los segundos no recibian nada.
    await emitEvent({
      organizationId: request.organization_id,
      eventType:      'approval.pending',
      subjectType:    'approval_request',
      subjectId:      requestId,
      payload: {
        object_type:  request.object_type,
        object_label: request.object_label,
        step:         request.current_position,
        total_steps:  request.total_steps,
        candidates:   ids.length,
      },
    })

    await enqueueChannelMessage(admin, {
      organizationId: request.organization_id,
      eventType:      'approval.pending',
      subjectType:    'approval_request',
      subjectId:      requestId,
      message: {
        title: titulo,
        text:  `${cuerpo} ${ids.length} persona(s) pueden decidirlo.`,
        url:   '/aprobaciones',
        level: 'info',
      },
    })
  } catch (e) {
    console.error('[approvals/notify] fallo al avisar:', e)
  }
}

/**
 * Avisa a quien la abrió de que su solicitud se cerró.
 *
 * El que espera es quien la pidió: sin este aviso, tendría que ir a mirar.
 */
export async function notifyApprovalClosed(requestId: string): Promise<void> {
  try {
    const admin = createNoCacheAdminClient()

    const { data: request } = await admin
      .from('v_approval_requests')
      .select('id, organization_id, object_label, status, closed_reason, requested_by')
      .eq('id', requestId)
      .maybeSingle()

    if (!request || request.status === 'pending') return

    const { data: solicitante } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', request.requested_by)
      .maybeSingle()

    if (!solicitante) return

    const veredicto = request.status === 'approved' ? 'aprobada'
      : request.status === 'rejected' ? 'rechazada' : 'cancelada'

    await emitEvent({
      organizationId: request.organization_id,
      eventType:      `approval.${request.status}`,
      subjectType:    'approval_request',
      subjectId:      requestId,
      payload: {
        object_label: request.object_label,
        status:       request.status,
        reason:       request.closed_reason,
      },
    })

    await createNotification({
      recipientProfileId: solicitante.id,
      organizationId:     request.organization_id,
      type:               'approval_closed',
      title:              `Aprobación ${veredicto}: ${request.object_label ?? 'tu solicitud'}`,
      body:               request.closed_reason ?? undefined,
      linkUrl:            '/aprobaciones',
      recipientEmail:     solicitante.email ?? undefined,
      recipientName:      solicitante.full_name ?? undefined,
    })
  } catch (e) {
    console.error('[approvals/notify] fallo al avisar del cierre:', e)
  }
}
