'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, ClipboardCheck, Loader2, ShieldAlert, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react'
import type { TreatmentPlanData } from '@/lib/fmea/treatment-plan'
import { APPROVAL_LEVEL_META, PLAN_STATUS_META } from './treatment-plan-ui-constants'
import { approveTreatmentPlanAction, rejectTreatmentPlanAction } from './actions'

export function ApprovalReviewPanel({ data }: { data: TreatmentPlanData }) {
  const [committeeNotes, setCommitteeNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [isApproving, startApproving] = useTransition()
  const [isRejecting, startRejecting] = useTransition()

  function handleApprove() {
    setApprovalError(null)
    startApproving(async () => {
      const res = await approveTreatmentPlanAction({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        committeeNotes: committeeNotes || null,
      })
      if ('error' in res) setApprovalError(res.error)
    })
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setApprovalError('Debes escribir el motivo de devolución.')
      return
    }
    setApprovalError(null)
    startRejecting(async () => {
      const res = await rejectTreatmentPlanAction({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        rejectionReason,
      })
      if ('error' in res) setApprovalError(res.error)
    })
  }

  if (data.plan.status !== 'in_review') return null

  return (
    <div className="mb-5 rounded-[12px] border overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] border-orb bg-ordim">
      <div className="px-5 py-4 border-b border-orb flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] border border-orb bg-white/60 flex items-center justify-center text-or">
            <ClipboardCheck size={16} />
          </div>
          <div>
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-or mb-0.5">En revisión · Aprobación requerida</div>
            <div className="font-sora text-[14px] text-ltt font-semibold">
              {APPROVAL_LEVEL_META[data.plan.approval_level]?.narrative ?? data.plan.approval_level}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-[8px] border border-orb bg-white/60 font-fraunces text-[14px] text-or">
          {PLAN_STATUS_META['in_review']?.label}
        </span>
      </div>

      {!data.is_approver && (
        <div className="px-5 py-4 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-or shrink-0 mt-0.5" />
          <div>
            <div className="font-sora text-[13.5px] font-semibold text-ltt mb-1">
              Esperando aprobación
            </div>
            <p className="font-sora text-[13px] text-ltt2">
              El plan ha sido enviado al circuito de aprobación.
              {data.approver_name ? ` Aprobador asignado: ${data.approver_name}.` : ' Aprobador aún por asignar.'}
            </p>
          </div>
        </div>
      )}

      {data.is_approver && (
        <div className="p-5 space-y-4">
          {data.plan.approval_committee_notes && data.plan.approval_committee_notes.startsWith('[DEVUELTO]') && (
            <div className="rounded-[10px] border border-reb bg-red-dim px-4 py-3 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-re shrink-0 mt-0.5" />
              <div>
                <div className="font-plex text-[10px] uppercase tracking-[1px] text-re mb-1">Motivo de la devolución anterior</div>
                <p className="font-sora text-[12.5px] text-ltt">
                  {data.plan.approval_committee_notes.replace('[DEVUELTO] ', '')}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-[10px] border border-ltb bg-ltcard px-4 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-3">Resumen de decisiones del plan</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="font-plex text-[10px] text-lttm mb-0.5">Acciones totales</div>
                <div className="font-fraunces text-[22px] text-ltt">{data.actions.length}</div>
              </div>
              <div>
                <div className="font-plex text-[10px] text-lttm mb-0.5">Mitigaciones</div>
                <div className="font-fraunces text-[22px] text-brand-cyan">
                  {data.actions.filter((a) => a.option === 'mitigar').length}
                </div>
              </div>
              <div>
                <div className="font-plex text-[10px] text-lttm mb-0.5">Aceptaciones</div>
                <div className="font-fraunces text-[22px] text-or">
                  {data.actions.filter((a) => a.option === 'aceptar').length}
                </div>
              </div>
              <div>
                <div className="font-plex text-[10px] text-lttm mb-0.5">Zona proyectada</div>
                <div className="font-fraunces text-[22px] text-ltt">
                  {data.plan.zone_target ? data.plan.zone_target.replace('zona_', 'Z.').toUpperCase() : '—'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
              Notas del comité / aprobación (opcional)
            </label>
            <textarea
              rows={3}
              value={committeeNotes}
              onChange={(e) => setCommitteeNotes(e.target.value)}
              disabled={isApproving || isRejecting}
              placeholder="Observaciones, condiciones de aprobación o referencias al acta del comité."
              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2.5 font-sora text-[13px] text-ltt outline-none focus:border-orb disabled:opacity-70"
            />
          </div>

          {approvalError && (
            <div className="flex items-start gap-2 rounded-[8px] border border-reb bg-red-dim px-3 py-2.5 text-re font-sora text-[12.5px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{approvalError}</span>
            </div>
          )}

          {!showRejectionForm ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-gradient-to-br from-[#2a9d55] to-[#22c55e] text-white font-sora text-[13px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(34,197,94,0.28)] disabled:opacity-60"
              >
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Aprobar plan
              </button>
              <button
                type="button"
                onClick={() => { setShowRejectionForm(true); setApprovalError(null) }}
                disabled={isApproving || isRejecting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] border border-reb bg-red-dim text-re font-sora text-[13px] font-medium hover:bg-[#fff1ef] transition-colors disabled:opacity-60"
              >
                <ThumbsDown className="w-4 h-4" />
                Devolver al autor
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-[10px] border border-reb bg-red-dim p-4">
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-re mb-1">Motivo de devolución</div>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={isRejecting}
                placeholder="Explica al autor qué debe corregir o completar antes de volver a enviarlo."
                className="w-full rounded-[8px] border border-reb bg-white/70 px-3 py-2.5 font-sora text-[13px] text-ltt outline-none focus:border-re disabled:opacity-70"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-reb bg-re text-white font-sora text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirmar devolución
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRejectionForm(false); setRejectionReason(''); setApprovalError(null) }}
                  disabled={isRejecting}
                  className="font-sora text-[12.5px] text-lttm hover:text-ltt transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
