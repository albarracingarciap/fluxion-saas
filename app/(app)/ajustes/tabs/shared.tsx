'use client';

import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AccountPrefs {
  language:       string
  timezone:       string
  date_format:    string
  time_format:    string
  density:        string
  start_of_week:  string
}

export interface NotifMatrix {
  assignments: { email: boolean; inapp: boolean }
  due_dates:   { email: boolean; inapp: boolean }
  mentions:    { email: boolean; inapp: boolean }
  evaluations: { email: boolean; inapp: boolean }
  system:      { email: boolean; inapp: boolean }
}

export interface NotificationPrefs {
  matrix:           NotifMatrix
  digest_frequency: string
  digest_time:      string
}

export type SessionInfo = {
  id:         string
  created_at: string
  updated_at: string
  not_after:  string | null
  user_agent: string | null
  ip:         string | null
  isCurrent:  boolean
}

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_ACCOUNT_PREFS: AccountPrefs = {
  language:      'es',
  timezone:      'Europe/Madrid',
  date_format:   'dd/mm/yyyy',
  time_format:   '24h',
  density:       'comfortable',
  start_of_week: 'monday',
}

export const DEFAULT_NOTIF_MATRIX: NotifMatrix = {
  assignments: { email: true,  inapp: true  },
  due_dates:   { email: true,  inapp: true  },
  mentions:    { email: true,  inapp: true  },
  evaluations: { email: true,  inapp: true  },
  system:      { email: false, inapp: true  },
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  matrix:           DEFAULT_NOTIF_MATRIX,
  digest_frequency: 'daily',
  digest_time:      '09:00',
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const NOTIFICATION_CATEGORIES: Array<{
  key:         keyof NotifMatrix
  label:       string
  description: string
}> = [
  { key: 'assignments',  label: 'Asignaciones',            description: 'Tareas, GAPs y planes asignados a ti' },
  { key: 'due_dates',    label: 'Vencimientos',             description: 'Recordatorios antes y al vencer plazos' },
  { key: 'mentions',     label: 'Menciones y comentarios',  description: 'Cuando te mencionan en evaluaciones o tareas' },
  { key: 'evaluations',  label: 'Evaluaciones',             description: 'Aprobaciones requeridas y resultados' },
  { key: 'system',       label: 'Sistema',                  description: 'Cambios de rol, accesos y anuncios de Fluxion' },
]

export const TIMEZONES = [
  { value: 'Europe/Madrid',                    label: 'Europa/Madrid (CET/CEST)' },
  { value: 'Europe/London',                    label: 'Europa/Londres (GMT/BST)' },
  { value: 'Europe/Paris',                     label: 'Europa/París (CET/CEST)' },
  { value: 'America/Mexico_City',              label: 'América/Ciudad de México (CST/CDT)' },
  { value: 'America/Bogota',                   label: 'América/Bogotá (COT)' },
  { value: 'America/Lima',                     label: 'América/Lima (PET)' },
  { value: 'America/Argentina/Buenos_Aires',   label: 'América/Buenos Aires (ART)' },
  { value: 'America/Santiago',                 label: 'América/Santiago (CLT/CLST)' },
  { value: 'America/New_York',                 label: 'América/Nueva York (EST/EDT)' },
  { value: 'America/Los_Angeles',              label: 'América/Los Ángeles (PST/PDT)' },
  { value: 'UTC',                              label: 'UTC' },
]

// ── UI helpers ─────────────────────────────────────────────────────────────────

export const inputCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50 disabled:bg-ltcard2'

export const selectCls = inputCls + ' appearance-none pr-8 cursor-pointer'

export function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </div>
  )
}

export function SectionHeader({ icon, title, description }: {
  icon:        React.ReactNode
  title:       string
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

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
      {children}
    </label>
  )
}

export function Toggle({ enabled, onChange, label, description }: {
  enabled:      boolean
  onChange:     (v: boolean) => void
  label:        string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-[9px] border transition-all text-left ${
        enabled ? 'border-brand-cyan bg-cyan-dim' : 'border-ltb bg-ltcard2 hover:border-ltbl'
      }`}
    >
      <div className={`w-[36px] h-[20px] rounded-full relative shrink-0 transition-colors ${enabled ? 'bg-brand-cyan' : 'bg-ltbl'}`}>
        <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
      </div>
      <div>
        <div className="font-sora text-[13px] font-medium text-ltt">{label}</div>
        {description && <div className="font-sora text-[11.5px] text-lttm mt-0.5">{description}</div>}
      </div>
    </button>
  )
}

/** Small inline toggle used in the notification matrix cells */
export function MiniToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-checked={enabled}
      role="switch"
      className={`w-[34px] h-[19px] rounded-full relative shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-cyan/30 ${
        enabled ? 'bg-brand-cyan' : 'bg-ltbl'
      }`}
    >
      <div className={`absolute top-[2.5px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
        enabled ? 'translate-x-[17px]' : 'translate-x-[2.5px]'
      }`} />
    </button>
  )
}

/** Per-tab save bar with inline status feedback */
export function SaveBar({
  loading,
  saved,
  error,
  onSave,
  hint,
}: {
  loading: boolean
  saved:   boolean
  error:   string | null
  onSave:  () => void
  hint?:   string
}) {
  return (
    <div className="flex items-center justify-between pt-5 mt-5 border-t border-ltb">
      <div className="text-[12px] font-sora text-lttm">
        {error  ? <span className="text-re">{error}</span>
        : saved  ? <span className="text-gr">✓ Cambios guardados</span>
        : hint   ? <span>{hint}</span>
        : <span>Los cambios son personales y no afectan a otros miembros.</span>}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[9px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none shrink-0"
      >
        {loading
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Guardando…</>
          : 'Guardar cambios'}
      </button>
    </div>
  )
}

/** Parse a User-Agent string into a readable device/browser label */
export function parseUserAgent(ua: string | null | undefined): { browser: string; os: string } {
  if (!ua) return { browser: 'Navegador desconocido', os: 'Sistema desconocido' }
  const browser =
    ua.includes('Edg/')       ? 'Microsoft Edge'  :
    ua.includes('OPR/')       ? 'Opera'            :
    ua.includes('Chrome/')    ? 'Chrome'           :
    ua.includes('Firefox/')   ? 'Firefox'          :
    ua.includes('Safari/')    ? 'Safari'           :
    ua.includes('curl')       ? 'API (curl)'       : 'Navegador'
  const os =
    ua.includes('Windows')    ? 'Windows'  :
    ua.includes('Mac OS X')   ? 'macOS'    :
    ua.includes('iPhone')     ? 'iPhone'   :
    ua.includes('iPad')       ? 'iPad'     :
    ua.includes('Android')    ? 'Android'  :
    ua.includes('Linux')      ? 'Linux'    : 'Sistema desconocido'
  return { browser, os }
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  <  1) return 'Ahora mismo'
  if (mins  < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours} h`
  if (days  <  7) return `Hace ${days} días`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
