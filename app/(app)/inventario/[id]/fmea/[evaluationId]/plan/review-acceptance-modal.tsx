'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, X, Loader2, CheckCircle2, AlertTriangle, Clock, ChevronRight, Shield, ArrowRightLeft, XCircle, ArrowUp } from 'lucide-react'
import type { ActionReview, ReviewDecision } from '@/lib/fmea/treatment-plan'
import type { EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { reviewAcceptanceAction } from './actions'

type DecisionConfig = {
  value: ReviewDecision
  label: string
  description: string
  icon: React.ReactNode
  ring: string
  active: string
}

const DECISION_CONFIG: DecisionConfig[] = [
  {
    value: 'reaffirmed',
    label: 'Reafirmar aceptación',
    description: 'Se mantiene la decisión de aceptar o diferir el riesgo, con una nueva fecha de revisión.',
    icon: <Shield size={15} />,
    ring: 'border-orb',
    active: 'border-orb bg-ordim text-or',
  },
  {
    value: 'changed_to_mitigate',
    label: 'Cambiar a Mitigar',
    description: 'El contexto ha cambiado — se implementará un control activo para reducir la severidad.',
    icon: <ChevronRight size={15} />,
    ring: 'border-cyan-border',
    active: 'border-cyan-border bg-cyan-dim text-brand-cyan',
  },
  {
    value: 'changed_to_transfer',
    label: 'Cambiar a Transferir',
    description: 'Se traslada el riesgo a un tercero mediante contrato o SLA.',
    icon: <ArrowRightLeft size={15} />,
    ring: 'border-[#d2c1ff]',
    active: 'border-[#d2c1ff] bg-[#f1ebff] text-[#7c5cff]',
  },
  {
    value: 'changed_to_avoid',
    label: 'Cambiar a Evitar',
    description: 'Se elimina o rediseña el sistema para suprimir el riesgo por completo.',
    icon: <XCircle size={15} />,
    ring: 'border-reb',
    active: 'border-reb bg-red-dim text-re',
  },
  {
    value: 'escalated',
    label: 'Escalar a comité',
    description: 'La decisión requiere autorización de alta dirección antes de continuar.',
    icon: <ArrowUp size={15} />,
    ring: 'border-[#f0c040]',
    active: 'border-[#f0c040] bg-[#fffbea] text-[#92600a]',
  },
]

const DECISION_LABEL: Record<ReviewDecision, string> = {
  reaffirmed: 'Reafirmada',
  changed_to_mitigate: '→ Mitigar',
  changed_to_transfer: '→ Transferir',
  changed_to_avoid: '→ Evitar',
  escalated: 'Escalada',
}

function defaultReviewDate(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

type Props = {
  action: EditableTreatmentAction
  previousReviews: ActionReview[]
  aiSystemId: string
  evaluationId: string
  onClose: () => void
  onSuccess: (decision: ReviewDecision) => void
}

export function ReviewAcceptanceModal({
  action,
  previousReviews,
  aiSystemId,
  evaluationId,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter()
  const [decision, setDecision] = useState<ReviewDecision>('reaffirmed')
  const [newReviewDate, setNewReviewDate] = useState(defaultReviewDate())
  const [justification, setJustification] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const MIN_CHARS = 80
  const justLen = justification.trim().length
  const canSubmit = justLen >= MIN_CHARS && (decision !== 'reaffirmed' || newReviewDate !== '')

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await reviewAcceptanceAction({
        aiSystemId,
        evaluationId,
        actionId: action.id,
        decision,
        newReviewDueDate: decision === 'reaffirmed' ? newReviewDate : null,
        justification: justification.trim(),
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      onSuccess(decision)
      router.refresh()
    })
  }

  const optionLabel = action.option === 'aceptar' ? 'Aceptar' : 'Diferir'

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={() => !isPending && onClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[560px] max-h-[92vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className="text-brand-blue" />
              <p className="font-sora text-[14px] font-semibold text-ltt">Revisión periódica de aceptación</p>
            </div>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">

            {/* Action context */}
            <div className="rounded-[8px] border border-ltb bg-ltbg px-3 py-2.5">
              <p className="font-sora text-[12px] text-ltt leading-snug">
                {action.failure_mode_code} · {action.failure_mode_name}
              </p>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                  Opción <span className="text-or font-semibold">{optionLabel}</span>
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                  S actual <span className="text-ltt font-semibold">{action.s_actual_at_creation}</span>
                </span>
                {action.review_due_date && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                    Revisión vencía <span className="text-re font-semibold">{formatDate(action.review_due_date)}</span>
                  </span>
                )}
                {action.review_count > 0 && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                    {action.review_count} {action.review_count === 1 ? 'revisión previa' : 'revisiones previas'}
                  </span>
                )}
              </div>
              {action.justification && (
                <p className="mt-2 font-sora text-[11px] text-lttm italic leading-snug line-clamp-3">
                  "{action.justification}"
                </p>
              )}
            </div>

            {/* Previous reviews */}
            {previousReviews.length > 0 && (
              <div>
                <p className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">Historial de revisiones</p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {previousReviews.map((rev) => (
                    <div key={rev.id} className="rounded-[7px] border border-ltb bg-ltbg px-3 py-2 flex items-start gap-3">
                      <Clock size={11} className="text-lttm shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                            {formatDate(rev.reviewed_at.split('T')[0])}
                          </span>
                          <span className="font-plex text-[10px] font-semibold text-ltt2 uppercase tracking-[0.5px]">
                            {DECISION_LABEL[rev.decision]}
                          </span>
                          {rev.reviewer_name && (
                            <span className="font-plex text-[10px] text-lttm">— {rev.reviewer_name}</span>
                          )}
                        </div>
                        <p className="font-sora text-[11px] text-lttm mt-0.5 line-clamp-2">{rev.justification}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision selector */}
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">Decisión de revisión</p>
              <div className="space-y-2">
                {DECISION_CONFIG.map((cfg) => {
                  const selected = decision === cfg.value
                  return (
                    <button
                      key={cfg.value}
                      type="button"
                      onClick={() => setDecision(cfg.value)}
                      className={`w-full text-left rounded-[10px] border px-3.5 py-2.5 transition-colors flex items-start gap-3 ${
                        selected ? cfg.active : 'border-ltb bg-ltcard hover:border-ltbl'
                      }`}
                    >
                      <span className={`mt-0.5 shrink-0 ${selected ? '' : 'text-lttm'}`}>
                        {cfg.icon}
                      </span>
                      <div>
                        <p className={`font-sora text-[12px] font-semibold ${selected ? '' : 'text-ltt'}`}>
                          {cfg.label}
                        </p>
                        <p className={`font-sora text-[11px] mt-0.5 ${selected ? 'opacity-80' : 'text-lttm'}`}>
                          {cfg.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* New review date — only for reaffirmed */}
            {decision === 'reaffirmed' && (
              <div>
                <label className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1.5 block">
                  Nueva fecha de revisión
                </label>
                <input
                  type="date"
                  value={newReviewDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewReviewDate(e.target.value)}
                  className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-plex text-[12px] text-ltt focus:outline-none focus:border-brand-blue transition-colors"
                />
              </div>
            )}

            {/* Escalation note */}
            {decision === 'escalated' && (
              <div className="rounded-[8px] border border-[#f0c040] bg-[#fffbea] px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle size={13} className="text-[#92600a] shrink-0 mt-0.5" />
                <p className="font-sora text-[11px] text-[#92600a]">
                  Se registrará la escalación. El aprobador del plan recibirá una notificación para revisar esta acción en el próximo comité.
                </p>
              </div>
            )}

            {/* Justification */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">
                  Justificación de la decisión
                </label>
                <span className={`font-plex text-[10px] ${justLen >= MIN_CHARS ? 'text-gr' : 'text-lttm'}`}>
                  {justLen}/{MIN_CHARS} mín.
                </span>
              </div>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe el motivo de la decisión, el contexto actual del riesgo y cualquier evidencia relevante..."
                rows={4}
                className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[12px] text-ltt placeholder:text-lttm focus:outline-none focus:border-brand-blue transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="font-sora text-[12px] text-re bg-red-dim border border-reb rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3 shrink-0">
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
              disabled={isPending || !canSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-cyan text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,100,220,0.3)]"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Registrar revisión
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
