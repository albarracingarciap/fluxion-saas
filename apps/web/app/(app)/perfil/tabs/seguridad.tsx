'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Lock, ShieldCheck, ShieldAlert, MonitorSmartphone,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/authStore'
import { EnableMfaModal } from '@/components/profile/EnableMfaModal'
import { changePasswordAction, signOutOtherSessionsAction } from '../security-actions'
import { SectionHeader, FieldLabel, inputCls } from './shared'

type MfaFactor = { id: string; status: string; friendly_name?: string | null }

function formatLastSignIn(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function SeguridadTab() {
  const { user } = useAuthStore()

  // ── Contraseña ─────────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, startPwSaving] = useTransition()

  // ── MFA ────────────────────────────────────────────────────────────────────
  const [mfaFactor, setMfaFactor] = useState<MfaFactor | null>(null)
  const [mfaLoading, setMfaLoading] = useState(true)
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaConfirmDisable, setMfaConfirmDisable] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaWorking, setMfaWorking] = useState(false)

  // ── Sesiones ───────────────────────────────────────────────────────────────
  const [sessConfirm, setSessConfirm] = useState(false)
  const [sessSuccess, setSessSuccess] = useState(false)
  const [sessError, setSessError] = useState<string | null>(null)
  const [sessSaving, startSessSaving] = useTransition()

  useEffect(() => {
    void loadMfaFactors()
  }, [])

  async function loadMfaFactors() {
    setMfaLoading(true)
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    if (data) {
      const totp = data.totp.find((f) => f.status === 'verified')
      setMfaFactor(
        totp
          ? { id: totp.id, status: totp.status, friendly_name: totp.friendly_name ?? null }
          : null
      )
    }
    setMfaLoading(false)
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)

    if (newPwd.length < 8) {
      setPwError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwError('La nueva contraseña y la confirmación no coinciden.')
      return
    }

    startPwSaving(async () => {
      const result = await changePasswordAction({
        currentPassword: currentPwd,
        newPassword: newPwd,
      })
      if ('error' in result) {
        setPwError(result.error)
        return
      }
      setPwSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setTimeout(() => setPwSuccess(false), 4000)
    })
  }

  async function handleDisableMfa() {
    if (!mfaFactor) return
    setMfaError(null)
    setMfaWorking(true)
    const supabase = createClient()
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactor.id })
    if (error) {
      setMfaError(error.message)
      setMfaWorking(false)
      return
    }
    setMfaConfirmDisable(false)
    setMfaWorking(false)
    await loadMfaFactors()
  }

  function handleSignOutOthers() {
    setSessError(null)
    setSessSuccess(false)
    startSessSaving(async () => {
      const result = await signOutOtherSessionsAction()
      if ('error' in result) {
        setSessError(result.error)
        return
      }
      setSessConfirm(false)
      setSessSuccess(true)
      setTimeout(() => setSessSuccess(false), 4000)
    })
  }

  return (
    <div>
      <SectionHeader
        icon={<Lock size={16} className="text-ltt2" />}
        title="Seguridad"
        description="Contraseña, autenticación de dos factores y sesiones activas."
      />

      {/* ─── Contraseña ─────────────────────────────────────────────── */}
      <SecurityCard
        icon={<KeyRound size={14} className="text-lttm" />}
        title="Contraseña"
        description="Usa una contraseña única y robusta. Mínimo 8 caracteres."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <FieldLabel>Contraseña actual</FieldLabel>
            <PasswordInput
              value={currentPwd}
              onChange={setCurrentPwd}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
              placeholder="Tu contraseña actual"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Nueva contraseña</FieldLabel>
              <PasswordInput
                value={newPwd}
                onChange={setNewPwd}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div>
              <FieldLabel>Confirmar nueva contraseña</FieldLabel>
              <PasswordInput
                value={confirmPwd}
                onChange={setConfirmPwd}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                placeholder="Repítela"
                autoComplete="new-password"
              />
            </div>
          </div>

          {pwError && (
            <div className="flex items-start gap-2 bg-red-dim border border-reb text-re font-sora text-[12px] rounded-[8px] px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          {pwSuccess && (
            <div className="flex items-start gap-2 bg-grdim border border-grb text-gr font-sora text-[12px] rounded-[8px] px-3 py-2">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>Contraseña actualizada correctamente.</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving || !currentPwd || !newPwd || !confirmPwd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium hover:-translate-y-[1px] transition-all shadow-[0_2px_10px_rgba(0,173,239,0.18)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {pwSaving ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </SecurityCard>

      {/* ─── MFA ────────────────────────────────────────────────────── */}
      <SecurityCard
        icon={<ShieldCheck size={14} className="text-lttm" />}
        title="Autenticación de dos factores"
        description="Añade una capa extra de seguridad mediante una app autenticadora (TOTP)."
      >
        {mfaLoading ? (
          <div className="flex items-center gap-2 text-lttm font-sora text-[12px]">
            <Loader2 size={13} className="animate-spin" />
            Cargando estado…
          </div>
        ) : mfaFactor ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-[10px] border border-grb bg-grdim px-4 py-3">
              <ShieldCheck size={15} className="text-gr shrink-0" />
              <div className="flex-1">
                <p className="font-sora text-[13px] font-semibold text-gr">2FA activado</p>
                <p className="font-sora text-[11.5px] text-gr opacity-80">
                  Se requerirá un código TOTP en cada inicio de sesión.
                </p>
              </div>
            </div>

            {mfaError && (
              <div className="flex items-start gap-2 bg-red-dim border border-reb text-re font-sora text-[12px] rounded-[8px] px-3 py-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {mfaConfirmDisable ? (
              <div className="flex items-center gap-3 rounded-[10px] border border-orb bg-ordim px-4 py-3 flex-wrap">
                <ShieldAlert size={14} className="text-or shrink-0" />
                <p className="flex-1 font-sora text-[12px] text-or min-w-[200px]">
                  ¿Seguro que quieres desactivar 2FA? Tu cuenta quedará menos protegida.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMfaConfirmDisable(false)}
                    disabled={mfaWorking}
                    className="px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt2 font-sora text-[12px] hover:border-ltbl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableMfa}
                    disabled={mfaWorking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-reb bg-red-dim text-re font-sora text-[12px] font-medium hover:bg-re hover:text-white transition-colors disabled:opacity-50"
                  >
                    {mfaWorking ? <Loader2 size={12} className="animate-spin" /> : null}
                    Sí, desactivar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMfaConfirmDisable(true)}
                className="px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt2 font-sora text-[12.5px] hover:border-reb hover:text-re transition-colors"
              >
                Desactivar 2FA
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-[10px] border border-ltb bg-ltbg px-4 py-3">
              <ShieldAlert size={15} className="text-lttm shrink-0" />
              <div className="flex-1">
                <p className="font-sora text-[13px] font-semibold text-ltt">2FA desactivado</p>
                <p className="font-sora text-[11.5px] text-lttm">
                  Recomendado para roles con acceso a datos sensibles.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMfaModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium hover:-translate-y-[1px] transition-all shadow-[0_2px_10px_rgba(0,173,239,0.18)]"
            >
              <ShieldCheck size={13} />
              Activar 2FA
            </button>
          </div>
        )}
      </SecurityCard>

      {/* ─── Sesiones ──────────────────────────────────────────────── */}
      <SecurityCard
        icon={<MonitorSmartphone size={14} className="text-lttm" />}
        title="Sesiones activas"
        description="Cierra el acceso desde dispositivos donde ya no quieras estar conectado."
        last
      >
        <div className="space-y-3">
          <div className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">
              Sesión actual
            </p>
            <p className="font-sora text-[13px] text-ltt">{user?.email ?? '—'}</p>
            <p className="font-sora text-[11.5px] text-lttm mt-0.5">
              Último acceso: {formatLastSignIn(user?.last_sign_in_at)}
            </p>
          </div>

          {sessError && (
            <div className="flex items-start gap-2 bg-red-dim border border-reb text-re font-sora text-[12px] rounded-[8px] px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{sessError}</span>
            </div>
          )}
          {sessSuccess && (
            <div className="flex items-start gap-2 bg-grdim border border-grb text-gr font-sora text-[12px] rounded-[8px] px-3 py-2">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span>Las sesiones en otros dispositivos se han cerrado.</span>
            </div>
          )}

          {sessConfirm ? (
            <div className="flex items-center gap-3 rounded-[10px] border border-orb bg-ordim px-4 py-3 flex-wrap">
              <AlertCircle size={14} className="text-or shrink-0" />
              <p className="flex-1 font-sora text-[12px] text-or min-w-[200px]">
                Vas a cerrar la sesión en cualquier otro dispositivo donde tengas iniciada esta cuenta.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSessConfirm(false)}
                  disabled={sessSaving}
                  className="px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt2 font-sora text-[12px] hover:border-ltbl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSignOutOthers}
                  disabled={sessSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-reb bg-red-dim text-re font-sora text-[12px] font-medium hover:bg-re hover:text-white transition-colors disabled:opacity-50"
                >
                  {sessSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                  Sí, cerrar las demás
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSessConfirm(true)}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt2 font-sora text-[12.5px] hover:border-reb hover:text-re transition-colors"
            >
              Cerrar sesión en otros dispositivos
            </button>
          )}
        </div>
      </SecurityCard>

      {mfaModalOpen && (
        <EnableMfaModal
          onClose={() => setMfaModalOpen(false)}
          onSuccess={() => {
            setMfaModalOpen(false)
            void loadMfaFactors()
          }}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes locales ──────────────────────────────────────────────────

function SecurityCard({
  icon,
  title,
  description,
  children,
  last = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={`rounded-[10px] border border-ltb bg-ltcard2 px-5 py-5 ${last ? '' : 'mb-4'}`}>
      <div className="flex items-start gap-2.5 mb-4">
        <div className="w-[28px] h-[28px] rounded-[7px] bg-ltcard border border-ltb flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sora text-[13.5px] font-semibold text-ltt">{title}</p>
          <p className="font-sora text-[12px] text-lttm mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  placeholder: string
  autoComplete: string
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls + ' pr-10'}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-lttm hover:text-ltt transition-colors"
        title={show ? 'Ocultar' : 'Mostrar'}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}
