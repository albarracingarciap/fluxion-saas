'use client'

import Link from 'next/link'
import { ListTodo, Loader2, Save } from 'lucide-react'
import type { TreatmentOption, TreatmentPlanMember } from '@/lib/fmea/treatment-plan'
import type { TaskStatus } from '@/lib/tasks/types'
import { getDaysFromToday, type EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { OPTION_META } from './treatment-plan-ui-constants'
import { TaskStatusChip } from './task-status-chip'
import { EvidenceSection } from './evidence-section'

type Props = {
  action: EditableTreatmentAction
  planDeadline: string
  members: TreatmentPlanMember[]
  aiSystemId: string
  evaluationId: string
  readOnly: boolean
  isSaving: boolean
  controlResolution: 'linked' | 'created' | null
  taskStatuses: Record<string, TaskStatus>
  updatingTaskId: string | null
  onPatch: (updater: (a: EditableTreatmentAction) => EditableTreatmentAction) => void
  onSelectOption: (option: TreatmentOption) => void
  onSave: () => void
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void
}

export function ActionDetailPanel({
  action,
  planDeadline,
  members,
  aiSystemId,
  evaluationId,
  readOnly,
  isSaving,
  controlResolution,
  taskStatuses,
  updatingTaskId,
  onPatch,
  onSelectOption,
  onSave,
  onTaskStatusChange,
}: Props) {
  return (
    <div className="border-t border-ltb bg-ltbg p-4 space-y-4">
      {action.task_id && action.option !== 'aceptar' && (
        <div className="rounded-[10px] border border-cyan-border bg-cyan-dim flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ListTodo className="w-4 h-4 text-brand-cyan shrink-0" />
            <div className="min-w-0">
              <span className="font-plex text-[10px] uppercase tracking-[1px] text-brand-cyan block mb-0.5">
                Tarea vinculada
              </span>
              <span className="font-sora text-[12px] text-ltt2">
                Estado sincronizado automáticamente con la acción de tratamiento
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <TaskStatusChip
              taskId={action.task_id}
              status={(taskStatuses[action.task_id] ?? action.task_status ?? 'todo') as TaskStatus}
              isUpdating={updatingTaskId === action.task_id}
              onChange={onTaskStatusChange}
            />
            <Link
              href="/tareas"
              className="font-plex text-[10px] uppercase tracking-[1px] text-brand-cyan hover:underline whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              Ver en Tareas →
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-[10px] border border-ltb bg-ltcard px-4 py-3">
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
          Contexto del modo
        </div>
        <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
          {action.failure_mode_description}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] uppercase tracking-[1px] text-lttm">
            {action.subcategoria}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] uppercase tracking-[1px] text-lttm">
            {action.tipo}
          </span>
          {action.requires_second_review && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-orb bg-ordim font-plex text-[10px] uppercase tracking-[1px] text-or">
              Requiere 2ª revisión
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
          Decisión de tratamiento
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(OPTION_META) as TreatmentOption[]).map((option) => {
            const disabled = readOnly || (option === 'aceptar' && action.s_actual_at_creation === 9)
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onSelectOption(option)}
                className={`inline-flex items-center px-3 py-2 rounded-[8px] border font-plex text-[10.5px] uppercase tracking-[1px] transition-colors ${
                  action.option === option
                    ? OPTION_META[option].active
                    : 'bg-ltcard text-lttm border-ltb hover:border-cyan-border hover:text-ltt'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {OPTION_META[option].label}
              </button>
            )
          })}
        </div>
        {action.option && (
          <p className="mt-2 font-sora text-[12.5px] text-ltt2">
            {OPTION_META[action.option].description}
          </p>
        )}
      </div>

      {action.option === 'mitigar' && (
        <div className="rounded-[10px] border border-ltb bg-ltcard p-4">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-3">
            Controles sugeridos
          </div>
          <div className="space-y-2">
            {action.control_refs.length === 0 && (
              <div className="rounded-[8px] border border-orb bg-ordim px-4 py-3 font-sora text-[13px] text-or">
                Este modo no tiene controles sugeridos en el catálogo actual. Con el schema vigente no podemos crear un control manual libre desde esta pantalla: para mitigar aquí necesitamos un control mapeado o ampliar primero los mappings del catálogo.
              </div>
            )}

            {action.control_refs.map((control) => (
              <button
                key={control.control_template_id}
                type="button"
                disabled={readOnly}
                onClick={() =>
                  onPatch((current) => ({
                    ...current,
                    control_template_id: control.control_template_id,
                  }))
                }
                className={`w-full rounded-[8px] border px-4 py-3 text-left transition-colors ${
                  action.control_template_id === control.control_template_id
                    ? 'border-cyan-border bg-cyan-dim'
                    : 'border-ltb bg-ltbg hover:border-cyan-border hover:bg-ltcard'
                } disabled:opacity-70`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-sora text-[13px] font-semibold text-ltt">
                      {control.control_name}
                    </div>
                    <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
                      {control.control_code}
                      {control.control_area ? ` · ${control.control_area}` : ''}
                    </div>
                    {control.control_description && (
                      <p className="mt-2 font-sora text-[12px] text-ltt2 leading-relaxed">
                        {control.control_description}
                      </p>
                    )}
                  </div>
                  {control.existing_control_status && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard font-plex text-[10px] uppercase tracking-[1px] text-lttm shrink-0">
                      {control.existing_control_status}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] shrink-0 ${
                      control.existing_control_id
                        ? 'border-grb bg-grdim text-gr'
                        : 'border-cyan-border bg-cyan-dim text-brand-cyan'
                    }`}
                  >
                    {control.existing_control_id ? 'Ya existe' : 'Se creará'}
                  </span>
                </div>
                {action.control_template_id === control.control_template_id && (
                  <p className="mt-2 font-sora text-[12px] text-ltt2">
                    {control.existing_control_id
                      ? 'Al confirmar esta mitigación se vinculará el control existente al tratamiento.'
                      : 'Al confirmar esta mitigación se instanciará un nuevo control para este sistema.'}
                  </p>
                )}
              </button>
            ))}
          </div>

          {controlResolution && (
            <div className="mt-3 rounded-[8px] border border-grb bg-grdim px-4 py-3 font-sora text-[12.5px] text-gr">
              {controlResolution === 'linked'
                ? 'La última decisión reutilizó un control ya existente del sistema.'
                : 'La última decisión creó un nuevo control de mitigación para este sistema.'}
            </div>
          )}

          <div className="mt-4 rounded-[8px] border border-ltb bg-ltbg px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">
                S residual objetivo
              </div>
              <div className="font-fraunces text-[24px] text-gr">
                {action.s_residual_target ?? Math.max(action.s_actual_at_creation - 2, 1)}
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={Math.max(action.s_actual_at_creation - 1, 1)}
              step={1}
              disabled={readOnly}
              value={action.s_residual_target ?? Math.max(action.s_actual_at_creation - 2, 1)}
              onChange={(e) =>
                onPatch((current) => ({
                  ...current,
                  s_residual_target: Number(e.target.value),
                }))
              }
              className="mt-3 w-full accent-brand-cyan"
            />
          </div>
        </div>
      )}

      {action.option && action.option !== 'mitigar' && (
        <div
          className={`rounded-[10px] border p-4 ${
            action.option === 'aceptar'
              ? 'border-orb bg-ordim'
              : action.option === 'evitar'
                ? 'border-reb bg-red-dim'
                : 'border-ltb bg-ltcard'
          }`}
        >
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
            Justificación y trazabilidad
          </div>
          <textarea
            rows={4}
            value={action.justification ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              onPatch((current) => ({
                ...current,
                justification: e.target.value,
              }))
            }
            placeholder={
              action.option === 'aceptar'
                ? 'Describe por qué el riesgo se acepta formalmente, qué límites tiene y cómo se revisará.'
                : 'Documenta la decisión, el mecanismo operativo y la evidencia esperada para cerrar esta acción.'
            }
            className="mt-2 w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
          />
          {action.option === 'diferir' && (getDaysFromToday(action.due_date) ?? 0) > 90 && (
            <p className="mt-2 font-sora text-[12px] text-or">
              Aplazamiento superior a 90 días: exige una justificación reforzada de al menos 100 caracteres.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
            Responsable
          </label>
          <select
            value={action.owner_id ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              onPatch((current) => ({
                ...current,
                owner_id: e.target.value || null,
              }))
            }
            className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
          >
            <option value="">Selecciona responsable</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} · {member.role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
            Fecha objetivo
          </label>
          <input
            type="date"
            value={action.due_date ?? ''}
            max={planDeadline}
            disabled={readOnly}
            onChange={(e) =>
              onPatch((current) => ({
                ...current,
                due_date: e.target.value || null,
              }))
            }
            className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
          />
          {action.due_date && action.due_date > planDeadline && (
            <p className="mt-2 font-sora text-[12px] text-re">
              La fecha objetivo no puede superar la fecha límite global del plan ({planDeadline}).
            </p>
          )}
        </div>
      </div>

      {action.option === 'aceptar' && (
        <div>
          <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
            Fecha de revisión
          </label>
          <input
            type="date"
            value={action.review_due_date ?? ''}
            disabled={readOnly}
            onChange={(e) =>
              onPatch((current) => ({
                ...current,
                review_due_date: e.target.value || null,
              }))
            }
            className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
          />
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar decisión
          </button>

          <span className="font-sora text-[12px] text-lttm">
            {action.option ? `Opción actual: ${OPTION_META[action.option].label}` : 'Acción pendiente de decisión'}
          </span>
        </div>
      )}

      {readOnly && (
        <div className="rounded-[8px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[12.5px] text-ltt2">
          Este plan ya no está en borrador. La decisión queda visible en modo solo lectura.
        </div>
      )}

      {(action.option || action.evidence_id) && (
        <EvidenceSection
          action={action}
          aiSystemId={aiSystemId}
          evaluationId={evaluationId}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}
