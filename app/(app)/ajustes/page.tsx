'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import Link from 'next/link'
import { ArrowLeft, Settings, User, Bell, Monitor, ClipboardList, Shield, Key, Webhook, Loader2 } from 'lucide-react'
import { MiCuentaTab }        from './tabs/mi-cuenta'
import { NotificacionesTab }  from './tabs/notificaciones'
import { SesionesTab }        from './tabs/sesiones'
import { AuditoriaTab }       from './tabs/auditoria'
import { SeguridadTab }       from './tabs/seguridad'
import { ApiKeysTab }         from './tabs/api-keys'
import { WebhooksTab }        from './tabs/webhooks'
import {
  DEFAULT_ACCOUNT_PREFS, DEFAULT_NOTIF_PREFS,
  type AccountPrefs, type NotificationPrefs,
} from './tabs/shared'

// ── Tab config ──────────────────────────────────────────────────────────────────

type TabKey = 'mi-cuenta' | 'notificaciones' | 'sesiones' | 'auditoria' | 'seguridad' | 'api' | 'webhooks'

const PERSONAL_TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'mi-cuenta',      label: 'Mi cuenta',       icon: <User          size={14} /> },
  { key: 'notificaciones', label: 'Notificaciones',   icon: <Bell          size={14} /> },
  { key: 'sesiones',       label: 'Sesiones activas', icon: <Monitor       size={14} /> },
]

const WORKSPACE_TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'auditoria', label: 'Auditoría',           icon: <ClipboardList size={14} /> },
  { key: 'seguridad', label: 'Seguridad',           icon: <Shield        size={14} /> },
  { key: 'api',       label: 'API y desarrolladores', icon: <Key         size={14} /> },
  { key: 'webhooks',  label: 'Webhooks',            icon: <Webhook       size={14} /> },
]

// ── Helpers: parse preferences from JSONB ───────────────────────────────────────

function parseAccountPrefs(raw: unknown): AccountPrefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_ACCOUNT_PREFS
  const p = raw as Record<string, unknown>

  // Support both old flat keys and new nested account.*
  const account = (p.account && typeof p.account === 'object')
    ? p.account as Record<string, unknown>
    : p

  return {
    language:      typeof account.language      === 'string' ? account.language      : (typeof p.ui_language === 'string' ? p.ui_language : DEFAULT_ACCOUNT_PREFS.language),
    timezone:      typeof account.timezone      === 'string' ? account.timezone      : DEFAULT_ACCOUNT_PREFS.timezone,
    date_format:   typeof account.date_format   === 'string' ? account.date_format   : DEFAULT_ACCOUNT_PREFS.date_format,
    time_format:   typeof account.time_format   === 'string' ? account.time_format   : DEFAULT_ACCOUNT_PREFS.time_format,
    density:       typeof account.density       === 'string' ? account.density       : (typeof p.ui_density === 'string' ? p.ui_density : DEFAULT_ACCOUNT_PREFS.density),
    start_of_week: typeof account.start_of_week === 'string' ? account.start_of_week : DEFAULT_ACCOUNT_PREFS.start_of_week,
  }
}

function parseNotifPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_NOTIF_PREFS
  const p = raw as Record<string, unknown>

  // Support both old flat keys and new nested notifications.*
  const notif = (p.notifications && typeof p.notifications === 'object')
    ? p.notifications as Record<string, unknown>
    : {}

  const matrix = (notif.matrix && typeof notif.matrix === 'object')
    ? notif.matrix as Record<string, unknown>
    : {}

  function cellOrDefault(key: string, emailDef: boolean, inappDef: boolean) {
    const cell = matrix[key] as Record<string, boolean> | undefined
    return {
      email: typeof cell?.email === 'boolean' ? cell.email : emailDef,
      inapp: typeof cell?.inapp === 'boolean' ? cell.inapp : inappDef,
    }
  }

  return {
    matrix: {
      assignments: cellOrDefault('assignments', true,  true),
      due_dates:   cellOrDefault('due_dates',   true,  true),
      mentions:    cellOrDefault('mentions',    true,  true),
      evaluations: cellOrDefault('evaluations', true,  true),
      system:      cellOrDefault('system',      false, true),
    },
    digest_frequency: typeof notif.digest_frequency === 'string'
      ? notif.digest_frequency
      : (typeof p.digest_frequency === 'string' ? p.digest_frequency : DEFAULT_NOTIF_PREFS.digest_frequency),
    digest_time: typeof notif.digest_time === 'string'
      ? notif.digest_time
      : DEFAULT_NOTIF_PREFS.digest_time,
  }
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AjustesPage() {
  const { profile, organization, loadUserData } = useAuthStore()
  const [activeTab, setActiveTab]         = useState<TabKey>('mi-cuenta')
  const [accountPrefs, setAccountPrefs]   = useState<AccountPrefs>(DEFAULT_ACCOUNT_PREFS)
  const [notifPrefs, setNotifPrefs]       = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS)
  const [prefsLoaded, setPrefsLoaded]     = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (profile as any)?.role === 'org_admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgRetentionMonths = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audit_log:     (organization as any)?.audit_log_retention_months     ?? 36,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evidence:      (organization as any)?.evidence_retention_months      ?? 84,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personal_data: (organization as any)?.personal_data_retention_months ?? 60,
  }

  useEffect(() => {
    if (profile) {
      setAccountPrefs(parseAccountPrefs(profile.preferences))
      setNotifPrefs(parseNotifPrefs(profile.preferences))
      setPrefsLoaded(true)
    }
  }, [profile])

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-7">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Volver al dashboard
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Settings size={13} className="text-lttm" />
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Configuración · Ajustes</p>
        </div>
        <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Ajustes</h1>
        <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
          Personaliza tu experiencia y gestiona el acceso a tu cuenta.
        </p>
      </section>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">

        {/* Sidebar */}
        <nav
          aria-label="Secciones de ajustes"
          className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-2 lg:sticky lg:top-4 lg:self-start"
        >
          {/* Personal section */}
          <p className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm px-3 py-2">
            Personal
          </p>
          <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible mb-1">
            {PERSONAL_TABS.map((tab) => {
              const isActive = tab.key === activeTab
              return (
                <li key={tab.key} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] font-sora text-[13px] text-left transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-dim text-brand-cyan font-medium'
                        : 'text-ltt2 hover:bg-ltbg hover:text-ltt'
                    }`}
                  >
                    <span className={isActive ? 'text-brand-cyan' : 'text-lttm'}>{tab.icon}</span>
                    <span className="flex-1">{tab.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Workspace section (admin only) */}
          {isAdmin && (
            <>
              <div className="mx-3 my-1.5 border-t border-ltb" />
              <p className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm px-3 py-2">
                Workspace
              </p>
              <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
                {WORKSPACE_TABS.map((tab) => {
                  const isActive = tab.key === activeTab
                  return (
                    <li key={tab.key} className="shrink-0 lg:w-full">
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] font-sora text-[13px] text-left transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-cyan-dim text-brand-cyan font-medium'
                            : 'text-ltt2 hover:bg-ltbg hover:text-ltt'
                        }`}
                      >
                        <span className={isActive ? 'text-brand-cyan' : 'text-lttm'}>{tab.icon}</span>
                        <span className="flex-1">{tab.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {!prefsLoaded ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={22} className="text-brand-cyan animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'mi-cuenta' && (
                <MiCuentaTab
                  initialPrefs={accountPrefs}
                  onSaved={() => loadUserData()}
                />
              )}

              {activeTab === 'notificaciones' && (
                <NotificacionesTab
                  initialPrefs={notifPrefs}
                  onSaved={() => loadUserData()}
                />
              )}

              {activeTab === 'sesiones' && <SesionesTab />}

              {activeTab === 'auditoria' && isAdmin && (
                <AuditoriaTab orgRetentionMonths={orgRetentionMonths} />
              )}

              {activeTab === 'seguridad' && isAdmin && <SeguridadTab />}
              {activeTab === 'api'       && isAdmin && <ApiKeysTab />}
              {activeTab === 'webhooks'  && isAdmin && <WebhooksTab />}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
