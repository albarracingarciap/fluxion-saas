'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ClipboardList, Loader2, CheckCircle2, X, ChevronDown } from 'lucide-react'
import type { TaskGapStatus } from '@/lib/tasks/queries'
import { createGapTaskAction, createGapGroupTaskAction } from '@/app/(app)/tareas/actions'
import type { GapAssignableMember, GapGroupRecord, GapSeverity } from '@/lib/gaps/data'

type Props = {
  group: GapGroupRecord
  members: GapAssignableMember[]
  initialGroupTaskStatus: TaskGapStatus | null
  // taskStatus por cada gap.id del grupo (para "una tarea por gap")
  initialGapTaskStatuses: Record<string, TaskGapStatus | null>
}

type CreationMode = 'individual' | 'umbrella'

type ProgressState = {
  total: number
  done: number
  created: number
  skipped: number
  error: string | null
}

function severityToPriority(severity: GapSeverity): 'critical' | 'high' | 'medium' {
  if (severity === 'critico') return 'critical'
  if (severity === 'alto') return 'high'
  return 'medium'
}

export function CreateGapGroupTasksButton({ group, members, initialGroupTaskStatus, initialGapTaskStatuses }: Props) {
  const [groupTaskStatus, setGroupTaskStatus] = useState<TaskGapStatus | null>(initialGroupTaskStatus)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<CreationMode>('individual')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [finalTaskId, setFinalTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Gaps elegibles: excluir capa fmea
  const eligibleGaps = group.children.filter((g) => g.layer !== 'fmea')

  // Si ya existe tarea de grupo, mostrar badge de estado
  if (groupTaskStatus) {
    return (
      <Link
        href={`/tareas?taskId=${groupTaskStatus.taskId}`}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-grb bg-grdim text-gr font-sora text-[11px] hover:opacity-80 transition-opacity"
      >
        <CheckCircle2 size={13} />
        Tarea de grupo
      </Link>
    )
  }

  // Contar cuántos gaps del grupo ya tienen tarea
  const coveredCount = eligibleGaps.filter((g) => initialGapTaskStatuses[g.id] !== null).length

  function handleClose() {
    if (isPending) return
    setOpen(false)
    setProgress(null)
    setFinalTaskId(null)
  }

  function handleCreateIndividual() {
    startTransition(async () => {
      const gaps = eligibleGaps.filter((g) => !initialGapTaskStatuses[g.id])
      const total = gaps.length

      setProgress({ total, done: 0, created: 0, skipped: 0, error: null })

      let created = 0
      let skipped = 0
      let lastTaskId: string | null = null

      for (const gap of gaps) {
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

        if (res.created) {
          created++
          lastTaskId = res.taskId
        } else {
          skipped++
        }

        setProgress({ total, done: created + skipped, created, skipped, error: null })
      }

      setFinalTaskId(lastTaskId)
      setProgress({ total, done: total, created, skipped, error: null })
    })
  }

  function handleCreateUmbrella() {
    startTransition(async () => {
      // Derivar due_date mínima si no se especificó
      const derivedDueDate =
        dueDate ||
        eligibleGaps
          .map((g) => g.due_date)
          .filter(Boolean)
          .sort()[0] ||
        undefined

      // Derivar assignee: si todos los gaps comparten owner, usarlo como sugerencia
      const ownerIds = Array.from(new Set(eligibleGaps.map((g) => g.owner_id).filter((id): id is string => id !== null)))
      const derivedAssigneeId =
        assigneeId ||
        (ownerIds.length === 1 ? ownerIds[0] ?? undefined : undefined)

      const res = await createGapGroupTaskAction({
        groupId:      group.group_id,
        groupTitle:   group.title,
        groupLayer:   group.layer,
        gaps:         eligibleGaps.map((g) => ({
          id:       g.id,
          key:      g.key,
          layer:    g.layer,
          systemId: g.system_id,
        })),
        severityMax:  group.severity_max,
        assigneeId:   derivedAssigneeId,
        dueDate:      derivedDueDate,
      })

      if ('error' in res) {
        setProgress({ total: 1, done: 0, created: 0, skipped: 0, error: res.error })
        return
      }

      setGroupTaskStatus({ kind: 'group', taskId: res.taskId, status: 'todo' })
      setFinalTaskId(res.taskId)
      setOpen(false)
    })
  }

  const isComplete = progress && progress.done === progress.total && !progress.error

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
      >
        <ClipboardList size={12} />
        Crear tareas
        {coveredCount > 0 && (
          <span className="font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full bg-grdim text-gr border border-grb ml-0.5">
            {coveredCount}/{eligibleGaps.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
            <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[480px] flex flex-col gap-0 overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between">
                <div>
                  <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Grupo de gaps</p>
                  <p className="font-sora text-[14px] font-semibold text-ltt mt-0.5 line-clamp-1">{group.title}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Opciones de modo */}
              {!progress && (
                <div className="px-5 py-4 flex flex-col gap-3">
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Modo de creación</p>

                  <label className={`flex items-start gap-3 p-3 rounded-[10px] border cursor-pointer transition-colors ${mode === 'individual' ? 'border-cyan-border bg-cyan-dim2' : 'border-ltb bg-ltbg hover:border-ltbl'}`}>
                    <input
                      type="radio"
                      name="mode"
                      value="individual"
                      checked={mode === 'individual'}
                      onChange={() => setMode('individual')}
                      className="mt-0.5 accent-brand-cyan"
                    />
                    <div>
                      <p className="font-sora text-[13px] font-semibold text-ltt">Una tarea por gap</p>
                      <p className="font-sora text-[12px] text-ltt2 mt-0.5">
                        Crea {eligibleGaps.filter((g) => !initialGapTaskStatuses[g.id]).length} tareas independientes
                        {coveredCount > 0 ? ` (${coveredCount} ya tienen tarea)` : ''}.
                        Cada tarea queda asignada individualmente.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-[10px] border cursor-pointer transition-colors ${mode === 'umbrella' ? 'border-cyan-border bg-cyan-dim2' : 'border-ltb bg-ltbg hover:border-ltbl'}`}>
                    <input
                      type="radio"
                      name="mode"
                      value="umbrella"
                      checked={mode === 'umbrella'}
                      onChange={() => setMode('umbrella')}
                      className="mt-0.5 accent-brand-cyan"
                    />
                    <div>
                      <p className="font-sora text-[13px] font-semibold text-ltt">Tarea-paraguas del grupo</p>
                      <p className="font-sora text-[12px] text-ltt2 mt-0.5">
                        Una sola tarea que cubre los {eligibleGaps.length} gaps del grupo.
                        Útil para asignar responsabilidad a un único responsable.
                      </p>
                    </div>
                  </label>

                  {/* Asignado y fecha opcional */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">Asignado (opcional)</p>
                      <div className="relative">
                        <select
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 focus:border-brand-cyan cursor-pointer"
                        >
                          <option value="">Sin asignar</option>
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
                </div>
              )}

              {/* Progreso (modo individual en vuelo) */}
              {progress && mode === 'individual' && (
                <div className="px-5 py-4 flex flex-col gap-3">
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
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 rounded-[8px] border border-ltb bg-ltbg text-ltt2 font-sora text-[12px] hover:border-ltbl transition-colors disabled:opacity-50"
                >
                  {isComplete ? 'Cerrar' : 'Cancelar'}
                </button>

                {!isComplete && !progress && (
                  <button
                    type="button"
                    onClick={mode === 'individual' ? handleCreateIndividual : handleCreateUmbrella}
                    disabled={isPending || eligibleGaps.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
                  >
                    {isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ClipboardList size={13} />
                    )}
                    {mode === 'individual'
                      ? `Crear ${eligibleGaps.filter((g) => !initialGapTaskStatuses[g.id]).length} tareas`
                      : 'Crear tarea-paraguas'}
                  </button>
                )}

                {isComplete && finalTaskId && (
                  <Link
                    href={`/tareas?taskId=${finalTaskId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-grdim border border-grb text-gr rounded-[8px] font-sora text-[12px] font-medium hover:opacity-80 transition-opacity"
                  >
                    <CheckCircle2 size={13} />
                    Ver en tareas
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
