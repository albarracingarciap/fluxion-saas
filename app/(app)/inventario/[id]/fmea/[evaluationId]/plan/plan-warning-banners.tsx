'use client'

import { AlertTriangle, Clock } from 'lucide-react'

type Props = {
  globalError: string | null
  readOnly: boolean
  isExecutiveApproval: boolean
  submitBlocked: boolean
  pendingCount: number
  incompleteActionCount: number
  overdueCount: number
  planStatus: string
}

export function PlanWarningBanners({
  globalError,
  readOnly,
  isExecutiveApproval,
  submitBlocked,
  pendingCount,
  incompleteActionCount,
  overdueCount,
  planStatus,
}: Props) {
  const showOverdueBanner =
    overdueCount > 0 && ['approved', 'in_progress'].includes(planStatus)

  return (
    <>
      {globalError && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {showOverdueBanner && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{overdueCount} {overdueCount === 1 ? 'acción vencida requiere' : 'acciones vencidas requieren'}</strong> atención inmediata — la fecha objetivo ya ha pasado sin que se hayan completado.
          </span>
        </div>
      )}

      {!readOnly && isExecutiveApproval && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Zona I requiere aprobación de alta dirección. Define todas las acciones del plan y envíalo con referencia de acta o comité para su trazabilidad formal.
          </span>
        </div>
      )}

      {!readOnly && submitBlocked && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-orb bg-ordim px-4 py-3 text-or font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {pendingCount > 0
              ? `Quedan ${pendingCount} acciones sin definir antes de poder enviar el plan a aprobación.`
              : `Hay ${incompleteActionCount} acciones con datos incompletos o inconsistentes que debes revisar antes del envío.`}
          </span>
        </div>
      )}
    </>
  )
}
