'use client'

import { ShieldAlert } from 'lucide-react'
import type { TreatmentApprovalLevel } from '@/lib/fmea/treatment-plan'
import { APPROVAL_LEVEL_META } from './treatment-plan-ui-constants'

type Props = {
  planNotes: string
  approvalLevel: TreatmentApprovalLevel
  actionsTotal: number
  acceptedCount: number
  readOnly: boolean
  onNotesChange: (value: string) => void
}

export function PlanResidualPanel({
  planNotes,
  approvalLevel,
  actionsTotal,
  acceptedCount,
  readOnly,
  onNotesChange,
}: Props) {
  return (
    <>
      <div className="mb-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">
              Riesgo residual asumido
            </div>
            <div className="font-sora text-[14px] text-ltt2">
              Documenta aquí el riesgo que seguirá vivo si todas las acciones del plan se ejecutan.
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={planNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              disabled={readOnly}
              rows={4}
              placeholder="Resumen ejecutivo del riesgo residual, hipótesis de aceptación y límites de aplicación del plan."
              className="w-full rounded-[10px] border border-ltb bg-ltbg px-4 py-3 text-[13px] font-sora text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Resumen</div>
            <div className="font-sora text-[14px] text-ltt2">El plan nace de la evaluación ya enviada a revisión.</div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Acciones candidatas</div>
              <div className="font-fraunces text-[28px] text-ltt">{actionsTotal}</div>
            </div>
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Aceptaciones</div>
              <div className="font-fraunces text-[28px] text-ltt">{acceptedCount}</div>
            </div>
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Nivel requerido</div>
              <div className="font-sora text-[14px] text-ltt">
                {APPROVAL_LEVEL_META[approvalLevel]?.label ?? approvalLevel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {readOnly && (
        <div className="mt-6 rounded-[12px] border border-ltb bg-ltcard px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-ordim border border-orb flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-or" />
          </div>
          <div>
            <div className="font-sora text-[14px] font-semibold text-ltt mb-1">
              El plan ya salió del modo borrador
            </div>
            <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
              A partir de aquí la siguiente fase será la ejecución, validación de evidencias y cierre de acciones. Esta primera versión deja ya montada la toma de decisión por modo de fallo.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
