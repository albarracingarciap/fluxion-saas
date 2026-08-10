'use client'

import { Loader2 } from 'lucide-react'
import type { TaskStatus } from '@/lib/tasks/types'
import { TASK_STATUS_LABELS } from '@/lib/tasks/types'
import { TASK_STATUS_CHIP, TASK_STATUS_OPTIONS } from './treatment-plan-ui-constants'

type Props = {
  taskId: string
  status: TaskStatus
  isUpdating: boolean
  onChange: (taskId: string, status: TaskStatus) => void
}

export function TaskStatusChip({ taskId, status, isUpdating, onChange }: Props) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[0.5px] ${TASK_STATUS_CHIP[status]}`}
      onClick={(e) => e.stopPropagation()}
    >
      {isUpdating ? (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      )}
      <select
        value={status}
        onChange={(e) => onChange(taskId, e.target.value as TaskStatus)}
        disabled={isUpdating}
        className="bg-transparent border-0 outline-none font-plex text-[10px] uppercase tracking-[0.5px] cursor-pointer appearance-none pr-2 disabled:cursor-not-allowed"
        style={{ color: 'inherit' }}
      >
        {TASK_STATUS_OPTIONS.map((s) => (
          <option
            key={s}
            value={s}
            style={{ color: '#0d1b2e', backgroundColor: '#fff', textTransform: 'none', letterSpacing: 'normal' }}
          >
            {TASK_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </span>
  )
}
