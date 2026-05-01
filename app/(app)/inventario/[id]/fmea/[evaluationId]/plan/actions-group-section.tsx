'use client'

import type { TreatmentOption, TreatmentPlanMember } from '@/lib/fmea/treatment-plan'
import type { TaskStatus } from '@/lib/tasks/types'
import type { EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { ActionRow } from './action-row'
import { ActionDetailPanel } from './action-detail-panel'

type ActionGroup = {
  id: string
  label: string
  items: EditableTreatmentAction[]
}

type Props = {
  group: ActionGroup
  expandedActionId: string | null
  taskStatuses: Record<string, TaskStatus>
  updatingTaskId: string | null
  readOnly: boolean
  isSavingAction: boolean
  savingActionId: string | null
  controlResolutionByAction: Record<string, 'linked' | 'created' | null>
  members: TreatmentPlanMember[]
  planDeadline: string
  aiSystemId: string
  evaluationId: string
  onToggleAction: (actionId: string) => void
  onPatchAction: (actionId: string, updater: (a: EditableTreatmentAction) => EditableTreatmentAction) => void
  onSelectOption: (actionId: string, option: TreatmentOption) => void
  onSaveAction: (action: EditableTreatmentAction) => void
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void
}

export function ActionsGroupSection({
  group,
  expandedActionId,
  taskStatuses,
  updatingTaskId,
  readOnly,
  isSavingAction,
  savingActionId,
  controlResolutionByAction,
  members,
  planDeadline,
  aiSystemId,
  evaluationId,
  onToggleAction,
  onPatchAction,
  onSelectOption,
  onSaveAction,
  onTaskStatusChange,
}: Props) {
  return (
    <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
        <div>
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Bloque de tratamiento</div>
          <div className="font-sora text-[15px] text-ltt">{group.label}</div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-[7px] border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[1px]">
          {group.items.length} acciones
        </span>
      </div>

      <div className="p-5 space-y-4">
        {group.items.map((action) => {
          const isExpanded = expandedActionId === action.id
          return (
            <div
              key={action.id}
              className={`rounded-[12px] border ${
                isExpanded ? 'border-cyan-border shadow-[0_0_0_2px_rgba(0,173,239,0.08)]' : 'border-ltb'
              } overflow-hidden`}
            >
              <ActionRow
                action={action}
                isExpanded={isExpanded}
                taskStatuses={taskStatuses}
                updatingTaskId={updatingTaskId}
                onToggle={() => onToggleAction(action.id)}
                onTaskStatusChange={onTaskStatusChange}
              />
              {isExpanded && (
                <ActionDetailPanel
                  action={action}
                  planDeadline={planDeadline}
                  members={members}
                  aiSystemId={aiSystemId}
                  evaluationId={evaluationId}
                  readOnly={readOnly}
                  isSaving={savingActionId === action.id && isSavingAction}
                  controlResolution={controlResolutionByAction[action.id] ?? null}
                  taskStatuses={taskStatuses}
                  updatingTaskId={updatingTaskId}
                  onPatch={(updater) => onPatchAction(action.id, updater)}
                  onSelectOption={(option) => onSelectOption(action.id, option)}
                  onSave={() => onSaveAction(action)}
                  onTaskStatusChange={onTaskStatusChange}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
