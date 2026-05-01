'use client'

import { ListTodo, AlertTriangle, Clock, TrendingDown } from 'lucide-react'
import { getZoneClasses, getZoneLabel, type FmeaZone } from '@/lib/fmea/domain'
import type { TreatmentPlanRecord } from '@/lib/fmea/treatment-plan'
import { APPROVAL_LEVEL_META, PLAN_STATUS_META } from './treatment-plan-ui-constants'

type Props = {
  plan: TreatmentPlanRecord
  projectedZone: FmeaZone
  definedCount: number
  actionsTotal: number
  pendingCount: number
  tasksTotal: number
  tasksDone: number
  approverName: string | null
  overdueCount: number
  dueSoonCount: number
  overduePercent: number | null
  slippageRate: number | null
  medianDaysToClose: number | null
}

export function PlanStatsBar({
  plan,
  projectedZone,
  definedCount,
  actionsTotal,
  pendingCount,
  tasksTotal,
  tasksDone,
  approverName,
  overdueCount,
  dueSoonCount,
  overduePercent,
  slippageRate,
  medianDaysToClose,
}: Props) {
  const projectedZoneMeta = getZoneClasses(projectedZone)

  return (
    <div className="mb-5 rounded-[12px] border border-ltb bg-[#070c14] text-white overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_auto] divide-y xl:divide-y-0 xl:divide-x divide-[#18324a]">
        <div className="px-5 py-4 flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${projectedZoneMeta.dot} ${
              projectedZone === 'zona_i' || projectedZone === 'zona_ii' ? 'animate-pulse' : ''
            }`}
          />
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8]">
            Zona proyectada
          </div>
          <div className={`font-fraunces text-[22px] ${projectedZoneMeta.text}`}>{getZoneLabel(projectedZone)}</div>
        </div>

        <div className="px-5 py-4">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Aprobación</div>
          <div className="font-sora text-[14px] text-white">
            {APPROVAL_LEVEL_META[plan.approval_level]?.narrative ?? plan.approval_level}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Fecha límite</div>
          <div className="font-sora text-[14px] text-white">{plan.deadline}</div>
        </div>

        <div className="px-5 py-4">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Acciones definidas</div>
          <div className="font-sora text-[14px] text-white">
            {definedCount} / {actionsTotal}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1 flex items-center gap-1.5">
            <ListTodo className="w-3 h-3" />
            Tareas completadas
          </div>
          {tasksTotal > 0 ? (
            <>
              <div className="font-sora text-[14px] text-white mb-1.5">
                {tasksDone} / {tasksTotal}
              </div>
              <div className="w-full h-[4px] bg-[#18324a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00adef] to-[#2a9d55] rounded-full transition-all"
                  style={{ width: `${Math.round((tasksDone / tasksTotal) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="font-sora text-[13px] text-[#3d5a82]">Sin tareas aún</div>
          )}
        </div>

        <div className="px-5 py-4 flex items-center justify-end">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-[8px] border font-fraunces text-[14px] ${
              PLAN_STATUS_META[plan.status]?.pill ?? 'bg-ltcard2 border-ltb text-lttm'
            }`}
          >
            {PLAN_STATUS_META[plan.status]?.label ?? plan.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#18324a] border-t border-[#18324a]">
        <div className="px-5 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Zona al crear</div>
          <div className="font-sora text-[13px] text-white">{getZoneLabel(plan.zone_at_creation)}</div>
        </div>
        <div className="px-5 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Suelo AI Act</div>
          <div className="font-sora text-[13px] text-white">{getZoneLabel(plan.ai_act_floor)}</div>
        </div>
        <div className="px-5 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Pendientes</div>
          <div className="font-sora text-[13px] text-white">{pendingCount}</div>
        </div>
        <div className="px-5 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Cadencia</div>
          <div className="font-sora text-[13px] text-white">{plan.review_cadence ?? 'Pendiente'}</div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#18324a]">
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Aprobador asignado</div>
        <div className="font-sora text-[13px] text-white">{approverName ?? 'Pendiente de asignar'}</div>
      </div>

      {/* Efficacy KPIs row — shown only when there's data to display */}
      {(overdueCount > 0 || dueSoonCount > 0 || slippageRate !== null || medianDaysToClose !== null) && (
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#18324a] border-t border-[#18324a]">
          <div className="px-5 py-3 flex items-start gap-2">
            <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${overdueCount > 0 ? 'text-re' : 'text-[#3d5a82]'}`} />
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-0.5">Vencidas</div>
              <div className={`font-sora text-[13px] ${overdueCount > 0 ? 'text-re' : 'text-[#3d5a82]'}`}>
                {overdueCount > 0
                  ? `${overdueCount} acción${overdueCount !== 1 ? 'es' : ''}${overduePercent !== null ? ` (${overduePercent}%)` : ''}`
                  : 'Ninguna'}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 flex items-start gap-2">
            <Clock className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${dueSoonCount > 0 ? 'text-or' : 'text-[#3d5a82]'}`} />
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-0.5">Vencen pronto</div>
              <div className={`font-sora text-[13px] ${dueSoonCount > 0 ? 'text-or' : 'text-[#3d5a82]'}`}>
                {dueSoonCount > 0
                  ? `${dueSoonCount} acción${dueSoonCount !== 1 ? 'es' : ''} ≤7 días`
                  : 'Ninguna'}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 flex items-start gap-2">
            <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#94b0c8]" />
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-0.5">Tasa slippage</div>
              <div className={`font-sora text-[13px] ${slippageRate !== null && slippageRate > 0 ? 'text-or' : 'text-[#3d5a82]'}`}>
                {slippageRate !== null ? `${slippageRate}% de mitigaciones` : 'Sin datos aún'}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 flex items-start gap-2">
            <ListTodo className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#94b0c8]" />
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-0.5">Mediana cierre</div>
              <div className="font-sora text-[13px] text-white">
                {medianDaysToClose !== null ? `${medianDaysToClose} días` : 'Sin datos aún'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
