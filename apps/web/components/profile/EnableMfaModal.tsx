'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, X, Loader2, Copy, CheckCircle2, Smartphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type EnrollData = {
  factorId: string
  secret: string
  qrCode: string
}

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function EnableMfaModal({ onClose, onSuccess }: Props) {
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)

  // Para evitar doble enrollment en strict mode (React 18 dev)
  const enrolledRef = useRef(false)

  useEffect(() => {
    if (enrolledRef.current) return
    enrolledRef.current = true

    void (async () => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

      if (error || !data) {
        setError(error?.message ?? 'No se pudo iniciar la activación.')
        setLoading(false)
        return
      }

      setEnrollData({
        factorId: data.id,
        secret: data.totp.secret,
        qrCode: data.totp.qr_code,
      })
      setLoading(false)
    })()
  }, [])

  async function handleVerify() {
    if (!enrollData || code.length !== 6) return

    setError(null)
    setVerifying(true)

    const supabase = createClient()

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId: enrollData.factorId,
    })

    if (challengeErr || !challenge) {
      setError(challengeErr?.message ?? 'Error al generar el desafío.')
      setVerifying(false)
      return
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: challenge.id,
      code,
    })

    if (verifyErr) {
      setError('Código incorrecto. Comprueba que el reloj de tu dispositivo está sincronizado.')
      setVerifying(false)
      return
    }

    onSuccess()
  }

  async function handleClose() {
    // Limpiar factor sin verificar al cerrar (evita factores fantasma)
    if (enrollData) {
      const supabase = createClient()
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId })
    }
    onClose()
  }

  async function copySecret() {
    if (!enrollData) return
    try {
      await navigator.clipboard.writeText(enrollData.secret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    } catch {
      // Ignorar fallo de clipboard
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={() => !verifying && handleClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[480px] max-h-[92vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-brand-cyan" />
              <p className="font-sora text-[14px] font-semibold text-ltt">
                Activar autenticación de dos factores
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={verifying}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-5 flex-1">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-brand-cyan animate-spin" />
              </div>
            )}

            {!loading && enrollData && (
              <>
                {/* Paso 1: QR */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full px-2 py-0.5">
                        Paso 1
                      </span>
                      <p className="font-sora text-[13px] font-semibold text-ltt">Escanea el código QR</p>
                    </div>
                    <p className="font-sora text-[12px] text-lttm">
                      Usa Google Authenticator, Authy, 1Password o cualquier app TOTP.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className="bg-white p-3 rounded-[10px] border border-ltb [&_svg]:w-[180px] [&_svg]:h-[180px]"
                      dangerouslySetInnerHTML={{ __html: enrollData.qrCode }}
                    />
                  </div>

                  <div>
                    <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5 flex items-center gap-1.5">
                      <Smartphone size={11} />
                      O introduce este código manualmente
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-ltbg border border-ltb rounded-[8px] px-3 py-2 font-mono text-[12px] text-ltt break-all select-all">
                        {enrollData.secret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard text-lttm hover:border-brand-cyan hover:text-brand-cyan transition-colors shrink-0"
                        title="Copiar secret"
                      >
                        {secretCopied ? <CheckCircle2 size={13} className="text-gr" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Paso 2: Verificación */}
                <div className="mt-6 pt-5 border-t border-ltb space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full px-2 py-0.5">
                        Paso 2
                      </span>
                      <p className="font-sora text-[13px] font-semibold text-ltt">Introduce el código generado</p>
                    </div>
                    <p className="font-sora text-[12px] text-lttm">
                      Una vez configurada la app, introduce el código de 6 dígitos que muestra.
                    </p>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-ltbg border border-ltb rounded-[8px] px-3 py-3 font-mono text-[20px] text-center tracking-[10px] text-ltt outline-none focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 transition-all"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="mt-4 font-sora text-[12px] text-re bg-red-dim border border-reb rounded-[8px] px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={verifying}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || loading || code.length !== 6 || !enrollData}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
            >
              {verifying ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              Verificar y activar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
