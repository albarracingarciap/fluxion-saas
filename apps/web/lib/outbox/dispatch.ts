import 'server-only'

import { createHmac } from 'crypto'

import { createNoCacheAdminClient } from '@/lib/supabase/ingest'

/**
 * Espera creciente entre intentos, en minutos.
 *
 * Un endpoint que falla suele estar caído, no ocupado: insistir cada minuto no
 * lo arregla y sí llena su log. A los seis intentos —algo más de un día— se
 * abandona, y eso queda dicho en el estado en lugar de dejar una fila
 * reintentándose para siempre.
 */
const ESPERAS = [1, 5, 15, 60, 360, 1440]
const MAX_INTENTOS = ESPERAS.length

/**
 * Firma el cuerpo con HMAC-SHA256.
 *
 * ⚠️ El envío de prueba usaba `sha256(secreto + "." + payload)`, que NO es HMAC
 * aunque el comentario, la cabecera y la documentación dijeran que sí. Un hash
 * con sal es vulnerable a extensión de longitud y, sobre todo, es incompatible
 * con lo que implementaría cualquier receptor siguiendo la convención:
 * `createHmac('sha256', secreto)`.
 *
 * Se corrige aquí y en el botón de prueba. Como nunca se ha disparado un
 * webhook real, no hay ningún receptor al que romper.
 */
export function firmar(secreto: string, cuerpo: string): string {
  return createHmac('sha256', secreto).update(cuerpo).digest('hex')
}

export type ResultadoDespacho = {
  intentadas: number
  enviadas:   number
  fallidas:   number
  abandonadas: number
}

/**
 * Entrega lo pendiente cuya hora ya llegó.
 *
 * Lo llama el cron. No lanza: un destino roto no puede impedir que se entreguen
 * los demás.
 */
export async function dispatchOutbox(limite = 50): Promise<ResultadoDespacho> {
  const admin = createNoCacheAdminClient()
  const resultado: ResultadoDespacho = { intentadas: 0, enviadas: 0, fallidas: 0, abandonadas: 0 }

  const { data: pendientes, error } = await admin
    .from('outbox_deliveries')
    .select('id, event_id, target_id, attempts')
    .eq('status', 'pending')
    .eq('target_kind', 'webhook')
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at')
    .limit(limite)

  if (error) {
    console.error('[outbox] no se pudieron leer las entregas pendientes:', error)
    return resultado
  }

  if (!pendientes?.length) return resultado

  const eventoIds = Array.from(new Set(pendientes.map((d: { event_id: string }) => d.event_id)))
  const webhookIds = Array.from(new Set(pendientes.map((d: { target_id: string }) => d.target_id)))

  const [{ data: eventos }, { data: webhooks }] = await Promise.all([
    admin.from('outbox_events')
      .select('id, event_type, subject_type, subject_id, payload, occurred_at')
      .in('id', eventoIds),
    admin.from('webhooks').select('id, url, secret, is_active').in('id', webhookIds),
  ])

  const porEvento = new Map((eventos ?? []).map((e: { id: string }) => [e.id, e]))
  const porWebhook = new Map((webhooks ?? []).map((w: { id: string }) => [w.id, w]))

  for (const entrega of pendientes as Array<{
    id: string; event_id: string; target_id: string; attempts: number
  }>) {
    resultado.intentadas += 1

    const evento = porEvento.get(entrega.event_id) as {
      id: string; event_type: string; subject_type: string | null
      subject_id: string | null; payload: unknown; occurred_at: string
    } | undefined
    const webhook = porWebhook.get(entrega.target_id) as {
      id: string; url: string; secret: string; is_active: boolean
    } | undefined

    // El webhook se borró o se desactivó despues de encolar la entrega. No es
    // un fallo del envío: es que el destino ya no quiere recibir.
    if (!evento || !webhook || !webhook.is_active) {
      await admin.from('outbox_deliveries').update({
        status: 'abandoned',
        last_error: !evento ? 'Evento inexistente' : 'El webhook ya no está activo',
        last_attempt_at: new Date().toISOString(),
      }).eq('id', entrega.id)
      resultado.abandonadas += 1
      continue
    }

    const cuerpo = JSON.stringify({
      event:        evento.event_type,
      event_id:     evento.id,
      subject_type: evento.subject_type,
      subject_id:   evento.subject_id,
      occurred_at:  evento.occurred_at,
      data:         evento.payload,
    })

    const intentos = entrega.attempts + 1
    let ok = false
    let httpStatus: number | null = null
    let mensaje: string | null = null

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-Fluxion-Event':     evento.event_type,
          'X-Fluxion-Delivery':  entrega.id,
          'X-Fluxion-Signature': `sha256=${firmar(webhook.secret, cuerpo)}`,
        },
        body: cuerpo,
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      })
      httpStatus = res.status
      ok = res.ok
      if (!ok) mensaje = `El receptor respondió ${res.status}`
    } catch (e) {
      mensaje = e instanceof Error ? e.message : 'Error de conexión'
    }

    if (ok) {
      await admin.from('outbox_deliveries').update({
        status: 'sent',
        attempts: intentos,
        http_status: httpStatus,
        last_attempt_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', entrega.id)
      resultado.enviadas += 1
      continue
    }

    const agotado = intentos >= MAX_INTENTOS
    const espera = ESPERAS[Math.min(intentos, ESPERAS.length - 1)]

    await admin.from('outbox_deliveries').update({
      status: agotado ? 'abandoned' : 'pending',
      attempts: intentos,
      http_status: httpStatus,
      last_error: mensaje,
      last_attempt_at: new Date().toISOString(),
      next_attempt_at: new Date(Date.now() + espera * 60_000).toISOString(),
    }).eq('id', entrega.id)

    if (agotado) resultado.abandonadas += 1
    else resultado.fallidas += 1
  }

  return resultado
}
