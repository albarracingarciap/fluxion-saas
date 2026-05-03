/**
 * lib/notifications/sender.ts
 * Helper centralizado para crear notificaciones in-app y enviar emails.
 * Siempre fire-and-forget: nunca lanza excepciones.
 *
 * Respeta las preferencias del usuario (profiles.preferences.notifications.matrix)
 * para decidir si enviar email o solo notificación in-app.
 */

import { createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { sendTaskEmail } from './email'
import {
  resolveNotificationPrefs,
  isNotificationEnabled,
  type NotificationEventKey,
} from './preferences'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.fluxion.ai'

// Mapa: tipo de notificación → clave en la matriz de preferencias
const TYPE_TO_PREF_KEY: Record<string, NotificationEventKey> = {
  task_assigned:    'task_assigned',
  mention:          'task_assigned',  // reutiliza assignments hasta tener clave propia
  comment_added:    'task_assigned',
  status_changed:   'task_assigned',
  attachment_added: 'task_assigned',
}

export interface NotificationInput {
  recipientProfileId: string
  organizationId:     string
  type:               string
  title:              string
  body?:              string
  linkUrl?:           string
  relatedTaskId?:     string
  metadata?:          Record<string, unknown>
  // Para email
  recipientEmail?:    string
  recipientName?:     string
  actorName?:         string
  taskTitle?:         string
  emailExtraLines?:   string[]
  // Si false, fuerza omitir email (ej. el actor no necesita notificarse a sí mismo)
  sendEmail?:         boolean
}

/**
 * Crea una notificación in-app y opcionalmente envía email.
 * No lanza excepciones.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const admin = createAdminFluxionClient()

    // Insertar notificación in-app
    await admin.from('notifications').insert({
      recipient_id:    input.recipientProfileId,
      organization_id: input.organizationId,
      type:            input.type,
      title:           input.title,
      body:            input.body ?? null,
      link_url:        input.linkUrl ?? null,
      related_task_id: input.relatedTaskId ?? null,
      metadata:        input.metadata ?? null,
    })

    // Email: solo si hay dirección, tipo mapeado y preferencias lo permiten
    if (input.sendEmail !== false && input.recipientEmail && input.taskTitle && input.relatedTaskId) {
      const prefKey = TYPE_TO_PREF_KEY[input.type]

      // Leer preferencias del destinatario para respetar su configuración
      let emailEnabled = true
      if (prefKey) {
        const { data: profile } = await admin
          .from('profiles')
          .select('preferences')
          .eq('id', input.recipientProfileId)
          .single()

        if (profile?.preferences) {
          const prefs = resolveNotificationPrefs(
            (profile.preferences as Record<string, unknown>)?.notifications as Record<string, unknown>
          )
          emailEnabled = isNotificationEnabled(prefs, prefKey, 'email')
        }
      }

      if (emailEnabled) {
        await sendTaskEmail({
          to:            input.recipientEmail,
          type:          input.type,
          recipientName: input.recipientName,
          taskTitle:     input.taskTitle,
          taskUrl:       `${APP_URL}${input.linkUrl ?? `/tareas`}`,
          actorName:     input.actorName,
          extraLines:    input.emailExtraLines,
        })
      }
    }
  } catch (err) {
    console.error('[notification] createNotification error:', err)
  }
}

/**
 * Notifica a todos los watchers de una tarea excepto los excluidos.
 * Usa service_role para leer watchers + profiles.
 */
export async function notifyTaskWatchers(params: {
  taskId:            string
  organizationId:    string
  excludeProfileIds: string[]   // normalmente el actor
  type:              string
  title:             string
  body?:             string
  linkUrl?:          string
  actorName?:        string
  taskTitle?:        string
  emailExtraLines?:  string[]
}): Promise<void> {
  try {
    const admin = createAdminFluxionClient()

    const { data: watchers } = await admin
      .from('task_watchers')
      .select('user_id')
      .eq('task_id', params.taskId)

    if (!watchers || watchers.length === 0) return

    const excluded = new Set(params.excludeProfileIds)

    // Obtener emails de los watchers para el email
    const watcherIds = watchers
      .map((w) => w.user_id)
      .filter((id) => !excluded.has(id))

    if (watcherIds.length === 0) return

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, display_name, full_name, preferences')
      .in('id', watcherIds)

    if (!profiles) return

    for (const profile of profiles) {
      await createNotification({
        recipientProfileId: profile.id,
        organizationId:     params.organizationId,
        type:               params.type,
        title:              params.title,
        body:               params.body,
        linkUrl:            params.linkUrl,
        relatedTaskId:      params.taskId,
        recipientEmail:     profile.email ?? undefined,
        recipientName:      profile.display_name ?? profile.full_name ?? undefined,
        actorName:          params.actorName,
        taskTitle:          params.taskTitle,
        emailExtraLines:    params.emailExtraLines,
      })
    }
  } catch (err) {
    console.error('[notification] notifyTaskWatchers error:', err)
  }
}

/**
 * Añade watchers automáticos (source='auto') a una tarea.
 * Idempotente: usa INSERT ... ON CONFLICT DO NOTHING.
 */
export async function addAutoWatchers(params: {
  taskId:      string
  profileIds:  string[]   // pueden ser null/undefined, se filtran
}): Promise<void> {
  try {
    const ids = params.profileIds.filter(Boolean)
    if (ids.length === 0) return

    const admin = createAdminFluxionClient()
    await admin.from('task_watchers').upsert(
      ids.map((uid) => ({
        task_id:  params.taskId,
        user_id:  uid,
        source:   'auto',
      })),
      { onConflict: 'task_id,user_id', ignoreDuplicates: true }
    )
  } catch (err) {
    console.error('[notification] addAutoWatchers error:', err)
  }
}

/**
 * Registra una entrada en task_activity_log.
 * Fire-and-forget. Usa service_role.
 */
export async function logTaskActivity(params: {
  taskId:    string
  actorId?:  string
  action:    string
  field?:    string
  oldValue?: unknown
  newValue?: unknown
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const admin = createAdminFluxionClient()
    await admin.from('task_activity_log').insert({
      task_id:   params.taskId,
      actor_id:  params.actorId ?? null,
      action:    params.action,
      field:     params.field ?? null,
      old_value: params.oldValue !== undefined ? params.oldValue : null,
      new_value: params.newValue !== undefined ? params.newValue : null,
      metadata:  params.metadata ?? null,
    })
  } catch (err) {
    console.error('[notification] logTaskActivity error:', err)
  }
}
