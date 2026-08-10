// ─── Tipos compartidos ───────────────────────────────────────────────────────

import type { NotificationPrefs } from '@/lib/notifications/preferences'

export type ProfileFormData = {
  // Identidad
  first_name: string
  last_name: string
  avatar_url: string
  job_title: string
  department: string
  role: string
  // Contacto y estructura
  phone: string
  secondary_email: string
  manager_id: string | null
  bio: string
  pronouns: string
  // Preferencias regionales
  timezone: string
  date_format: string
  week_starts_on: number   // 0 = domingo, 1 = lunes
  // Apariencia
  theme: 'light' | 'dark' | 'system'
  table_density: 'comfortable' | 'compact'
  // Notificaciones
  notifications_email: boolean   // legacy — gestionado desde /ajustes
  notification_prefs: NotificationPrefs
}

export type ManagerOption = {
  id: string
  full_name: string
  job_title: string | null
}

// ─── Estilos compartidos de inputs ───────────────────────────────────────────

export const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50 disabled:bg-ltcard2'

export const selectCls = inputCls + ' appearance-none pr-8 cursor-pointer'

// ─── Componentes de UI compartidos ───────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
      {children}
    </label>
  )
}

export function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 pb-5 border-b border-ltb mb-6">
      <div className="w-[34px] h-[34px] rounded-[9px] bg-ltcard2 border border-ltb flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h2 className="font-sora text-[14px] font-semibold text-ltt">{title}</h2>
        <p className="font-sora text-[12px] text-lttm mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
      </svg>
    </div>
  )
}

export function ComingSoonNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-ltb bg-ltbg px-5 py-6 text-center">
      <p className="font-plex text-[10px] uppercase tracking-[1.2px] text-lttm mb-1.5">Próximamente</p>
      <p className="font-sora text-[13px] text-ltt2 max-w-[420px] mx-auto leading-relaxed">{children}</p>
    </div>
  )
}
