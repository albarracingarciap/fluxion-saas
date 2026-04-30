'use client'

import { useState, useTransition } from 'react'
import { X, ClipboardList, Loader2, CheckCircle2, ChevronDown } from 'lucide-react'

import type { UnifiedGapRecord, GapAssignableMember, GapSeverity } from '@/lib/gaps/data'
import type { TaskGapStatus } from '@/lib/tasks/queries'
import { createGapTaskAction } from '@/app/(app)/tareas/actions'

function severityToPriority(severity: GapSeverity): 'critical' | 'high' | 'medium' {
  if (severity === 'critico') return 'critical'
  if (severity === 'alto') return 'high'
  return 'medium'
}

type ProgressState = {
  total: number
  done: number
  created: number
  skipped: number
  error: string | null
}

type Props = {
  selectedGaps: UnifiedGapRecord[]
  members: GapAssignableMember[]
  taskStatusMap: Record<string, TaskGapStatus | null>
  onClose: () => void
  onSuccess: () => void
}

export function BulkCreateTasksModal({ selectedGaps, members, taskStatusMap, onClose, onSuccess }: Props) {
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [isPending, startTransition] = useTransition()

  const taskableGaps = selectedGaps.filter((g) => g.layer !== 'fmea')
  const skippedFmea = selectedGaps.length - taskableGaps.length
  const alreadyHaveTask = taskableGaps.filter((g) => taskStatusMap[g.id] !== null)
  const toCreate = taskableGaps.filter((g) => taskStatusMap[g.id] === null)

  const isComplete = progress && progress.done === progress.total && !progress.error

  function handleCreate() {
    startTransition(async () => {
      setProgress({ total: toCreate.length, done: 0, created: 0, skipped: 0, error: null })

      let created = 0
      let skipped = 0

      for (const gap of toCreate) {
        const description = gap.context_label
          ? `${gap.context_label}\n\nOrigen: ${gap.key}`
          : `Origen: ${gap.key}`

        const res = await createGapTaskAction({
          gapId:      gap.id,
          gapKey:     gap.key,
          gapLayer:   gap.layer,
          systemId:   gap.system_id,
          title:      gap.title,
          description,
          priority:   severityToPriority(gap.severity),
          assigneeId: assigneeId || gap.owner_id || undefined,
          dueDate:    dueDate || gap.due_date || undefined,
        })

        if ('error' in res) {
          setProgress((prev) => prev ? { ...prev, error: res.error } : null)
          return
        }

        if (res.created) created++
        else skipped++

        setProgress({ total: toCreate.length, done: created + skipped, created, skipped, error: null })
      }

      setProgress({ total: toCreate.length, done: toCreate.length, created, skipped, error: null })
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={() => !isPending && onClose()}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[480px] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-brand-cyan" />
              <p className="font-sora text-[14px] font-semibold text-ltt">
                Crear tareas para selección
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Resumen previo */}
            {!progress && (
              <>
                <div className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3 space-y-1">
                  <p className="font-sora text-[13px] text-ltt">
                    Se crearán <span className="font-semibold text-brand-cyan">{toCreate.length}</span> tarea{toCreate.length !== 1 ? 's' : ''}.
                  </p>
                  {alreadyHaveTask.length > 0 && (
                    <p className="font-sora text-[12px] text-lttm">
                      {alreadyHaveTask.length} gap{alreadyHaveTask.length !== 1 ? 's' : ''} ya tienen tarea (se omitirán).
                    </p>
                  )}
                  {skippedFmea > 0 && (
                    <p className="font-sora text-[12px] text-lttm">
                      {skippedFmea} gap{skippedFmea !== 1 ? 's' : ''} de capa FMEA ser{skippedFmea !== 1 ? 'án' : 'á'} omitido{skippedFmea !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Asignado (opcional)</p>
                    <div className="relative">
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 focus:border-brand-cyan cursor-pointer"
                      >
                        <option value="">Por gap (owner)</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-lttm pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Fecha límite (opcional)</p>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Progreso */}
            {progress && (
              <div className="flex flex-col gap-3">
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                  {isComplete ? 'Completado' : 'Creando tareas…'}
                </p>
                <div className="w-full h-2 rounded-full bg-[#d9e6f4] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue transition-all duration-300"
                    style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
                  />
                </div>
                <p className="font-sora text-[12px] text-ltt2">
                  {progress.created} creadas · {progress.skipped} ya existían
                  {!isComplete && ` · ${progress.done} de ${progress.total}`}
                </p>
                {progress.error && (
                  <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">
                    {progress.error}
                  </p>
                )}
                {isComplete && (
                  <div className="flex items-center gap-2 text-gr">
                    <CheckCircle2 size={16} />
                    <span className="font-sora text-[13px] font-semibold">
                      {progress.created} tarea{progress.created !== 1 ? 's' : ''} creada{progress.created !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (isComplete) onSuccess()
                else if (!isPending) onClose()
              }}
              disabled={isPending && !isComplete}
              className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
            >
              {isComplete ? 'Cerrar' : 'Cancelar'}
            </button>

            {!progress && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || toCreate.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />}
                Crear {toCreate.length} tarea{toCreate.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
