'use client'

import { useState, useRef, useTransition } from 'react'
import { Plus, Loader2, Calendar, User, Layers } from 'lucide-react'
import type { TaskRow, TaskStatus, TaskPriority } from '@/lib/tasks/types'
import { TASK_STATUS_LABELS, KANBAN_COLUMNS, TASK_PRIORITY_LABELS } from '@/lib/tasks/types'
import { updateTaskStatusAction } from '@/app/(app)/tareas/actions'
import { CreateTaskModal, type Member, type System } from './CreateTaskModal'

// ─── Badge helpers ────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function isOverdue(dateStr: string | null, status: TaskStatus): boolean {
  if (!dateStr || status === 'done' || status === 'cancelled') return false
  return dateStr < new Date().toISOString().split('T')[0]!
}

// ─── Task card ────────────────────────────────────────────────────────────────

type CardProps = {
  task: TaskRow
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

function TaskCard({ task, onDragStart }: CardProps) {
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      className="bg-ltcard border border-ltb rounded-[10px] p-3.5 cursor-grab active:cursor-grabbing shadow-[0_1px_4px_rgba(0,74,173,0.06)] hover:shadow-[0_4px_12px_rgba(0,74,173,0.1)] hover:border-cyan-border transition-all select-none"
    >
      {/* Title */}
      <p className="font-sora text-[12.5px] font-medium text-ltt leading-snug mb-2">{task.title}</p>

      {/* Priority + Source tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border font-plex text-[9px] uppercase tracking-[0.4px] ${PRIORITY_STYLES[task.priority]}`}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} className="font-plex text-[9px] uppercase tracking-[0.4px] px-1.5 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-lttm">
        {task.system_name && (
          <span className="flex items-center gap-1 font-sora text-[11px] truncate">
            <Layers className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[90px]">{task.system_name}</span>
          </span>
        )}
        {task.assignee_name && (
          <span className="flex items-center gap-1 font-sora text-[11px] truncate">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[80px]">{task.assignee_name.split(' ')[0]}</span>
          </span>
        )}
        {task.due_date && (
          <span className={`flex items-center gap-1 font-plex text-[10px] ml-auto shrink-0 ${overdue ? 'text-re' : 'text-lttm'}`}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

type ColumnProps = {
  status: TaskStatus
  label: string
  color: string
  tasks: TaskRow[]
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDrop: (e: React.DragEvent, targetStatus: TaskStatus) => void
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
}

function KanbanColumn({
  status,
  label,
  color,
  tasks,
  onDragStart,
  onDrop,
  isDragOver,
  onDragOver,
  onDragLeave,
}: ColumnProps) {
  return (
    <div
      className={`flex flex-col min-w-[220px] flex-1 rounded-[12px] border transition-all ${
        isDragOver
          ? 'bg-cyan-dim border-cyan-border shadow-[0_0_0_2px_var(--cyan-border)]'
          : 'bg-ltcard2 border-ltb'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, status)}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-ltb">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-plex text-[11px] uppercase tracking-[0.6px] text-ltt2 font-semibold">
            {label}
          </span>
        </div>
        <span className="font-plex text-[10px] text-lttm bg-ltbg border border-ltb rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className={`flex flex-col gap-2.5 p-3 flex-1 min-h-[120px] ${isDragOver ? 'opacity-80' : ''}`}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-sora text-[11px] text-lttm opacity-60">Arrastra aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Search + filter bar ──────────────────────────────────────────────────────

const filterSelectCls =
  'bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 cursor-pointer transition-all focus:border-brand-cyan h-[36px]'

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = {
  tasks: TaskRow[]
  members: Member[]
  systems: System[]
}

export function KanbanView({ tasks: initialTasks, members, systems }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const draggingId = useRef<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDragStart(e: React.DragEvent, taskId: string) {
    draggingId.current = taskId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(status)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e: React.DragEvent, targetStatus: TaskStatus) {
    e.preventDefault()
    setDragOver(null)
    const taskId = draggingId.current ?? e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    const previousStatus = task.status
    setMoving(taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t))

    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, targetStatus)
      if ('error' in res) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: previousStatus } : t))
      }
      setMoving(null)
      draggingId.current = null
    })
  }

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    return true
  })

  const tasksByStatus = KANBAN_COLUMNS.reduce(
    (acc, col) => {
      acc[col.status] = filteredTasks.filter(t => t.status === col.status)
      return acc
    },
    {} as Record<TaskStatus, TaskRow[]>
  )

  return (
    <>
      <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-fraunces text-[28px] leading-none font-semibold text-ltt mb-2">
              Tablero Kanban
            </h1>
            <p className="font-sora text-[13px] text-ltt2 leading-relaxed">
              Arrastra las tarjetas entre columnas para actualizar el estado
            </p>
          </div>
          <div className="flex items-center gap-3">
            {moving && (
              <div className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
                Guardando...
              </div>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:shadow-[0_4px_12px_rgba(0,173,239,0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              Nueva tarea
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 bg-ltcard border border-ltb rounded-[10px] px-4 py-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarea..."
              className="w-full pl-8 pr-3 py-2 bg-ltbg border border-ltb rounded-lg text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 transition-all h-[36px]"
            />
          </div>

          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as TaskPriority | '')}
              className={filterSelectCls}
            >
              <option value="">Todas las prioridades</option>
              {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(p => (
                <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {KANBAN_COLUMNS.map(col => (
              <div key={col.status} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="font-plex text-[10px] text-lttm">{tasksByStatus[col.status]?.length ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              tasks={tasksByStatus[col.status] ?? []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              isDragOver={dragOver === col.status}
              onDragOver={e => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
            />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal
          members={members}
          systems={systems}
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
        />
      )}
    </>
  )
}
