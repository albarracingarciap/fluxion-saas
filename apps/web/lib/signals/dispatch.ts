/**
 * Despacho de señales.
 *
 * Una señal por sí sola es una fila. Lo que la convierte en algo útil es lo que
 * dispara: traza en la cronología del sistema, aviso a quien corresponde y, si
 * es grave, una tarea con responsable.
 *
 * Las reglas están en TypeScript y no en un trigger de base de datos a
 * propósito: van a cambiar mucho durante los próximos meses y conviene poder
 * leerlas y probarlas.
 *
 * Deliberadamente son POCAS. Añadir reglas antes de tener módulos reales
 * generando señales es diseñar para casos imaginarios.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { createNotification } from '@/lib/notifications/sender'
import { severityAtLeast, type SignalRow } from './types'

/** Roles con responsabilidad de gobierno, destinatarios cuando el sistema no tiene leads. */
const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'risk_analyst'] as const

export type DispatchOutcome = {
  historyLogged: boolean
  notified: number
  taskId: string | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = SupabaseClient<any, any, any>

/**
 * Destinatarios del aviso.
 *
 * Primero los responsables asignados al sistema (`profile_systems.is_lead`).
 * Si no hay ninguno —o la señal no cuelga de un sistema— se avisa a los roles
 * de gobierno de la organización.
 *
 * NOTA: `ai_systems.ai_owner` es texto libre y no sirve para enrutar. Convertirlo
 * en una referencia a perfil está anotado como deuda de producto.
 */
async function resolveRecipients(
  admin: Admin,
  organizationId: string,
  systemId: string | null
): Promise<string[]> {
  if (systemId) {
    const { data: leads } = await admin
      .from('profile_systems')
      .select('profile_id')
      .eq('ai_system_id', systemId)
      .eq('is_lead', true)

    const leadIds = (leads ?? []).map((r: { profile_id: string }) => r.profile_id)
    if (leadIds.length > 0) return leadIds
  }

  const { data: governance } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .in('role', GOVERNANCE_ROLES)

  return (governance ?? []).map((r: { id: string }) => r.id)
}

function buildBody(signal: SignalRow): string {
  const parts: string[] = []
  if (signal.summary) parts.push(signal.summary)
  if (signal.metric_name && signal.metric_value !== null) {
    const umbral = signal.threshold !== null ? ` (umbral ${signal.threshold})` : ''
    parts.push(`${signal.metric_name}: ${signal.metric_value}${umbral}`)
  }
  parts.push(`Origen: ${signal.source_module}`)
  return parts.join(' · ')
}

export async function dispatchSignal(admin: Admin, signal: SignalRow): Promise<DispatchOutcome> {
  const outcome: DispatchOutcome = { historyLogged: false, notified: 0, taskId: null }

  // ── 1 · Traza en la cronología del sistema ────────────────────────────────
  if (signal.system_id) {
    const { error } = await admin.from('ai_system_history').insert({
      ai_system_id:    signal.system_id,
      organization_id: signal.organization_id,
      event_type:      'signal_received',
      event_title:     signal.title,
      event_summary:   signal.summary ?? null,
      payload: {
        signal_id:     signal.id,
        signal_type:   signal.signal_type,
        severity:      signal.severity,
        source_module: signal.source_module,
        source_ref:    signal.source_ref,
        metric_name:   signal.metric_name,
        metric_value:  signal.metric_value,
        threshold:     signal.threshold,
        occurred_at:   signal.occurred_at,
      },
    })

    if (error) console.error('[dispatchSignal] historial:', error)
    else outcome.historyLogged = true
  }

  // Por debajo de 'high' la señal queda registrada y visible, pero no interrumpe
  // a nadie. Avisar de todo es la forma más rápida de que dejen de leer los avisos.
  if (!severityAtLeast(signal.severity, 'high')) return outcome

  const recipients = await resolveRecipients(admin, signal.organization_id, signal.system_id)

  // ── 2 · Tarea, solo para señales críticas ─────────────────────────────────
  if (signal.severity === 'critical') {
    const { data: task, error } = await admin
      .from('tasks')
      .insert({
        organization_id: signal.organization_id,
        system_id:       signal.system_id,
        title:           signal.title.slice(0, 300),
        description:     buildBody(signal),
        priority:        'critical',
        source_type:     'signal',
        source_id:       signal.id,
        assignee_id:     recipients[0] ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[dispatchSignal] tarea:', error)
    } else if (task) {
      outcome.taskId = task.id
      await admin.from('signals').update({ task_id: task.id }).eq('id', signal.id)
    }
  }

  // ── 3 · Aviso ─────────────────────────────────────────────────────────────
  const body = buildBody(signal)
  const linkUrl = signal.system_id ? `/inventario/${signal.system_id}` : '/dashboard'

  for (const profileId of recipients) {
    await createNotification({
      recipientProfileId: profileId,
      organizationId:     signal.organization_id,
      type:               'signal_alert',
      title:              signal.title,
      body,
      linkUrl,
      metadata: {
        signal_id:   signal.id,
        signal_type: signal.signal_type,
        severity:    signal.severity,
        task_id:     outcome.taskId,
      },
      sendEmail: false,
    })
    outcome.notified++
  }

  if (recipients.length === 0) {
    // Una señal grave sin destinatario es un problema de configuración, no un
    // caso normal: sin roles de gobierno ni responsables asignados, nadie se
    // entera de nada.
    console.warn(
      `[dispatchSignal] señal ${signal.severity} sin destinatarios: org=${signal.organization_id} signal=${signal.id}`
    )
  }

  return outcome
}
