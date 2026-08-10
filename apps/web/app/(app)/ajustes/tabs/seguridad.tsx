'use client';

import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import { SectionHeader, FieldLabel, Toggle, SaveBar, selectCls, SelectArrow } from './shared';
import { getSecuritySettings, updateSecuritySettings, type SecuritySettings } from '../actions';

const DEFAULT: SecuritySettings = {
  mfa_required:            false,
  allowed_email_domains:   [],
  session_timeout_minutes: null,
}

const TIMEOUT_OPTIONS = [
  { value: null,  label: 'Sin límite' },
  { value: 30,    label: '30 minutos' },
  { value: 60,    label: '1 hora' },
  { value: 240,   label: '4 horas' },
  { value: 480,   label: '8 horas' },
  { value: 1440,  label: '24 horas' },
]

export function SeguridadTab() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')

  useEffect(() => {
    void getSecuritySettings().then((res) => {
      if (!('error' in res)) setSettings(res)
      setLoading(false)
    })
  }, [])

  function set<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function addDomain() {
    const d = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!d || !d.includes('.')) return
    if (settings.allowed_email_domains.includes(d)) return
    set('allowed_email_domains', [...settings.allowed_email_domains, d])
    setNewDomain('')
  }

  function removeDomain(d: string) {
    set('allowed_email_domains', settings.allowed_email_domains.filter((x) => x !== d))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await updateSecuritySettings(settings)
    if (res.error) { setError(res.error) }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="bg-ltcard rounded-[12px] border border-ltb p-7 flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
      <SectionHeader
        icon={<Shield size={16} className="text-ltt2" />}
        title="Seguridad del workspace"
        description="Políticas de acceso que aplican a todos los miembros de la organización."
      />

      <div className="flex flex-col gap-7">

        {/* MFA */}
        <div>
          <FieldLabel>Autenticación multifactor (MFA)</FieldLabel>
          <Toggle
            enabled={settings.mfa_required}
            onChange={(v) => set('mfa_required', v)}
            label="Exigir MFA a todos los miembros"
            description="Los miembros sin MFA configurado verán un aviso al iniciar sesión. No bloquea el acceso aún."
          />
          <p className="font-sora text-[11.5px] text-lttm mt-2">
            Recomendado para cumplir ISO 42001 A.6.2.2 (control de acceso a sistemas de IA críticos).
          </p>
        </div>

        {/* Allowed email domains */}
        <div>
          <FieldLabel>Dominios permitidos para invitaciones</FieldLabel>
          <p className="font-sora text-[12px] text-lttm mb-3">
            Si defines dominios, solo se podrán enviar invitaciones a emails de esos dominios. Déjalo vacío para permitir cualquier dominio.
          </p>
          {/* Existing domains */}
          {settings.allowed_email_domains.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {settings.allowed_email_domains.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ltbg border border-ltb rounded-[6px] font-plex text-[12px] text-ltt"
                >
                  @{d}
                  <button
                    type="button"
                    onClick={() => removeDomain(d)}
                    className="text-lttm hover:text-re transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Add domain */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-ltb rounded-[8px] bg-ltcard overflow-hidden focus-within:border-brand-cyan focus-within:ring-[3px] focus-within:ring-brand-cyan/10 transition-all">
              <span className="px-3 font-sora text-[13px] text-lttm select-none">@</span>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain() } }}
                placeholder="empresa.com"
                className="flex-1 bg-transparent py-2.5 pr-3 text-[13.5px] text-ltt font-sora outline-none"
              />
            </div>
            <button
              type="button"
              onClick={addDomain}
              className="px-3.5 py-2.5 border border-ltb rounded-[8px] font-sora text-[12.5px] text-ltt2 hover:bg-ltbg hover:border-ltbl transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Session timeout */}
        <div>
          <FieldLabel>Tiempo máximo de sesión inactiva</FieldLabel>
          <div className="relative w-64">
            <select
              value={settings.session_timeout_minutes ?? 'null'}
              onChange={(e) => set('session_timeout_minutes', e.target.value === 'null' ? null : Number(e.target.value))}
              className={selectCls}
            >
              {TIMEOUT_OPTIONS.map((opt) => (
                <option key={String(opt.value)} value={opt.value ?? 'null'}>
                  {opt.label}
                </option>
              ))}
            </select>
            <SelectArrow />
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1.5">
            Las sesiones inactivas durante este período requerirán inicio de sesión nuevo.
          </p>
        </div>

      </div>

      <SaveBar loading={saving} saved={saved} error={error} onSave={handleSave}
        hint="Estos ajustes aplican a todos los miembros del workspace." />
    </div>
  )
}
