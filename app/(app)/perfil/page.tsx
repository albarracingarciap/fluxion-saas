'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { updateProfile } from './actions'
import { Save, Loader2, AlertCircle, CheckCircle2, ArrowLeft, User, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { AvatarUpload } from '@/components/profile/AvatarUpload'

// ─── Timezones UE más comunes ────────────────────────────────────────────────
const TIMEZONES = [
  { value: 'Europe/Madrid',    label: 'Madrid (CET/CEST)' },
  { value: 'Europe/London',    label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris',     label: 'París (CET/CEST)' },
  { value: 'Europe/Berlin',    label: 'Berlín (CET/CEST)' },
  { value: 'Europe/Rome',      label: 'Roma (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Ámsterdam (CET/CEST)' },
  { value: 'Europe/Brussels',  label: 'Bruselas (CET/CEST)' },
  { value: 'Europe/Lisbon',    label: 'Lisboa (WET/WEST)' },
  { value: 'Europe/Warsaw',    label: 'Varsovia (CET/CEST)' },
  { value: 'Europe/Stockholm', label: 'Estocolmo (CET/CEST)' },
  { value: 'Europe/Vienna',    label: 'Viena (CET/CEST)' },
  { value: 'Europe/Athens',    label: 'Atenas (EET/EEST)' },
  { value: 'UTC',              label: 'UTC' },
]

const ROLE_LABELS: Record<string, string> = {
  org_admin:          'Administrador',
  sgai_manager:       'SGAI Manager',
  caio:               'CAIO',
  dpo:                'DPO',
  system_owner:       'System Owner',
  risk_analyst:       'Analista de Riesgos',
  compliance_analyst: 'Analista de Cumplimiento',
  executive:          'Directivo',
  auditor:            'Auditor',
  viewer:             'Lector',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(first?: string | null, last?: string | null, email?: string | null) {
  const f = first?.[0] ?? ''
  const l = last?.[0] ?? ''
  if (f || l) return (f + l).toUpperCase()
  return (email?.[0] ?? '?').toUpperCase()
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-plex uppercase tracking-[0.7px] text-ltt2 mb-1.5">
      {children}
    </label>
  )
}

const inputCls = "w-full bg-ltcard border border-ltb rounded-[8px] px-3 py-2.5 text-[13.5px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 disabled:opacity-50 disabled:bg-ltcard2"
const selectCls = inputCls + " appearance-none pr-8 cursor-pointer"

function SelectArrow() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lttm opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { user, profile, role, organization, loadUserData } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name:           '',
    last_name:            '',
    avatar_url:           '',
    job_title:            '',
    department:           '',
    role:                 '',
    timezone:             'Europe/Madrid',
    notifications_email:  true,
  })

  useEffect(() => {
    if (profile) {
      const prefs = (profile.preferences ?? {}) as Record<string, unknown>
      setFormData({
        first_name:           profile.first_name ?? '',
        last_name:            profile.last_name ?? '',
        avatar_url:           profile.avatar_url ?? '',
        job_title:            typeof prefs.job_title === 'string' ? prefs.job_title : '',
        department:           typeof prefs.department === 'string' ? prefs.department : '',
        role:                 role ?? '',
        timezone:             typeof prefs.timezone === 'string' ? prefs.timezone : 'Europe/Madrid',
        notifications_email:  typeof prefs.notifications_email === 'boolean' ? prefs.notifications_email : true,
      })
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

  const initials = getInitials(formData.first_name, formData.last_name, user.email)
  const memberSince = profile.created_at ?? null

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-[12px] font-plex text-lttm uppercase tracking-wider">
        <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
          <ArrowLeft size={14} className="text-lttm" />
          <span>Configuración</span>
        </Link>
        <span>/</span>
        <span className="text-ltt font-medium">Mi Perfil</span>
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
        <div className="flex items-start gap-2 bg-redim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── 1. Identidad ──────────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<User size={16} className="text-ltt2" />}
            title="Identidad"
            description="Tu nombre, foto y cargo que aparecerán en la plataforma e informes."
          />

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar centrado */}
            <div className="flex-shrink-0 flex justify-center md:justify-start w-full md:w-auto">
              <AvatarUpload
                currentUrl={formData.avatar_url}
                initials={initials}
                onUploaded={(url) => setFormData({ ...formData, avatar_url: url })}
              />
            </div>

            {/* Campos */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <div>
                <FieldLabel>Nombre</FieldLabel>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className={inputCls}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <FieldLabel>Apellidos</FieldLabel>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className={inputCls}
                  placeholder="Tus apellidos"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>Rol Fluxion</FieldLabel>
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={selectCls}
                    disabled={role !== 'admin'}
                  >
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <SelectArrow />
                </div>
                <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                  {role === 'admin' 
                    ? "Como administrador, puedes gestionar el rol asignado." 
                    : "Este campo solo puede ser modificado por un administrador de Fluxion."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Cuenta ─────────────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<ShieldCheck size={16} className="text-ltt2" />}
            title="Cuenta"
            description="Información corporativa y de acceso a la plataforma."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
            <div>
              <FieldLabel>Cargo / Puesto en la Organización</FieldLabel>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className={inputCls}
                placeholder="Ej. Director de Riesgos"
              />
            </div>
            <div>
              <FieldLabel>Departamento</FieldLabel>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={inputCls}
                placeholder="Ej. Compliance / IT"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Email</div>
              <div className="font-sora text-[13px] text-ltt truncate">{user.email ?? '—'}</div>
            </div>
            <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Miembro desde</div>
              <div className="font-sora text-[13px] text-ltt2">{formatDate(memberSince)}</div>
            </div>
          </div>
          {organization && (
            <div className="mt-3 rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3 flex items-center gap-3">
              <div className="w-[32px] h-[32px] rounded-[7px] bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-white font-sora text-[12px] font-bold shrink-0">
                {organization.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Organización</div>
                <div className="font-sora text-[13px] text-ltt font-medium">{organization.name}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Preferencias ───────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<SlidersHorizontal size={16} className="text-ltt2" />}
            title="Preferencias"
            description="Zona horaria y opciones de notificación."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

            <div>
              <FieldLabel>Zona horaria</FieldLabel>
              <div className="relative">
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className={selectCls}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Afecta a la visualización de fechas y plazos.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <FieldLabel>Notificaciones</FieldLabel>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, notifications_email: !formData.notifications_email })}
                className={`flex items-center gap-3 w-fit px-4 py-2.5 rounded-[9px] border transition-all ${
                  formData.notifications_email
                    ? 'border-brand-cyan bg-[var(--cyan-dim2)]'
                    : 'border-ltb bg-ltcard2 hover:border-ltbl'
                }`}
              >
                {/* Toggle visual */}
                <div className={`w-[36px] h-[20px] rounded-full transition-colors relative ${
                  formData.notifications_email ? 'bg-brand-cyan' : 'bg-ltbl'
                }`}>
                  <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                    formData.notifications_email ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`} />
                </div>
                <span className="font-sora text-[13px] text-ltt">
                  Recibir alertas por email
                </span>
              </button>
              <p className="font-sora text-[11.5px] text-lttm mt-2">
                Plazos próximos, evidencias por caducar y eventos del SGAI.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-lttm font-sora">
            Los cambios se reflejan en toda la plataforma al guardar.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[9px] font-sora text-[13px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] shadow-[0_2px_12px_rgba(0,173,239,0.18)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </form>
    </div>
  )
}
