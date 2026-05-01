'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { updateProfile } from './actions'
import {
  Save, Loader2, AlertCircle, CheckCircle2, ChevronRight,
  User, ShieldCheck, Lock, SlidersHorizontal, Bell, Palette, UserCircle,
} from 'lucide-react'

import type { ProfileFormData } from './tabs/shared'
import { getDefaultNotificationPrefs, type NotificationPrefs } from '@/lib/notifications/preferences'
import { InformacionPersonalTab } from './tabs/informacion-personal'
import { CuentaTab } from './tabs/cuenta'
import { SeguridadTab } from './tabs/seguridad'
import { PreferenciasTab } from './tabs/preferencias'
import { NotificacionesTab } from './tabs/notificaciones'
import { AparienciaTab } from './tabs/apariencia'

// ─── Configuración de tabs ───────────────────────────────────────────────────

type TabKey =
  | 'informacion-personal'
  | 'cuenta'
  | 'seguridad'
  | 'preferencias'
  | 'notificaciones'
  | 'apariencia'

const TABS: Array<{
  key: TabKey
  label: string
  icon: React.ReactNode
  editable: boolean
}> = [
  { key: 'informacion-personal', label: 'Información personal', icon: <User size={14} />, editable: true },
  { key: 'cuenta',               label: 'Cuenta',               icon: <ShieldCheck size={14} />, editable: false },
  { key: 'seguridad',            label: 'Seguridad',            icon: <Lock size={14} />, editable: false },
  { key: 'preferencias',         label: 'Preferencias',         icon: <SlidersHorizontal size={14} />, editable: true },
  { key: 'notificaciones',       label: 'Notificaciones',       icon: <Bell size={14} />, editable: true },
  { key: 'apariencia',           label: 'Apariencia',           icon: <Palette size={14} />, editable: false },
]

// ─── Página ──────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { user, profile, role, organization, loadUserData } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TabKey>('informacion-personal')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name:           '',
    last_name:            '',
    avatar_url:           '',
    job_title:            '',
    department:           '',
    role:                 '',
    timezone:             'Europe/Madrid',
    notifications_email:  true,
    notification_prefs:   getDefaultNotificationPrefs(),
  })

  useEffect(() => {
    if (profile) {
      const prefs = (profile.preferences ?? {}) as Record<string, unknown>
      const storedNotifPrefs = (prefs.notification_prefs as NotificationPrefs | undefined) ?? null
      setFormData({
        first_name:           profile.first_name ?? '',
        last_name:            profile.last_name ?? '',
        avatar_url:           profile.avatar_url ?? '',
        job_title:            typeof prefs.job_title === 'string' ? prefs.job_title : '',
        department:           typeof prefs.department === 'string' ? prefs.department : '',
        role:                 role ?? '',
        timezone:             typeof prefs.timezone === 'string' ? prefs.timezone : 'Europe/Madrid',
        notifications_email:  typeof prefs.notifications_email === 'boolean' ? prefs.notifications_email : true,
        notification_prefs:   storedNotifPrefs ?? getDefaultNotificationPrefs(),
      })
    }
  }, [profile, role])

  async function handleSave() {
    if (!user) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateProfile({
        first_name: formData.first_name,
        last_name:  formData.last_name,
        avatar_url: formData.avatar_url,
        role:       formData.role,
        preferences: {
          job_title:           formData.job_title,
          department:          formData.department,
          timezone:            formData.timezone,
          notifications_email: formData.notifications_email,
          notification_prefs:  formData.notification_prefs,
        },
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        await loadUserData()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
      </div>
    )
  }

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] font-plex text-lttm uppercase tracking-wider mb-4">
        <UserCircle size={13} className="text-lttm" />
        <span>Configuración</span>
        <ChevronRight size={11} className="text-lttm" />
        <span className="text-ltt">Mi Perfil</span>
      </div>

      <div className="mb-7">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
          Mi Perfil
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
          Gestiona tu información personal, foto y preferencias en la plataforma.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 bg-red-dim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-grdim border border-grb text-gr text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Perfil actualizado correctamente.</span>
        </div>
      )}

      {/* Layout: sidebar + contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar de tabs */}
        <nav
          aria-label="Secciones de perfil"
          className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-2 lg:sticky lg:top-4 lg:self-start"
        >
          <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {TABS.map((tab) => {
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
                    <span className={isActive ? 'text-brand-cyan' : 'text-lttm'}>
                      {tab.icon}
                    </span>
                    <span className="flex-1">{tab.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Contenido del tab activo */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          {activeTab === 'informacion-personal' && (
            <InformacionPersonalTab
              formData={formData}
              setFormData={setFormData}
              userEmail={user.email}
              currentRole={role}
            />
          )}

          {activeTab === 'cuenta' && (
            <CuentaTab
              userEmail={user.email}
              memberSince={profile.created_at}
              organizationName={organization?.name}
            />
          )}

          {activeTab === 'seguridad' && <SeguridadTab />}

          {activeTab === 'preferencias' && (
            <PreferenciasTab formData={formData} setFormData={setFormData} />
          )}

          {activeTab === 'notificaciones' && (
            <NotificacionesTab formData={formData} setFormData={setFormData} />
          )}

          {activeTab === 'apariencia' && <AparienciaTab />}

          {/* Botón de guardar (solo en tabs editables) */}
          {activeTabConfig.editable && (
            <div className="mt-7 pt-5 border-t border-ltb flex items-center justify-between gap-3">
              <p className="text-[12px] text-lttm font-sora">
                Los cambios se reflejan en toda la plataforma al guardar.
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[9px] font-sora text-[13px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
