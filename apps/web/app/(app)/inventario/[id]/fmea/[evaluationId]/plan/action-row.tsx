'use client'

import { ChevronRight, RefreshCw } from 'lucide-react'
import type { TaskStatus } from '@/lib/tasks/types'
import { getSeverityMeta, getOptionLabel, type EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { DIMENSION_META, OPTION_META } from './treatment-plan-ui-constants'
import { TaskStatusChip } from './task-status-chip'

type Props = {
  action: EditableTreatmentAction
  isExpanded: boolean
  taskStatuses: Record<string, TaskStatus>
  updatingTaskId: string | null
  selectable: boolean
  isSelected: boolean
  onToggle: () => void
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void
  onToggleSelect: () => void
  onReview?: () => void
}

export function ActionRow({
  action,
  isExpanded,
  taskStatuses,
  updatingTaskId,
  selectable,
  isSelected,
  onToggle,
  onTaskStatusChange,
  onToggleSelect,
  onReview,
}: Props) {
  const severityMeta = getSeverityMeta(action.s_actual_at_creation)
  const rs = action.review_status

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={`w-full px-4 py-3.5 bg-ltcard hover:bg-ltbg transition-colors flex items-center gap-4 text-left cursor-pointer ${
        isSelected ? 'bg-cyan-dim/40' : ''
      }`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggleSelect}
          aria-label="Seleccionar acción"
          className="w-4 h-4 accent-brand-cyan cursor-pointer shrink-0"
        />
      )}

      <div className={`w-11 h-11 rounded-[10px] border flex items-center justify-center font-fraunces text-[20px] ${severityMeta.circle}`}>
        {action.s_actual_at_creation}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-sora text-[14px] font-semibold text-ltt leading-snug">
          {action.failure_mode_name}
        </div>
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
          {action.failure_mode_code} · {DIMENSION_META[action.dimension_id] ?? action.dimension_name} · {action.bloque}
        </div>
      </div>

      <span className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] ${severityMeta.pill}`}>
        {severityMeta.label}
      </span>

      <span
        className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] ${
          action.option
            ? OPTION_META[action.option].active
            : 'bg-ltcard2 border-ltb text-lttm'
        }`}
      >
        {getOptionLabel(action.option)}
      </span>

      {action.task_id && action.option !== 'aceptar' && (
        <TaskStatusChip
          taskId={action.task_id}
          status={(taskStatuses[action.task_id] ?? action.task_status ?? 'todo') as TaskStatus}
          isUpdating={updatingTaskId === action.task_id}
          onChange={onTaskStatusChange}
        />
      )}

      {rs === 'overdue_review' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] border border-reb bg-red-dim text-re font-plex text-[10px] uppercase tracking-[0.7px] shrink-0">
          <RefreshCw className="w-3 h-3" />
          Revisión vencida
        </span>
      )}
      {rs === 'due' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] border border-reb bg-red-dim text-re font-plex text-[10px] uppercase tracking-[0.7px] shrink-0">
          <RefreshCw className="w-3 h-3" />
          Revisar hoy
        </span>
      )}
      {rs === 'upcoming' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] border border-orb bg-ordim text-or font-plex text-[10px] uppercase tracking-[0.7px] shrink-0">
          <RefreshCw className="w-3 h-3" />
          Revisión próxima
        </span>
      )}

      {(rs === 'overdue_review' || rs === 'due' || rs === 'upcoming') && onReview && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onReview(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-brand-blue bg-[#e8f0fe] text-brand-blue font-plex text-[10.5px] font-medium uppercase tracking-[0.5px] hover:bg-brand-blue hover:text-white transition-colors shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Revisar
        </button>
      )}

      <ChevronRight
        className={`w-4 h-4 text-lttm transition-transform ${isExpanded ? 'rotate-90' : ''}`}
      />
    </div>
  )
}
