// ─── Catálogo central de notificaciones ─────────────────────────────────────
// Define qué eventos pueden notificar y por qué canales. Se usa tanto desde
// la UI de preferencias del usuario como desde los crons / server actions
// que generen notificaciones (paso a paso, conforme se enchufe el email).

export type NotificationChannel = 'email' | 'in_app'

export type NotificationEventKey =
  | 'action_assigned'
  | 'action_overdue'
  | 'plan_pending_approval'
  | 'plan_decision'
  | 'review_due'
  | 'evidence_expiring'
  | 'task_assigned'
  | 'weekly_summary'

export type NotificationCategory = 'assignments' | 'approvals' | 'deadlines' | 'summaries'

export type NotificationEventDef = {
  key: NotificationEventKey
  category: NotificationCategory
  label: string
  description: string
  channels: NotificationChannel[]   // canales soportados por este evento
  defaultEnabled: Partial<Record<NotificationChannel, boolean>>
}

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
  {
    key: 'action_assigned',
    category: 'assignments',
    label: 'Acción asignada a mí',
    description: 'Cuando un compañero te asigna como owner de una acción de un plan.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'task_assigned',
    category: 'assignments',
    label: 'Tarea asignada a mí',
    description: 'Cuando se te asigna una nueva tarea en el módulo de Tareas.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'plan_pending_approval',
    category: 'approvals',
    label: 'Plan pendiente de mi aprobación',
    description: 'Cuando un plan de tratamiento se envía a aprobación y eres el aprobador.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'plan_decision',
    category: 'approvals',
    label: 'Decisión sobre mis planes',
    description: 'Cuando un plan que enviaste es aprobado o rechazado.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'action_overdue',
    category: 'deadlines',
    label: 'Acción vencida',
    description: 'Cuando una acción a tu cargo supera su fecha objetivo sin completarse.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'review_due',
    category: 'deadlines',
    label: 'Revisión periódica próxima',
    description: 'Cuando una aceptación o diferimiento requiere re-evaluación.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'evidence_expiring',
    category: 'deadlines',
    label: 'Evidencia por caducar',
    description: 'Cuando una evidencia se aproxima a su fecha de caducidad.',
    channels: ['email', 'in_app'],
    defaultEnabled: { email: true, in_app: true },
  },
  {
    key: 'weekly_summary',
    category: 'summaries',
    label: 'Resumen semanal',
    description: 'Resumen cada lunes con tus pendientes, vencimientos y revisiones próximas.',
    channels: ['email'],
    defaultEnabled: { email: true },
  },
]

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  assignments: 'Asignaciones',
  approvals:   'Aprobaciones',
  deadlines:   'Vencimientos',
  summaries:   'Resúmenes',
}

export type NotificationPrefs = Partial<
  Record<NotificationEventKey, Partial<Record<NotificationChannel, boolean>>>
>

export function getDefaultNotificationPrefs(): NotificationPrefs {
  const prefs: NotificationPrefs = {}
  for (const event of NOTIFICATION_EVENTS) {
    prefs[event.key] = { ...event.defaultEnabled }
  }
  return prefs
}

/**
 * Resuelve las preferencias de un perfil con fallback a defaults.
 * Apta para uso en crons y server actions que decidan si emitir notificación.
 */
export function resolveNotificationPrefs(
  rawPrefs: NotificationPrefs | Record<string, unknown> | null | undefined
): NotificationPrefs {
  const defaults = getDefaultNotificationPrefs()
  const stored = (rawPrefs as NotificationPrefs) ?? {}

  const result: NotificationPrefs = {}
  for (const event of NOTIFICATION_EVENTS) {
    result[event.key] = {
      ...defaults[event.key],
      ...stored[event.key],
    }
  }
  return result
}

/**
 * Comprueba si un canal está habilitado para un evento dado.
 */
export function isNotificationEnabled(
  prefs: NotificationPrefs,
  event: NotificationEventKey,
  channel: NotificationChannel
): boolean {
  return prefs[event]?.[channel] ?? false
}
