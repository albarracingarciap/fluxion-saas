import 'server-only'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

/**
 * Emite un evento del dominio.
 *
 * El evento se PERSISTE y se entrega después. Llamar al endpoint del cliente
 * dentro de la acción que produjo el hecho significa que un receptor caído o
 * lento se lleva por delante la operación — o que el error se traga y el
 * evento desaparece sin rastro.
 *
 * No lanza. Que falle el registro de un evento no puede tumbar la operación que
 * lo produjo: el plan se aprobó igual. Se registra en el log y sigue.
 */
export async function emitEvent(input: {
  organizationId: string
  eventType:      string
  subjectType?:   string
  subjectId?:     string
  payload?:       Record<string, unknown>
}): Promise<void> {
  try {
    const admin = createNoCacheAdminClient()

    const { data: evento, error } = await admin
      .from('outbox_events')
      .insert({
        organization_id: input.organizationId,
        event_type:      input.eventType,
        subject_type:    input.subjectType ?? null,
        subject_id:      input.subjectId ?? null,
        payload:         input.payload ?? {},
      })
      .select('id')
      .single()

    if (error || !evento) {
      console.error('[outbox] no se pudo registrar el evento:', error)
      return
    }

    // Destinos: webhooks activos suscritos a este evento. `events` vacío
    // significa «todos», igual que en los canales de aviso.
    const { data: webhooks } = await admin
      .from('webhooks')
      .select('id, events')
      .eq('organization_id', input.organizationId)
      .eq('is_active', true)

    const destinos = (webhooks ?? []).filter(
      (w: { events: string[] }) => w.events.length === 0 || w.events.includes(input.eventType)
    )

    if (destinos.length === 0) return

    const { error: delError } = await admin.from('outbox_deliveries').insert(
      destinos.map((w: { id: string }) => ({
        event_id:        evento.id,
        organization_id: input.organizationId,
        target_kind:     'webhook',
        target_id:       w.id,
      }))
    )

    if (delError) {
      // El evento queda registrado aunque no se pueda entregar. Es lo correcto:
      // el hecho ocurrió, y así al menos consta.
      console.error('[outbox] evento registrado sin entregas:', delError)
    }
  } catch (e) {
    console.error('[outbox] fallo al emitir:', e)
  }
}
