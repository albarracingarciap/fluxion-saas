'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight, Loader2, Save, ShieldAlert } from 'lucide-react'

type Props = {
  systemName: string
  systemId: string
  systemInternalId: string | null
  evaluationId: string
  evaluationVersion: number
  planCode: string
  readOnly: boolean
  isSavingDraft: boolean
  isSubmittingPlan: boolean
  hasPendingLocalChanges: boolean
  submitBlocked: boolean
  submitTitle: string | undefined
  isExecutiveApproval: boolean
  draftSyncLabel: string
  onSaveDraft: () => void
  onSubmitPlan: () => void
}

export function PlanHeader({
  systemName,
  systemId,
  systemInternalId,
  evaluationId,
  evaluationVersion,
  planCode,
  readOnly,
  isSavingDraft,
  isSubmittingPlan,
  hasPendingLocalChanges,
  submitBlocked,
  submitTitle,
  isExecutiveApproval,
  draftSyncLabel,
  onSaveDraft,
  onSubmitPlan,
}: Props) {
  return (
    <>
      {planCode === 'PREVIEW-DRAFT' && (
        <div className="mb-6 rounded-[12px] border border-cyan-border bg-cyan-dim px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ltcard border border-cyan-border flex items-center justify-center text-brand-cyan">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="font-sora text-[15px] font-semibold text-ltt">Borrador de Previsualización</div>
              <p className="font-sora text-[13px] text-ltt2">
                Esta es una vista previa de cómo quedará tu plan. Finaliza la evaluación para poder editar y enviar el plan real.
              </p>
            </div>
          </div>
          <Link
            href={`/inventario/${systemId}/fmea/${evaluationId}/evaluar`}
            className="px-4 py-2 rounded-[8px] border border-cyan-border text-brand-cyan font-sora text-[12.5px] font-medium hover:bg-white transition-colors"
          >
            Volver a evaluar
          </Link>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
            <Link
              href={`/inventario/${systemId}/fmea/${evaluationId}/evaluar`}
              className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
            >
              <ArrowLeft size={14} className="text-lttm" />
              <span>Volver a evaluación</span>
            </Link>
            <span>/</span>
            <span className="text-ltt">Plan de tratamiento</span>
          </div>
          <h1 className="font-fraunces text-[32px] leading-none font-semibold text-ltt mb-2">
            {systemName}
          </h1>
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
            {planCode} · Evaluación FMEA v{evaluationVersion} ·{' '}
            {systemInternalId ?? systemId.slice(0, 8)}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSavingDraft || !hasPendingLocalChanges}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt font-sora text-[12.5px] font-medium hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-60"
              >
                {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={onSubmitPlan}
                disabled={isSubmittingPlan || submitBlocked}
                title={submitTitle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60"
              >
                {isSubmittingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {isExecutiveApproval ? 'Enviar a alta dirección' : 'Enviar a aprobación'}
              </button>
            </>
          )}
          <span className="font-sora text-[12px] text-lttm">{draftSyncLabel}</span>
        </div>
      </div>
    </>
  )
}
