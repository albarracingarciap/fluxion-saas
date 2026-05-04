'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, X, Loader2, AlertTriangle, TrendingDown } from 'lucide-react'
import type { EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { recordMitigarResidualAction } from './actions'

type Props = {
  action: EditableTreatmentAction
  aiSystemId: string
  evaluationId: string
  onClose: () => void
  onSuccess: (sResidualAchieved: number | null) => void
}

export function RecordResidualModal({
  action,
  aiSystemId,
  evaluationId,
  onClose,
  onSuccess,
}: Props) {
  const [sAchieved, setSAchieved] = useState<number | null>(action.s_residual_target)
  const [notMeasured, setNotMeasured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const target = action.s_residual_target
  const actual = action.s_actual_at_creation
  const effectiveValue = notMeasured ? null : sAchieved
  const isOnTarget = effectiveValue !== null && target !== null && effectiveValue <= target

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await recordMitigarResidualAction({
        taskId: action.task_id!,
        actionId: action.id,
        sResidualAchieved: effectiveValue,
        aiSystemId,
        evaluationId,
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      onSuccess(effectiveValue)
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={() => !isPending && onClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[460px] overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown size={15} className="text-brand-cyan" />
              <p className="font-sora text-[14px] font-semibold text-ltt">Registrar S residual alcanzado</p>
            </div>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Context */}
            <div className="rounded-[8px] border border-ltb bg-ltbg px-3 py-2.5">
              <p className="font-sora text-[12px] text-ltt leading-snug line-clamp-2">
                {action.failure_mode_code} · {action.failure_mode_name}
              </p>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                  S actual <span className="text-ltt font-semibold">{actual}</span>
                </span>
                {target !== null && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                    Target <span className="text-brand-cyan font-semibold">{target}</span>
                  </span>
                )}
              </div>
            </div>

            {/* S value selector */}
            {!notMeasured && (
              <div>
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">
                  S residual alcanzado
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: actual - 1 }, (_, i) => i + 1).map((val) => {
                    const isTarget = val === target
                    const selected = sAchieved === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSAchieved(val)}
                        className={`w-9 h-9 rounded-[8px] border font-fraunces text-[16px] transition-colors ${
                          selected
                            ? isTarget || (target !== null && val <= target)
                              ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                              : 'border-orb bg-ordim text-or'
                            : isTarget
                              ? 'border-cyan-border bg-ltbg text-brand-cyan'
                              : 'border-ltb bg-ltbg text-ltt2 hover:border-ltbl'
                        }`}
                      >
                        {val}
                        {isTarget && (
                          <span className="block font-plex text-[6px] uppercase tracking-[0.5px] leading-none -mt-1">target</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Slippage / on-target feedback */}
                {sAchieved !== null && target !== null && (
                  <div className={`mt-2 rounded-[7px] border px-3 py-1.5 flex items-center gap-2 ${
                    isOnTarget
                      ? 'border-grb bg-grdim'
                      : 'border-orb bg-ordim'
                  }`}>
                    {isOnTarget
                      ? <CheckCircle2 size={13} className="text-gr shrink-0" />
                      : <AlertTriangle size={13} className="text-or shrink-0" />
                    }
                    <p className={`font-sora text-[11px] ${isOnTarget ? 'text-gr' : 'text-or'}`}>
                      {isOnTarget
                        ? `Target alcanzado — reducción de ${actual - sAchieved} punto${actual - sAchieved !== 1 ? 's' : ''}.`
                        : `Slippage — S alcanzado (${sAchieved}) supera el target (${target}).`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Not measured toggle */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notMeasured}
                onChange={(e) => {
                  setNotMeasured(e.target.checked)
                  if (e.target.checked) setSAchieved(null)
                }}
                className="mt-0.5 w-4 h-4 accent-brand-cyan cursor-pointer shrink-0"
              />
              <div>
                <p className="font-sora text-[12px] text-ltt">No se pudo medir el S residual</p>
                <p className="font-sora text-[11px] text-lttm mt-0.5">
                  Se registrará como slippage — la acción se cerrará sin valor de eficacia.
                </p>
              </div>
            </label>

            {error && (
              <p className="font-sora text-[12px] text-re bg-red-dim border border-reb rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              disabled={isPending}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || (!notMeasured && sAchieved === null)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Cerrar acción
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
