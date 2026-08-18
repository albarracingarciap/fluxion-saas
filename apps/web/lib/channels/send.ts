/**
 * Envío de avisos a canales de chat (Slack, Teams).
 *
 * Cada intento deja fila en `fluxion.channel_deliveries`. Eso no es telemetría:
 * es la diferencia entre "creemos que se avisó" y poder demostrarlo. Un aviso
 * de plazo regulatorio que se pierde en silencio es peor que no tener avisos.
 *
 * Los envíos que fallan quedan en `failed` y se reintentan en la siguiente
 * pasada del cron. Tras MAX_ATTEMPTS pasan a `abandoned` y quedan a la vista en
 * la interfaz, en lugar de reintentarse para siempre.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = SupabaseClient<any, any, any>

const MAX_ATTEMPTS = 5
const TIMEOUT_MS = 10_000

export type ChannelMessage = {
  title: string
  text: string
  /** Enlace al recurso en Fluxion. */
  url?: string
  /** Colorea la tarjeta en Teams y añade emoji en Slack. */
  level?: 'info' | 'warning' | 'critical'
}

const LEVEL_COLOR: Record<string, string> = {
  info: '0072C6',
  warning: 'FFA500',
  critical: 'D93025',
}

const LEVEL_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
}

// ── Formatos ─────────────────────────────────────────────────────────────────

function slackPayload(msg: ChannelMessage): unknown {
  const emoji = LEVEL_EMOJI[msg.level ?? 'info']
  const link = msg.url ? `\n<${msg.url}|Abrir en Fluxion>` : ''
  return { text: `${emoji} *${msg.title}*\n${msg.text}${link}` }
}

/**
 * Formato MessageCard, el de los conectores entrantes clásicos de Teams.
 *
 * OJO: Microsoft está retirando los conectores de Office 365 en favor de flujos
 * de Power Automate, cuyos webhooks esperan una Adaptive Card y NO entienden
 * este formato. Si al configurar un canal de Teams la entrega falla con 400,
 * es por esto y hay que añadir el otro formato.
 */
function teamsPayload(msg: ChannelMessage): unknown {
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: msg.title,
    themeColor: LEVEL_COLOR[msg.level ?? 'info'],
    title: msg.title,
    text: msg.text,
    potentialAction: msg.url
      ? [{ '@type': 'OpenUri', name: 'Abrir en Fluxion', targets: [{ os: 'default', uri: msg.url }] }]
      : undefined,
  }
}

function buildPayload(channelType: string, msg: ChannelMessage): unknown {
  return channelType === 'slack' ? slackPayload(msg) : teamsPayload(msg)
}

// ── Encolar ──────────────────────────────────────────────────────────────────

/**
 * Crea una entrega por cada canal activo suscrito al evento e intenta enviarla.
 *
 * Se persiste ANTES de intentar el envío: si el proceso muere a mitad, la
 * entrega queda pendiente y se reintenta, en lugar de desaparecer.
 */
export async function enqueueChannelMessage(
  admin: Admin,
  params: {
    organizationId: string
    eventType: string
    message: ChannelMessage
    subjectType?: string
    subjectId?: string
  }
): Promise<{ queued: number; sent: number }> {
  const { data: channels, error } = await admin
    .from('notification_channels')
    .select('id, channel_type, events')
    .eq('organization_id', params.organizationId)
    .eq('is_active', true)

  if (error) {
    console.error('[channels] no se pudieron leer los canales:', error)
    return { queued: 0, sent: 0 }
  }

  // `events` vacío significa "todos los eventos".
  const targets = (channels ?? []).filter(
    (c: { events: string[] }) => c.events.length === 0 || c.events.includes(params.eventType)
  )

  if (targets.length === 0) return { queued: 0, sent: 0 }

  const rows = targets.map((c: { id: string; channel_type: string }) => ({
    organization_id: params.organizationId,
    channel_id: c.id,
    event_type: params.eventType,
    subject_type: params.subjectType ?? null,
    subject_id: params.subjectId ?? null,
    payload: params.message as unknown as Record<string, unknown>,
  }))

  const { data: inserted, error: insErr } = await admin
    .from('channel_deliveries')
    .insert(rows)
    .select('id')

  if (insErr) {
    console.error('[channels] no se pudo registrar la entrega:', insErr)
    return { queued: 0, sent: 0 }
  }

  const sent = await deliverPending(admin, params.organizationId)
  return { queued: (inserted ?? []).length, sent }
}

// ── Entregar ─────────────────────────────────────────────────────────────────

/**
 * Intenta las entregas pendientes o fallidas de una organización.
 *
 * Lo llama tanto `enqueueChannelMessage` (envío inmediato) como el cron
 * (reintento de lo que quedó atrás).
 */
export async function deliverPending(admin: Admin, organizationId: string): Promise<number> {
  const { data: pending } = await admin
    .from('channel_deliveries')
    .select('id, channel_id, event_type, payload, attempts')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at')
    .limit(50)

  if (!pending || pending.length === 0) return 0

  let sent = 0

  for (const delivery of pending as Array<{
    id: string; channel_id: string | null; event_type: string
    payload: ChannelMessage; attempts: number
  }>) {
    if (!delivery.channel_id) {
      await admin.from('channel_deliveries')
        .update({ status: 'abandoned', last_error: 'El canal ya no existe.' })
        .eq('id', delivery.id)
      continue
    }

    const { data: channel } = await admin
      .from('notification_channels')
      .select('id, channel_type, is_active')
      .eq('id', delivery.channel_id)
      .maybeSingle()

    if (!channel || !channel.is_active) {
      await admin.from('channel_deliveries')
        .update({ status: 'abandoned', last_error: 'Canal inactivo o eliminado.' })
        .eq('id', delivery.id)
      continue
    }

    // La URL se descifra en cada intento y no se guarda en memoria más de lo necesario.
    const { data: url, error: secretErr } = await admin.rpc('channel_secret_get', {
      p_channel_id: channel.id,
    })

    if (secretErr || !url) {
      await admin.from('channel_deliveries').update({
        status: 'failed',
        attempts: delivery.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        last_error: 'No se pudo recuperar la URL del canal.',
      }).eq('id', delivery.id)
      continue
    }

    const attempt = delivery.attempts + 1
    let httpStatus: number | null = null
    let errorText: string | null = null

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(channel.channel_type, delivery.payload)),
        signal: controller.signal,
        cache: 'no-store',
      })

      clearTimeout(timer)
      httpStatus = response.status
      if (!response.ok) errorText = (await response.text()).slice(0, 500)
    } catch (err) {
      errorText = err instanceof Error ? err.message : String(err)
    }

    const ok = httpStatus !== null && httpStatus >= 200 && httpStatus < 300

    await admin.from('channel_deliveries').update({
      status: ok ? 'sent' : attempt >= MAX_ATTEMPTS ? 'abandoned' : 'failed',
      attempts: attempt,
      last_attempt_at: new Date().toISOString(),
      http_status: httpStatus,
      last_error: errorText,
      sent_at: ok ? new Date().toISOString() : null,
    }).eq('id', delivery.id)

    // Estado visible del canal, para pintarlo sin recorrer las entregas.
    await admin.from('notification_channels').update(
      ok
        ? { last_success_at: new Date().toISOString(), last_error: null }
        : { last_error_at: new Date().toISOString(), last_error: errorText }
    ).eq('id', channel.id)

    if (ok) sent++
  }

  return sent
}
