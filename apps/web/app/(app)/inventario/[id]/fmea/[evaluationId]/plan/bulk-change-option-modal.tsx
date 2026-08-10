'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, X, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

import type { TreatmentOption } from '@/lib/fmea/treatment-plan'
import { bulkChangeTreatmentActionsOptionAction } from './actions'

type BulkOption = Exclude<TreatmentOption, 'mitigar'>

const OPTION_CONFIG: {
  value: BulkOption
  label: string
  description: string
  active: string
  minChars: number
}[] = [
  {
    value: 'aceptar',
    label: 'Aceptar',
    description: 'Asume formalmente el riesgo con revisión periódica.',
    active: 'border-orb bg-ordim text-or',
    minChars: 100,
  },
  {
    value: 'transferir',
    label: 'Transferir',
    description: 'Traslada el riesgo a un tercero mediante contrato o SLA.',
    active: 'border-[#d2c1ff] bg-[#f1ebff] text-[#7c5cff]',
    minChars: 50,
  },
  {
    value: 'evitar',
    label: 'Evitar',
    description: 'Elimina o rediseña el sistema para evitar el riesgo.',
    active: 'border-reb bg-red-dim text-re',
    minChars: 50,
  },
  {
    value: 'diferir',
    label: 'Diferir',
    description: 'Pospone la actuación con calendario y justificación.',
    active: 'border-ltb bg-ltcard2 text-ltt2',
    minChars: 50,
  },
]

type SkippedItem = { actionId: string; reason: string }

type Props = {
  selectedCount: number
  actionIds: string[]
  aiSystemId: string
  evaluationId: string
  onClose: () => void
  onSuccess: () => void
}

export function BulkChangeOptionModal({
  selectedCount,
  actionIds,
  aiSystemId,
  evaluationId,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [option, setOption] = useState<BulkOption>('transferir')
  const [justification, setJustification] = useState('')
  const [reviewDueDate, setReviewDueDate] = useState('')
  const [result, setResult] = useState<{ updated: number; skipped: SkippedItem[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isComplete = result !== null
  const currentConfig = OPTION_CONFIG.find((o) => o.value === option)!
  const minChars = currentConfig.minChars
  const justLen = justification.trim().length
  const canSubmit =
    justLen >= minChars && (option !== 'aceptar' || reviewDueDate.length > 0)

  function handleOptionChange(next: BulkOption) {
    setOption(next)
    setError(null)
  }

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)

    startTransition(async () => {
      const res = await bulkChangeTreatmentActionsOptionAction({
        aiSystemId,
        evaluationId,
        actionIds,
        option,
        justification: justification.trim(),
        reviewDueDate: option === 'aceptar' ? reviewDueDate : null,
      })

      if ('error' in res) {
        setError(res.error)
        return
      }

      setResult({ updated: res.updated, skipped: res.skipped })
      router.refresh()
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={() => !isPending && !isComplete && onClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[520px] overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className="text-brand-cyan" />
              <p className="font-sora text-[14px] font-semibold text-ltt">
                Cambiar opción — {selectedCount} {selectedCount === 1 ? 'acción' : 'acciones'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 flex flex-col gap-4">
            {isComplete ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <CheckCircle2 size={32} className="text-gr" />
                <p className="font-sora text-[14px] font-semibold text-ltt">
                  {result.updated} {result.updated === 1 ? 'acción actualizada' : 'acciones actualizadas'}
                </p>

                {result.skipped.length > 0 && (
                  <div className="w-full rounded-[8px] border border-orb bg-ordim px-3 py-2.5 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-or shrink-0" />
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-or">
                        {result.skipped.length} {result.skipped.length === 1 ? 'acción omitida' : 'acciones omitidas'}
                      </p>
                    </div>
                    <ul className="space-y-1">
                      {result.skipped.map((s) => (
                        <li key={s.actionId} className="font-sora text-[11px] text-or leading-snug">
                          <span className="opacity-60 font-mono">{s.actionId.slice(0, 8)}…</span>{' '}
                          {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Mitigar warning */}
                <div className="rounded-[8px] border border-ltb bg-ltbg px-3 py-2 flex items-start gap-2">
                  <Info size={13} className="text-lttm mt-0.5 shrink-0" />
                  <p className="font-sora text-[11px] text-ltt2">
                    La opción <strong className="text-ltt">Mitigar</strong> requiere un control específico por acción y no admite cambio masivo.
                  </p>
                </div>

                {/* Option selector */}
                <div>
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">Nueva opción</p>
                  <div className="grid grid-cols-2 gap-2">
                    {OPTION_CONFIG.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleOptionChange(opt.value)}
                        className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-[9px] border text-left transition-colors ${
                          option === opt.value
                            ? opt.active
                            : 'border-ltb bg-ltbg text-ltt2 hover:border-ltbl'
                        }`}
                      >
                        <p className="font-sora text-[12px] font-semibold leading-none">{opt.label}</p>
                        <p className="font-sora text-[10px] opacity-70 leading-snug">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Justification */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                      Justificación común <span className="text-re">*</span>
                    </p>
                    <p className={`font-sora text-[10px] tabular-nums ${
                      justLen >= minChars ? 'text-gr' : 'text-lttm'
                    }`}>
                      {justLen} / {minChars}
                    </p>
                  </div>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder={`Mínimo ${minChars} caracteres. Esta justificación se aplicará a todas las acciones seleccionadas…`}
                    rows={4}
                    className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[12px] text-ltt placeholder:text-lttm resize-none outline-none focus:border-brand-cyan"
                  />
                </div>

                {/* Review date (only for aceptar) */}
                {option === 'aceptar' && (
                  <div>
                    <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">
                      Fecha de revisión <span className="text-re">*</span>
                    </p>
                    <input
                      type="date"
                      value={reviewDueDate}
                      onChange={(e) => setReviewDueDate(e.target.value)}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan"
                    />
                  </div>
                )}

                {error && (
                  <p className="font-sora text-[12px] text-re bg-red-dim border border-reb rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isComplete) onSuccess()
                else if (!isPending) onClose()
              }}
              disabled={isPending}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
            >
              {isComplete ? 'Cerrar' : 'Cancelar'}
            </button>

            {!isComplete && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !canSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Aplicar a {selectedCount} {selectedCount === 1 ? 'acción' : 'acciones'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
