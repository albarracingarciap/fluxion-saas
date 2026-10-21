'use client'

import { AlertTriangle, ClipboardCheck, ShieldAlert } from 'lucide-react'
import type { TreatmentPlanData } from '@/lib/fmea/treatment-plan'
import { APPROVAL_LEVEL_META, PLAN_STATUS_META } from './treatment-plan-ui-constants'

/**
 * Plan en revisión. La decisión se toma siempre en Aprobaciones (B11e): esta
 * pantalla ya no aprueba ni devuelve, solo dice dónde está el plan.
 */
export function ApprovalReviewPanel({ data }: { data: TreatmentPlanData }) {
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

      {data.in_approval_circuit ? (
        <div className="px-5 py-4 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-or shrink-0 mt-0.5" />
          <div>
            <div className="font-sora text-[13.5px] font-semibold text-ltt mb-1">Esperando aprobación</div>
            <p className="font-sora text-[13px] text-ltt2">
              La decisión se toma en{' '}
              <a href="/aprobaciones" className="text-brand-cyan hover:underline">Aprobaciones</a>,
              con la política de aprobación de la organización para este nivel. Quien lo envió puede
              cancelar la solicitud desde allí: el plan vuelve a borrador.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-re shrink-0 mt-0.5" />
          <div>
            <div className="font-sora text-[13.5px] font-semibold text-ltt mb-1">Sin solicitud de aprobación abierta</div>
            <p className="font-sora text-[13px] text-ltt2">
              El plan está en revisión, pero no tiene ninguna solicitud pendiente en Aprobaciones, así
              que nadie puede decidirlo. Revisa las políticas del plan en Ajustes › Aprobaciones.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
