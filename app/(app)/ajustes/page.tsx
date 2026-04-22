'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'
import { updateAppSettings } from './actions'
import {
  Save, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
  Bell, Plug, Palette, ShieldAlert, Copy, Check, Eye, EyeOff,
  Download, Trash2,
} from 'lucide-react'
import Link from 'next/link'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-[9px] border transition-all text-left ${
        enabled ? 'border-brand-cyan bg-[var(--cyan-dim2)]' : 'border-ltb bg-ltcard2 hover:border-ltbl'
      }`}
    >
      <div className={`w-[36px] h-[20px] rounded-full relative shrink-0 transition-colors ${enabled ? 'bg-brand-cyan' : 'bg-ltbl'}`}>
        <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
      </div>
      <div>
        <div className={`font-sora text-[13px] font-medium ${enabled ? 'text-brand-navy' : 'text-ltt'}`}>{label}</div>
        {description && <div className="font-sora text-[11.5px] text-lttm mt-0.5">{description}</div>}
      </div>
    </button>
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

export default function AjustesPage() {
  const { user, profile, role, organization, loadUserData } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isAdmin = role === 'admin'

  const [form, setForm] = useState({
    notifications_email: true,
    notifications_inapp: true,
    digest_frequency:    'weekly',
    ui_language:         'es',
    ui_density:          'normal',
    webhook_url:         '',
  })

  useEffect(() => {
    if (profile) {
      const p = (profile.preferences ?? {}) as Record<string, unknown>
      setForm((prev) => ({
        ...prev,
        notifications_email: typeof p.notifications_email === 'boolean' ? p.notifications_email : true,
        notifications_inapp: typeof p.notifications_inapp === 'boolean' ? p.notifications_inapp : true,
        digest_frequency:    typeof p.digest_frequency === 'string' ? p.digest_frequency : 'weekly',
        ui_language:         typeof p.ui_language === 'string' ? p.ui_language : 'es',
        ui_density:          typeof p.ui_density === 'string' ? p.ui_density : 'normal',
      }))
    }
  }, [profile])

  useEffect(() => {
    if (organization) {
      const s = (organization.settings ?? {}) as Record<string, unknown>
      setForm((prev) => ({
        ...prev,
        webhook_url: typeof s.webhook_url === 'string' ? s.webhook_url : '',
      }))
    }
  }, [organization])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await updateAppSettings(form)
      if (result.error) { setError(result.error) }
      else {
        setSuccess(true)
        await loadUserData()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch { setError('Ocurrió un error inesperado.') }
    finally { setLoading(false) }
  }

  function copyKey() {
    if (!organization?.id) return
    navigator.clipboard.writeText(organization.id)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  if (!user || !profile) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-brand-cyan animate-spin" /></div>
  }

  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-[12px] font-plex text-lttm uppercase tracking-wider">
        <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
          <ArrowLeft size={14} className="text-lttm" />
          <span>Configuración</span>
        </Link>
        <span>/</span>
        <span className="text-ltt font-medium">Ajustes</span>
      </div>

      <div className="mb-7">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">Ajustes</h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
          Configura las preferencias de la aplicación, integraciones y opciones de privacidad.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-redim border border-reb text-re text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-grdim border border-grb text-gr text-[12px] font-sora p-3.5 rounded-[8px] mb-5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>Ajustes guardados correctamente.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── 1. Notificaciones ─────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Bell size={16} className="text-ltt2" />}
            title="Notificaciones"
            description="Canales y frecuencia de los avisos de la plataforma."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex flex-col gap-3">
              <FieldLabel>Canales activos</FieldLabel>
              <Toggle
                enabled={form.notifications_email}
                onChange={(v) => setForm({ ...form, notifications_email: v })}
                label="Notificaciones por email"
                description="Alertas de plazos, evidencias y eventos del SGAI"
              />
              <Toggle
                enabled={form.notifications_inapp}
                onChange={(v) => setForm({ ...form, notifications_inapp: v })}
                label="Notificaciones en la app"
                description="Avisos en tiempo real dentro de la plataforma"
              />
            </div>
            <div>
              <FieldLabel>Resumen periódico</FieldLabel>
              <div className="relative">
                <select
                  value={form.digest_frequency}
                  onChange={(e) => setForm({ ...form, digest_frequency: e.target.value })}
                  className={selectCls}
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="never">Nunca</option>
                </select>
                <SelectArrow />
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Frecuencia del resumen consolidado de actividad enviado por email.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Integraciones ──────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Plug size={16} className="text-ltt2" />}
            title="Integraciones"
            description="API Key de la organización y configuración de webhooks."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

            <div>
              <FieldLabel>API Key de la organización</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    readOnly
                    value={organization?.id ?? ''}
                    className={inputCls + ' pr-10 font-plex text-[12px]'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lttm hover:text-ltt2 transition-colors"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={copyKey}
                  title="Copiar"
                  className="flex-shrink-0 w-[38px] h-[38px] rounded-[8px] border border-ltb bg-ltcard2 flex items-center justify-center text-lttm hover:text-ltt hover:border-ltbl transition-colors"
                >
                  {copiedKey ? <Check size={14} className="text-gr" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Identificador único de tu organización para llamadas a la API de Fluxion.
              </p>
            </div>

            <div>
              <FieldLabel>Webhook URL</FieldLabel>
              <input
                type="url"
                disabled={!isAdmin}
                value={form.webhook_url}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                className={inputCls}
                placeholder="https://tu-sistema.com/webhook"
              />
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Fluxion enviará eventos a esta URL. Solo administradores pueden modificarla.
              </p>
            </div>

          </div>
        </div>

        {/* ── 3. Apariencia ─────────────────────────────────── */}
        <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <SectionHeader
            icon={<Palette size={16} className="text-ltt2" />}
            title="Apariencia"
            description="Idioma de la interfaz y densidad de visualización."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

            <div>
              <FieldLabel>Idioma de la interfaz</FieldLabel>
              <div className="relative">
                <select
                  value={form.ui_language}
                  onChange={(e) => setForm({ ...form, ui_language: e.target.value })}
                  className={selectCls}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
                <SelectArrow />
              </div>
            </div>

            <div>
              <FieldLabel>Densidad de la UI</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'normal',   label: 'Normal',   desc: 'Espaciado estándar' },
                  { value: 'compact',  label: 'Compacta', desc: 'Mayor densidad de info' },
                ].map((opt) => {
                  const selected = form.ui_density === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, ui_density: opt.value })}
                      className={`rounded-[9px] border px-4 py-3 text-left transition-all ${
                        selected
                          ? 'border-brand-cyan bg-[var(--cyan-dim2)] shadow-[0_0_0_2px_#00adef14]'
                          : 'border-ltb bg-ltcard2 hover:border-ltbl hover:bg-ltbg'
                      }`}
                    >
                      <span className={`font-sora text-[13px] font-medium block ${selected ? 'text-brand-navy' : 'text-ltt'}`}>
                        {opt.label}
                      </span>
                      <span className="font-sora text-[11.5px] text-lttm mt-0.5 block">{opt.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer guardar */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[12px] text-lttm font-sora">Los cambios se aplican en toda la plataforma al guardar.</p>
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

      {/* ── 4. Datos y privacidad (fuera del form — acciones destructivas) ── */}
      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7 mt-5">
        <SectionHeader
          icon={<ShieldAlert size={16} className="text-ltt2" />}
          title="Datos y privacidad"
          description="Exportación de datos y gestión de la cuenta. Las acciones de esta sección son irreversibles."
        />

        <div className="flex flex-col gap-4">

          {/* Exportar */}
          <div className="flex items-center justify-between py-3 px-4 rounded-[9px] border border-ltb bg-ltcard2">
            <div>
              <div className="font-sora text-[13px] font-medium text-ltt">Exportar datos de la organización</div>
              <div className="font-sora text-[12px] text-lttm mt-0.5">
                Genera un archivo ZIP con todos los sistemas, evaluaciones, gaps y evidencias.
              </div>
            </div>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[12.5px] text-lttm cursor-not-allowed opacity-60 shrink-0 ml-4"
            >
              <Download size={14} />
              Exportar
              <span className="font-plex text-[9.5px] bg-ltb px-1.5 py-0.5 rounded-[4px]">Próximamente</span>
            </button>
          </div>

          {/* Zona de peligro */}
          {isAdmin && (
            <div className="rounded-[9px] border border-reb bg-redim p-4">
              <div className="font-sora text-[13px] font-semibold text-re mb-1">Zona de peligro</div>
              <p className="font-sora text-[12px] text-re/80 mb-4">
                Eliminar la organización borrará permanentemente todos los datos, sistemas, evaluaciones y usuarios asociados. Esta acción no se puede deshacer.
              </p>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-[8px] border border-reb bg-ltcard font-sora text-[12.5px] text-re hover:bg-redim transition-colors"
                >
                  <Trash2 size={14} />
                  Eliminar organización
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="font-sora text-[12px] text-re font-medium">¿Estás seguro? Esta acción es irreversible.</p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3.5 py-1.5 rounded-[7px] border border-reb font-sora text-[12px] text-re bg-ltcard hover:bg-redim transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] bg-re text-white font-sora text-[12px] opacity-50 cursor-not-allowed"
                  >
                    <Trash2 size={12} />
                    Confirmar eliminación
                    <span className="font-plex text-[9px] bg-white/20 px-1.5 py-0.5 rounded-[3px]">Próximamente</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
