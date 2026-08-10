'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import {
  Settings2, History, FileDown, Send, CheckCircle2, RotateCcw,
  Loader2, AlertTriangle, X, Brain,
} from 'lucide-react'
import { MetadataModal } from './metadata-modal'
import { HistoryModal } from './history-modal'
import { AisiaAnalysisModal } from './aisia-analysis-modal'
import { transitionSoAStatus, checkSoACompleteness } from './actions'
import type { SoAMetadata, SoAControlRecord } from '@/lib/templates/data'

const ROLES_CAN_SUBMIT = new Set(['sgai_manager', 'caio', 'dpo', 'compliance_analyst', 'org_admin'])
const ROLES_CAN_APPROVE = new Set(['org_admin', 'sgai_manager', 'caio'])

type Props = {
  metadata: SoAMetadata
  availableTags: string[]
  userRole: string
  lifecycleStatus: string
  controls: SoAControlRecord[]
}

type ConfirmDialog = {
  missingCodes: string[]
}

export function HeaderActions({ metadata, availableTags, userRole, lifecycleStatus, controls }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isAisiaOpen, setIsAisiaOpen] = useState(false)
  const [lifecycleError, setLifecycleError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null)
  const [isPending, startTransition] = useTransition()

  const handlePrint = () => window.print()

  const handleTransition = (newStatus: 'under_review' | 'approved' | 'draft') => {
    setLifecycleError(null)
    startTransition(async () => {
      const res = await transitionSoAStatus(newStatus)
      if ('error' in res && res.error) {
        setLifecycleError(res.error)
      }
    })
  }

  const handleSubmitForReview = () => {
    setLifecycleError(null)
    startTransition(async () => {
      const res = await checkSoACompleteness()
      if ('error' in res) {
        setLifecycleError(res.error ?? 'Error al verificar completitud.')
        return
      }
      if (res.missing && res.missing.length > 0) {
        setConfirmDialog({ missingCodes: res.missing })
        return
      }
      // All complete — proceed directly
      const tr = await transitionSoAStatus('under_review')
      if ('error' in tr && tr.error) setLifecycleError(tr.error)
    })
  }

  const handleConfirmSubmit = () => {
    setConfirmDialog(null)
    setLifecycleError(null)
    startTransition(async () => {
      const res = await transitionSoAStatus('under_review')
      if ('error' in res && res.error) setLifecycleError(res.error)
    })
  }

  const canSubmit = ROLES_CAN_SUBMIT.has(userRole)
  const canApprove = ROLES_CAN_APPROVE.has(userRole)

  return (
    <>
      {lifecycleStatus === 'draft' && canSubmit && (
        <button
          onClick={handleSubmitForReview}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-[#fffbeb] border border-[#fde68a] text-[#b45309] font-sora text-[13px] font-medium hover:bg-[#fef3c7] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Enviar a revisión
        </button>
      )}

      {lifecycleStatus === 'under_review' && canApprove && (
        <button
          onClick={() => handleTransition('approved')}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] font-sora text-[13px] font-medium hover:bg-[#dcfce7] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Aprobar SoA
        </button>
      )}

      {(lifecycleStatus === 'approved' || lifecycleStatus === 'under_review') && canApprove && (
        <button
          onClick={() => handleTransition('draft')}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-ltbg border border-ltb text-lttm font-sora text-[13px] font-medium hover:border-brand-cyan/40 hover:text-brand-cyan transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Iniciar nueva revisión
        </button>
      )}

      {lifecycleError && (
        <span className="font-sora text-[12px] text-red-500 self-center max-w-[260px] text-right leading-tight">
          {lifecycleError}
        </span>
      )}

      {lifecycleStatus === 'draft' && (
        <button
          onClick={() => setIsAisiaOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-purple-50 border border-purple-200 text-purple-700 font-sora text-[13px] font-medium hover:bg-purple-100 transition-all"
        >
          <Brain size={15} />
          Analizar AISIA
        </button>
      )}

      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-cyan-dim border border-cyan-border text-brand-cyan font-sora text-[13px] font-medium hover:bg-brand-cyan hover:text-white transition-all group"
      >
        <FileDown size={16} className="text-brand-cyan group-hover:text-white transition-colors" />
        Exportar PDF
      </button>

      <button
        onClick={() => setIsHistoryOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-ltbg border border-ltb text-ltt font-sora text-[13px] font-medium hover:border-brand-cyan/40 hover:text-brand-cyan transition-all group"
      >
        <History size={16} className="text-lttm group-hover:text-brand-cyan transition-colors" />
        Ver Historial
      </button>

      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[13px] font-medium hover:border-brand-cyan/40 hover:text-brand-cyan transition-all group"
      >
        <Settings2 size={16} className="text-lttm group-hover:text-brand-cyan transition-colors" />
        Configurar Cabecera
      </button>

      <MetadataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={metadata}
        availableTags={availableTags}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <AisiaAnalysisModal
        isOpen={isAisiaOpen}
        onClose={() => setIsAisiaOpen(false)}
        controls={controls}
      />

      {confirmDialog && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-[#001024]/40 backdrop-blur-sm z-[160] animate-fadein"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] bg-ltcard border border-ltb rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] z-[161] flex flex-col animate-scalein overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-ltb flex items-center justify-between bg-[#fffbeb]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center">
                  <AlertTriangle size={18} className="text-[#b45309]" />
                </div>
                <div>
                  <h3 className="font-sora font-bold text-[17px] text-ltt leading-none">Controles sin justificación</h3>
                  <p className="font-sora text-[11px] text-[#b45309] mt-1">
                    {confirmDialog.missingCodes.length} control{confirmDialog.missingCodes.length > 1 ? 'es' : ''} aplicable{confirmDialog.missingCodes.length > 1 ? 's' : ''} sin documentar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDialog(null)}
                className="p-1.5 rounded-lg hover:bg-ltb text-lttm transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="font-sora text-[13px] text-ltt leading-relaxed">
                Los siguientes controles están marcados como aplicables pero no tienen una justificación documentada. Esto puede debilitar la auditoría ISO 42001.
              </p>

              <div className="max-h-[160px] overflow-y-auto rounded-xl border border-[#fde68a]/60 bg-[#fffbeb] p-3 flex flex-wrap gap-1.5">
                {confirmDialog.missingCodes.map((code) => (
                  <span
                    key={code}
                    className="font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded border border-[#fde68a] bg-[#fef3c7] text-[#92400e]"
                  >
                    {code}
                  </span>
                ))}
              </div>

              <p className="font-sora text-[12px] text-ltt2">
                Puedes continuar de todas formas y completar las justificaciones durante la revisión, o cancelar y documentarlas ahora.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-ltb bg-ltbg flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[12px] font-medium hover:bg-ltb transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-[#fffbeb] border border-[#fde68a] text-[#b45309] font-sora text-[12px] font-medium hover:bg-[#fef3c7] transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Enviar de todas formas
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
