import { Bell, Mail, BellRing } from 'lucide-react'
import { SectionHeader, type ProfileFormData } from './shared'
import {
  NOTIFICATION_EVENTS,
  CATEGORY_LABELS,
  resolveNotificationPrefs,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationEventKey,
  type NotificationPrefs,
} from '@/lib/notifications/preferences'

const CHANNEL_META: Record<NotificationChannel, { label: string; icon: React.ReactNode }> = {
  email:  { label: 'Email',  icon: <Mail size={11} /> },
  in_app: { label: 'In-app', icon: <BellRing size={11} /> },
}

const CHANNELS: NotificationChannel[] = ['email', 'in_app']

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
}

export function NotificacionesTab({ formData, setFormData }: Props) {
  const prefs = resolveNotificationPrefs(formData.notification_prefs)

  function toggleEvent(event: NotificationEventKey, channel: NotificationChannel) {
    const current = prefs[event]?.[channel] ?? false
    const next: NotificationPrefs = {
      ...formData.notification_prefs,
      [event]: {
        ...prefs[event],
        [channel]: !current,
      },
    }
    setFormData({ ...formData, notification_prefs: next })
  }

  function isChannelMasterOn(channel: NotificationChannel): boolean {
    return NOTIFICATION_EVENTS
      .filter((e) => e.channels.includes(channel))
      .some((e) => prefs[e.key]?.[channel] ?? false)
  }

  function setChannelMaster(channel: NotificationChannel, enabled: boolean) {
    const next: NotificationPrefs = { ...formData.notification_prefs }
    for (const event of NOTIFICATION_EVENTS) {
      if (event.channels.includes(channel)) {
        next[event.key] = {
          ...prefs[event.key],
          [channel]: enabled,
        }
      }
    }
    setFormData({ ...formData, notification_prefs: next })
  }

  // Agrupar eventos por categoría preservando orden de NOTIFICATION_EVENTS
  const grouped = new Map<NotificationCategory, typeof NOTIFICATION_EVENTS>()
  for (const event of NOTIFICATION_EVENTS) {
    const list = grouped.get(event.category) ?? []
    list.push(event)
    grouped.set(event.category, list)
  }

  return (
    <div>
      <SectionHeader
        icon={<Bell size={16} className="text-ltt2" />}
        title="Notificaciones"
        description="Decide qué eventos te llegan por email y en la aplicación."
      />

      <div className="rounded-[10px] border border-ltb bg-ltcard overflow-hidden">

        {/* Cabecera con canales y master toggle */}
        <div className="grid grid-cols-[1fr_84px_84px] gap-1 px-5 py-3 border-b border-ltb bg-ltcard2">
          <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center">
            Evento
          </div>
          {CHANNELS.map((channel) => {
            const isOn = isChannelMasterOn(channel)
            const meta = CHANNEL_META[channel]
            return (
              <div key={channel} className="text-center">
                <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center justify-center gap-1">
                  {meta.icon}
                  {meta.label}
                </div>
                <button
                  type="button"
                  onClick={() => setChannelMaster(channel, !isOn)}
                  className="font-plex text-[9px] uppercase tracking-[0.7px] text-brand-cyan hover:underline mt-0.5"
                >
                  {isOn ? 'Pausar todo' : 'Reanudar todo'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Filas por categoría */}
        {Array.from(grouped.entries()).map(([catKey, events], catIdx) => (
          <div key={catKey} className={catIdx > 0 ? 'border-t border-ltb' : ''}>
            <div className="px-5 py-2 bg-ltbg">
              <p className="font-plex text-[9.5px] uppercase tracking-[1.1px] text-lttm font-semibold">
                {CATEGORY_LABELS[catKey]}
              </p>
            </div>
            {events.map((event, evIdx) => (
              <div
                key={event.key}
                className={`grid grid-cols-[1fr_84px_84px] gap-1 px-5 py-3 items-center ${
                  evIdx > 0 ? 'border-t border-ltb' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-sora text-[13px] text-ltt leading-snug">{event.label}</p>
                  <p className="font-sora text-[11.5px] text-lttm mt-0.5 leading-snug">
                    {event.description}
                  </p>
                </div>
                {CHANNELS.map((channel) => {
                  const supported = event.channels.includes(channel)
                  if (!supported) {
                    return (
                      <div key={channel} className="flex justify-center">
                        <span className="font-plex text-[14px] text-lttm" title="No aplica para este canal">—</span>
                      </div>
                    )
                  }
                  const enabled = prefs[event.key]?.[channel] ?? false
                  return (
                    <div key={channel} className="flex justify-center">
                      <Switch
                        enabled={enabled}
                        onChange={() => toggleEvent(event.key, channel)}
                        ariaLabel={`${event.label} — ${CHANNEL_META[channel].label}`}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <p className="font-sora text-[11.5px] text-lttm mt-4 leading-relaxed">
        Las preferencias se aplican a todas las notificaciones que la plataforma genere
        sobre eventos de la organización. La configuración se guarda con el resto del perfil.
      </p>
    </div>
  )
}

// ─── Switch reutilizable ─────────────────────────────────────────────────────

function Switch({
  enabled,
  onChange,
  ariaLabel,
}: {
  enabled: boolean
  onChange: () => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative w-[34px] h-[20px] rounded-full transition-colors shrink-0 ${
        enabled ? 'bg-brand-cyan' : 'bg-ltbl'
      }`}
    >
      <div
        className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-[17px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}
