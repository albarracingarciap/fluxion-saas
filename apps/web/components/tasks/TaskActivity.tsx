'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, CheckCircle2, User, Calendar, Flag, MessageSquare,
  Paperclip, AlertCircle, Plus, RotateCcw,
} from 'lucide-react'
import { getTaskActivityAction, type ActivityRow } from '@/app/(app)/tareas/actions'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/tasks/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'justo ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ActionMeta = {
  icon:  React.ReactNode
  color: string   // CSS var name fragment
  label: (row: ActivityRow) => string
}

const STATUS_LABELS: Record<string, string> = TASK_STATUS_LABELS
const PRIORITY_LABELS: Record<string, string> = TASK_PRIORITY_LABELS

function formatValue(field: string | null, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const str = String(value)
  if (field === 'status')   return STATUS_LABELS[str]   ?? str
  if (field === 'priority') return PRIORITY_LABELS[str] ?? str
  if (field === 'due_date') {
    try {
      return new Date(str + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return str }
  }
  return str
}

const ACTION_META: Record<string, ActionMeta> = {
  created: {
    icon:  <Plus size={12} />,
    color: 'text-brand-cyan',
    label: () => 'Tarea creada',
  },
  status_changed: {
    icon:  <CheckCircle2 size={12} />,
    color: 'text-gr',
    label: (r) => `Estado: ${formatValue('status', r.old_value)} → ${formatValue('status', r.new_value)}`,
  },
  assignee_changed: {
    icon:  <User size={12} />,
    color: 'text-brand-cyan',
    label: (r) => r.new_value ? 'Reasignada' : 'Asignado eliminado',
  },
  due_date_changed: {
    icon:  <Calendar size={12} />,
    color: 'text-or',
    label: (r) => `Fecha límite: ${formatValue('due_date', r.old_value)} → ${formatValue('due_date', r.new_value)}`,
  },
  priority_changed: {
    icon:  <Flag size={12} />,
    color: 'text-or',
    label: (r) => `Prioridad: ${formatValue('priority', r.old_value)} → ${formatValue('priority', r.new_value)}`,
  },
  title_changed: {
    icon:  <RotateCcw size={12} />,
    color: 'text-lttm',
    label: () => 'Título actualizado',
  },
  comment_added: {
    icon:  <MessageSquare size={12} />,
    color: 'text-brand-cyan',
    label: () => 'Comentario añadido',
  },
  comment_edited: {
    icon:  <MessageSquare size={12} />,
    color: 'text-lttm',
    label: () => 'Comentario editado',
  },
  attachment_added: {
    icon:  <Paperclip size={12} />,
    color: 'text-gr',
    label: (r) => {
      const meta = r.metadata as Record<string, unknown> | null
      return `Adjunto: ${meta?.file_name ?? 'archivo'}`
    },
  },
  attachment_deleted: {
    icon:  <Paperclip size={12} />,
    color: 'text-re',
    label: (r) => {
      const meta = r.metadata as Record<string, unknown> | null
      return `Adjunto eliminado: ${meta?.file_name ?? 'archivo'}`
    },
  },
  watcher_added: {
    icon:  <User size={12} />,
    color: 'text-lttm',
    label: () => 'Nuevo seguidor',
  },
}

function ActivityItem({ row }: { row: ActivityRow }) {
  const meta = ACTION_META[row.action] ?? {
    icon:  <AlertCircle size={12} />,
    color: 'text-lttm',
    label: () => row.action.replace(/_/g, ' '),
  }

  return (
    <div className="flex items-start gap-2.5">
      {/* Timeline dot */}
      <div className="shrink-0 mt-0.5 flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full bg-ltbg border border-ltb flex items-center justify-center ${meta.color}`}>
          {meta.icon}
        </div>
      </div>

      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-sora text-[12.5px] text-ltt">
            {meta.label(row)}
          </span>
          <span className="font-sora text-[11px] text-lttm shrink-0">
            {formatRelTime(row.created_at)}
          </span>
        </div>
        {row.actor_name && (
          <p className="font-sora text-[11px] text-lttm mt-0.5">
            por <span className="text-ltt2">{row.actor_name}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TaskActivity({ taskId }: { taskId: string }) {
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    const data = await getTaskActivityAction(taskId)
    setActivity(data)
    setLoading(false)
  }, [taskId])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 size={16} className="text-brand-cyan animate-spin" />
      </div>
    )
  }

  if (activity.length === 0) {
    return (
      <p className="text-center font-sora text-[12.5px] text-lttm py-4 italic">
        Sin actividad registrada aún.
      </p>
    )
  }

  return (
    <div className="relative">
      {/* Línea de tiempo vertical */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-ltb" aria-hidden />
      <div className="flex flex-col">
        {activity.map((row) => (
          <ActivityItem key={row.id} row={row} />
        ))}
      </div>
    </div>
  )
}
