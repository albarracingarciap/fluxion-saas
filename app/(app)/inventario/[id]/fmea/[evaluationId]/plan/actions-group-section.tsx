'use client'

import type { TreatmentOption, TreatmentPlanMember } from '@/lib/fmea/treatment-plan'
import type { TaskStatus } from '@/lib/tasks/types'
import { isActionSelectableForBulk, type EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
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
  selectedActionIds: Set<string>
  onToggleSelection: (actionId: string) => void
  onToggleGroupSelection: (actionIds: string[]) => void
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
  selectedActionIds,
  onToggleSelection,
  onToggleGroupSelection,
}: Props) {
  const selectableItems = group.items.filter(isActionSelectableForBulk)
  const selectableIds = selectableItems.map((a) => a.id)
  const selectedInGroup = selectableIds.filter((id) => selectedActionIds.has(id)).length
  const allSelected = selectableIds.length > 0 && selectedInGroup === selectableIds.length
  const someSelected = selectedInGroup > 0 && !allSelected
  const showSelectAll = !readOnly && selectableIds.length > 0

  return (
    <div className="plan-zone-group rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showSelectAll && (
            <label className="plan-bulk-checkbox flex items-center gap-2 cursor-pointer select-none" title="Seleccionar todo el bloque">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={() => onToggleGroupSelection(selectableIds)}
                className="w-4 h-4 accent-brand-cyan cursor-pointer"
              />
            </label>
          )}
          <div>
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Bloque de tratamiento</div>
            <div className="font-sora text-[15px] text-ltt">{group.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedInGroup > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-[7px] border border-cyan-border bg-cyan-dim text-brand-cyan font-plex text-[10px] uppercase tracking-[1px]">
              {selectedInGroup} seleccionadas
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-[7px] border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[1px]">
            {group.items.length} acciones
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {group.items.map((action) => {
          const isExpanded = expandedActionId === action.id
          return (
            <div
              key={action.id}
              className={`plan-action-card rounded-[12px] border ${
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
                selectable={!readOnly && isActionSelectableForBulk(action)}
                isSelected={selectedActionIds.has(action.id)}
                onToggleSelect={() => onToggleSelection(action.id)}
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
