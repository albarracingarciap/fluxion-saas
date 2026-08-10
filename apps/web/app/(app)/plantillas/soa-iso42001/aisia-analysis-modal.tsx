'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Sparkles, Loader2, CheckCircle2, XCircle, AlertCircle,
  ArrowRight, Brain,
} from 'lucide-react'
import { analyzeSoAFromAisia, applySoASuggestions } from './actions'
import type { SoAControlRecord } from '@/lib/templates/data'

type Suggestion = {
  control_code: string
  applicable: boolean
  reason: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  controls: SoAControlRecord[]
}

type Phase = 'idle' | 'loading' | 'ready' | 'applying'

export function AisiaAnalysisModal({ isOpen, onClose, controls }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [systemCount, setSystemCount] = useState(0)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setPhase('idle')
      setError(null)
      setApplyError(null)
      setSuggestions([])
    }, 300)
  }

  const handleAnalyze = () => {
    setError(null)
    setPhase('loading')
    startTransition(async () => {
      const res = await analyzeSoAFromAisia()
      if ('error' in res && res.error) {
        setError(res.error)
        setPhase('idle')
        return
      }
      setSuggestions(res.suggestions ?? [])
      setSystemCount(res.systemCount ?? 0)
      setPhase('ready')
    })
  }

  const toggleSuggestion = (code: string) => {
    setSuggestions((prev) =>
      prev.map((s) => s.control_code === code ? { ...s, applicable: !s.applicable } : s)
    )
  }

  const handleApply = () => {
    setApplyError(null)
    setPhase('applying')
    startTransition(async () => {
      const items = suggestions
        .map((s) => {
          const ctrl = controls.find((c) => c.id === s.control_code)
          if (!ctrl?.dbId) return null
          return {
            id: ctrl.dbId,
            isApplicable: s.applicable,
            justification: s.applicable ? s.reason : null,
          }
        })
        .filter(Boolean) as { id: string; isApplicable: boolean; justification: string | null }[]

      const res = await applySoASuggestions(items)
      if ('error' in res && res.error) {
        setApplyError(res.error)
        setPhase('ready')
        return
      }
      handleClose()
    })
  }

  // Group suggestions by their control's group
  const grouped = (() => {
    const map: Record<string, { suggestion: Suggestion; control: SoAControlRecord | undefined }[]> = {}
    for (const s of suggestions) {
      const ctrl = controls.find((c) => c.id === s.control_code)
      const group = ctrl?.group ?? 'Otros'
      if (!map[group]) map[group] = []
      map[group].push({ suggestion: s, control: ctrl })
    }
    return map
  })()

  const changesCount = suggestions.filter((s) => {
    const ctrl = controls.find((c) => c.id === s.control_code)
    return ctrl && ctrl.isApplicable !== s.applicable
  }).length

  const applicableCount = suggestions.filter((s) => s.applicable).length

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#001024]/40 backdrop-blur-sm z-[150] animate-fadein" onClick={handleClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[720px] max-h-[90vh] bg-ltcard border border-ltb rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-[151] flex flex-col animate-scalein overflow-hidden">

        {/* Header */}
        <div className="px-7 py-5 border-b border-ltb flex items-center justify-between bg-ltbg shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Brain size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-fraunces text-[19px] text-ltt leading-none">Análisis AISIA → SoA</h3>
              <p className="font-sora text-[12px] text-ltt2 mt-1">
                Sugerencias de aplicabilidad basadas en evaluaciones aprobadas
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-ltb text-lttm transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* IDLE */}
          {phase === 'idle' && (
            <div className="p-8 flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Sparkles size={28} className="text-purple-600" />
              </div>
              <div className="max-w-[480px] space-y-3">
                <p className="font-sora text-[14px] text-ltt leading-relaxed">
                  Esta función analiza las evaluaciones <strong>AISIA aprobadas</strong> de tus sistemas en alcance
                  y usa IA para sugerir qué controles ISO 42001 deberían marcarse como aplicables,
                  con una justificación inicial para cada uno.
                </p>
                <ul className="font-sora text-[12px] text-ltt2 text-left space-y-1.5 max-w-[360px] mx-auto">
                  {[
                    'Analiza el perfil de riesgo, datos y uso de cada sistema',
                    'Genera sugerencias para los 38 controles del Anexo A',
                    'Puedes revisar y ajustar antes de aplicar',
                    'Las justificaciones quedan guardadas en el SoA',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-purple-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-[480px] text-left">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="font-sora text-[12px] text-red-700">{error}</p>
                </div>
              )}
              <button
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] bg-purple-600 text-white font-sora text-[13px] font-medium hover:bg-purple-700 transition-colors"
              >
                <Sparkles size={15} />
                Iniciar análisis con IA
              </button>
              <p className="font-sora text-[11px] text-lttm">El análisis puede tardar unos segundos.</p>
            </div>
          )}

          {/* LOADING */}
          {phase === 'loading' && (
            <div className="p-16 flex flex-col items-center gap-4">
              <Loader2 size={36} className="text-purple-500 animate-spin" />
              <p className="font-sora text-[14px] text-ltt font-medium">Analizando evaluaciones AISIA…</p>
              <p className="font-sora text-[12px] text-ltt2">Consultando los controles ISO 42001 contra el perfil de tus sistemas.</p>
            </div>
          )}

          {/* READY */}
          {phase === 'ready' && (
            <>
              {/* Summary bar */}
              <div className="px-7 py-3.5 border-b border-ltb bg-purple-50/50 flex items-center gap-4 flex-wrap shrink-0">
                <span className="font-sora text-[12px] text-purple-700 font-medium">
                  {applicableCount} controles aplicables sugeridos
                </span>
                <span className="text-lttm">·</span>
                <span className={`font-sora text-[12px] font-medium ${changesCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {changesCount > 0 ? `${changesCount} cambios respecto a tu configuración actual` : 'Sin cambios respecto al estado actual'}
                </span>
                <span className="text-lttm">·</span>
                <span className="font-sora text-[11px] text-ltt2">
                  Basado en {systemCount} evaluación{systemCount > 1 ? 'es' : ''} AISIA aprobada{systemCount > 1 ? 's' : ''}
                </span>
              </div>

              {/* Controls list */}
              <div className="p-7 space-y-6">
                {applyError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="font-sora text-[12px] text-red-700">{applyError}</p>
                  </div>
                )}

                {Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-3">
                      {group}
                    </p>
                    <div className="space-y-2">
                      {items.map(({ suggestion: s, control }) => {
                        const changed = control && control.isApplicable !== s.applicable
                        return (
                          <button
                            key={s.control_code}
                            onClick={() => toggleSuggestion(s.control_code)}
                            className={`w-full text-left rounded-xl border p-4 transition-all ${
                              s.applicable
                                ? 'bg-green-50/60 border-green-200 hover:border-green-300'
                                : 'bg-ltbg border-ltb hover:border-ltb/80'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 shrink-0 rounded-full p-0.5 ${s.applicable ? 'text-green-500' : 'text-lttm'}`}>
                                {s.applicable
                                  ? <CheckCircle2 size={16} />
                                  : <XCircle size={16} />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-plex text-[10px] uppercase tracking-[0.6px] px-1.5 py-0.5 rounded border border-ltb bg-ltcard text-lttm">
                                    {s.control_code}
                                  </span>
                                  <span className="font-sora text-[13px] font-medium text-ltt">
                                    {control?.title ?? s.control_code}
                                  </span>
                                  {changed && (
                                    <span className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.6px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700">
                                      <ArrowRight size={9} />
                                      cambio
                                    </span>
                                  )}
                                </div>
                                <p className="font-sora text-[11px] text-ltt2 mt-1.5 leading-relaxed">
                                  {s.reason}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* APPLYING */}
          {phase === 'applying' && (
            <div className="p-16 flex flex-col items-center gap-4">
              <Loader2 size={36} className="text-purple-500 animate-spin" />
              <p className="font-sora text-[14px] text-ltt font-medium">Aplicando sugerencias…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'ready' || phase === 'idle') && (
          <div className="px-7 py-4 border-t border-ltb bg-ltbg flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[12px] font-medium hover:bg-ltb transition-colors"
            >
              Cancelar
            </button>
            {phase === 'ready' && (
              <button
                onClick={handleApply}
                disabled={changesCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-[9px] bg-purple-600 text-white font-sora text-[12px] font-medium hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={14} />
                Aplicar {changesCount > 0 ? `${changesCount} cambios` : 'sugerencias'}
              </button>
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}
