'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ClipboardList, Loader2, CheckCircle2, Users } from 'lucide-react'
import type { TaskGapStatus } from '@/lib/tasks/queries'
import { createGapTaskAction } from '@/app/(app)/tareas/actions'
import type { GapSeverity } from '@/lib/gaps/data'

type Props = {
  gap: {
    id: string
    key: string
    layer: string
    systemId: string
    title: string
    contextLabel: string
    ownerId: string | null
    dueDate: string | null
    severity: GapSeverity
  }
  initialTaskStatus: TaskGapStatus | null
}

function severityToPriority(severity: GapSeverity): 'critical' | 'high' | 'medium' {
  if (severity === 'critico') return 'critical'
  if (severity === 'alto') return 'high'
  return 'medium'
}

export function CreateGapTaskButton({ gap, initialTaskStatus }: Props) {
  const [taskStatus, setTaskStatus] = useState<TaskGapStatus | null>(initialTaskStatus)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const description = gap.contextLabel
        ? `${gap.contextLabel}\n\nOrigen: ${gap.key}`
        : `Origen: ${gap.key}`

      const res = await createGapTaskAction({
        gapId:       gap.id,
        gapKey:      gap.key,
        gapLayer:    gap.layer,
        systemId:    gap.systemId,
        title:       gap.title,
        description,
        priority:    severityToPriority(gap.severity),
        assigneeId:  gap.ownerId ?? undefined,
        dueDate:     gap.dueDate ?? undefined,
      })

      if ('error' in res) {
        setError(res.error)
      } else {
        setTaskStatus({ kind: 'individual', taskId: res.taskId, status: 'todo' })
      }
    })
  }

  if (taskStatus) {
    const label =
      taskStatus.kind === 'individual' ? 'Tarea creada' : 'Cubierto por grupo'
    return (
      <Link
        href={`/tareas?taskId=${taskStatus.taskId}`}
        title={label}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-grb bg-grdim text-gr font-sora text-[11px] hover:opacity-80 transition-opacity"
      >
        <CheckCircle2 size={13} />
        {taskStatus.kind === 'group' ? <Users size={11} /> : null}
        {label}
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleCreate}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ClipboardList size={12} />
        )}
        Crear tarea
      </button>
      {error && (
        <p className="font-sora text-[10px] text-re">{error}</p>
      )}
    </div>
  )
}
