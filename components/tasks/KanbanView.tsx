'use client'

import { useState, useRef, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Loader2, Calendar, User, Layers, Settings2,
  X as XIcon, AlertTriangle, Rows3,
} from 'lucide-react'
import type { TaskRow, TaskStatus, TaskPriority } from '@/lib/tasks/types'
import {
  TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, KANBAN_COLUMNS,
} from '@/lib/tasks/types'
import {
  updateTaskStatusAction,
  reorderTaskAction,
  getWipLimitsAction,
  updateWipLimitsAction,
} from '@/app/(app)/tareas/actions'
import { CreateTaskModal, type Member, type System } from './CreateTaskModal'
import { TaskDetailPanel } from './TaskDetailPanel'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Calcula la nueva posición entre dos tareas adyacentes. */
function computeInsertPosition(
  sortedTasks: TaskRow[],
  overCardId:  string | null,
  insertBefore: boolean,
): { position: number; needsRebalance: boolean } {
  const last    = sortedTasks[sortedTasks.length - 1]
  const fallback = { position: (last?.position ?? 0) + 1024, needsRebalance: false }

  if (!overCardId || sortedTasks.length === 0) return fallback

  const idx = sortedTasks.findIndex(t => t.id === overCardId)
  if (idx === -1) return fallback

  let prevPos: number, nextPos: number

  if (insertBefore) {
    nextPos = sortedTasks[idx]?.position ?? 1024
    prevPos = idx > 0 ? (sortedTasks[idx - 1]?.position ?? 0) : 0
  } else {
    prevPos = sortedTasks[idx]?.position ?? 0
    nextPos = idx < sortedTasks.length - 1
      ? (sortedTasks[idx + 1]?.position ?? prevPos + 2048)
      : prevPos + 1024
  }

  if (nextPos - prevPos < 2) {
    // Gap insuficiente — asignar prevPos+1 y pedir rebalance
    return { position: prevPos + 1, needsRebalance: true }
  }

  return { position: Math.floor((prevPos + nextPos) / 2), needsRebalance: false }
}

// ─── Drag state ───────────────────────────────────────────────────────────────

type DropIndicator = {
  overCardId:   string | null   // sobre qué card está el cursor
  overStatus:   TaskStatus | null
  insertBefore: boolean          // línea por encima o por debajo
} | null

// ─── WIP limits modal ─────────────────────────────────────────────────────────

function WipLimitsModal({
  limits,
  onSave,
  onClose,
}: {
  limits:  Record<string, number>
  onSave:  (limits: Record<string, number>) => Promise<void>
  onClose: () => void
}) {
  const [draft,   setDraft]   = useState<Record<string, number>>({ ...limits })
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] w-full max-w-[360px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ltb">
          <h2 className="font-fraunces text-[16px] font-semibold text-ltt">Límites WIP</h2>
          <button onClick={onClose} className="p-1 text-lttm hover:text-ltt transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="font-sora text-[12px] text-lttm">
            Número máximo de tareas por columna. Deja en 0 para sin límite.
          </p>
          {KANBAN_COLUMNS.map(col => (
            <div key={col.status} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="flex-1 font-sora text-[12.5px] text-ltt">{col.label}</span>
              <input
                type="number"
                min={0}
                max={999}
                value={draft[col.status] ?? 0}
                onChange={e => setDraft(prev => ({ ...prev, [col.status]: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-16 bg-ltbg border border-ltb rounded-[7px] px-2 py-1 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan text-center"
              />
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-ltb flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 font-sora text-[12px] text-lttm border border-ltb rounded-[8px] hover:bg-ltbg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 font-sora text-[12px] text-white bg-brand-cyan rounded-[8px] hover:bg-brand-cyan/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

type CardProps = {
  task:         TaskRow
  color:        string
  isDragging:   boolean
  dropLineBefore: boolean
  dropLineAfter:  boolean
  onDragStart:  (e: React.DragEvent) => void
  onDragOver:   (e: React.DragEvent, el: HTMLDivElement) => void
  onOpenDetail: (task: TaskRow) => void
}

function TaskCard({
  task, color, isDragging, dropLineBefore, dropLineAfter,
  onDragStart, onDragOver, onOpenDetail,
}: CardProps) {
  const ref  = useRef<HTMLDivElement>(null)
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div className="relative">
      {/* Drop indicator — above */}
      {dropLineBefore && (
        <div className="absolute -top-1.5 left-0 right-0 h-0.5 bg-brand-cyan rounded-full z-10 shadow-[0_0_4px_rgba(0,173,239,0.6)]" />
      )}

      <div
        ref={ref}
        draggable
        onDragStart={onDragStart}
        onDragOver={e => ref.current && onDragOver(e, ref.current)}
        onClick={() => onOpenDetail(task)}
        className={`bg-ltcard rounded-[10px] border p-3.5 cursor-grab active:cursor-grabbing shadow-[0_1px_4px_rgba(0,74,173,0.06)] hover:shadow-[0_4px_12px_rgba(0,74,173,0.1)] transition-all select-none ${
          isDragging ? 'opacity-40' : ''
        }`}
        style={{ borderColor: color }}
      >
        <p className="font-sora text-[12.5px] font-medium text-ltt leading-snug mb-2">{task.title}</p>

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

      {/* Drop indicator — below */}
      {dropLineAfter && (
        <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-brand-cyan rounded-full z-10 shadow-[0_0_4px_rgba(0,173,239,0.6)]" />
      )}
    </div>
  )
}

// ─── Swimlane group header ────────────────────────────────────────────────────

function SwimLaneHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 mt-1 first:mt-0">
      <span className="font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm font-semibold flex-1 truncate">
        {label}
      </span>
      <span className="font-plex text-[9px] text-lttm bg-ltbg border border-ltb rounded-full px-1.5 py-0.5">
        {count}
      </span>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

type ColumnProps = {
  status:       TaskStatus
  label:        string
  color:        string
  tasks:        TaskRow[]
  wipLimit:     number
  swimlane:     '' | 'priority' | 'assignee'
  draggingId:   string | null
  dropIndicator: DropIndicator
  onDragStart:  (e: React.DragEvent, taskId: string) => void
  onCardDragOver: (e: React.DragEvent, cardId: string, cardEl: HTMLDivElement, status: TaskStatus) => void
  onColumnDragOver: (e: React.DragEvent, status: TaskStatus) => void
  onColumnDragLeave: (e: React.DragEvent) => void
  onDrop:       (e: React.DragEvent, targetStatus: TaskStatus) => void
  onOpenDetail: (task: TaskRow) => void
}

function KanbanColumn({
  status, label, color, tasks, wipLimit, swimlane,
  draggingId, dropIndicator,
  onDragStart, onCardDragOver, onColumnDragOver, onColumnDragLeave, onDrop, onOpenDetail,
}: ColumnProps) {
  const isOver      = dropIndicator?.overStatus === status
  const isWipOver   = wipLimit > 0 && tasks.length >= wipLimit
  const isWipBreach = wipLimit > 0 && tasks.length > wipLimit

  // Group tasks for swimlanes
  const groups = useGroupTasks(tasks, swimlane)

  return (
    <div
      className={`flex flex-col min-w-[220px] flex-1 rounded-[12px] border transition-all ${
        isOver && !dropIndicator?.overCardId
          ? 'bg-cyan-dim border-cyan-border shadow-[0_0_0_2px_var(--cyan-border)]'
          : 'bg-ltcard2 border-ltb'
      }`}
      style={!(isOver && !dropIndicator?.overCardId) ? { borderTopColor: color, borderTopWidth: '3px' } : undefined}
      onDragOver={e => onColumnDragOver(e, status)}
      onDragLeave={onColumnDragLeave}
      onDrop={e => onDrop(e, status)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-ltb">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="font-plex text-[11px] uppercase tracking-[0.6px] text-ltt2 font-semibold">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {wipLimit > 0 && (
            <span className={`font-plex text-[10px] rounded-full px-2 py-0.5 border ${
              isWipBreach
                ? 'bg-redim text-re border-reb'
                : isWipOver
                  ? 'bg-ordim text-or border-orb'
                  : 'bg-ltbg text-lttm border-ltb'
            }`}>
              {tasks.length}/{wipLimit}
              {isWipBreach && <AlertTriangle className="inline ml-0.5 w-2.5 h-2.5" />}
            </span>
          )}
          {wipLimit === 0 && (
            <span className="font-plex text-[10px] text-lttm bg-ltbg border border-ltb rounded-full px-2 py-0.5">
              {tasks.length}
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className={`flex flex-col gap-2.5 p-3 flex-1 min-h-[120px]`}>
        {groups.map(({ key, label: groupLabel, tasks: groupTasks }) => (
          <div key={key}>
            {swimlane !== '' && (
              <SwimLaneHeader label={groupLabel} count={groupTasks.length} />
            )}
            {groupTasks.map(task => {
              const isDraggingThis  = draggingId === task.id
              const isOverThis      = dropIndicator?.overCardId === task.id
              const showBefore      = isOverThis && dropIndicator?.insertBefore === true
              const showAfter       = isOverThis && dropIndicator?.insertBefore === false

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  color={color}
                  isDragging={isDraggingThis}
                  dropLineBefore={showBefore}
                  dropLineAfter={showAfter}
                  onDragStart={e => onDragStart(e, task.id)}
                  onDragOver={(e, el) => onCardDragOver(e, task.id, el, status)}
                  onOpenDetail={onOpenDetail}
                />
              )
            })}
            {groupTasks.length === 0 && swimlane !== '' && (
              <p className="font-sora text-[10px] text-lttm italic px-1">Vacío</p>
            )}
          </div>
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

// ─── Swimlane grouping hook ───────────────────────────────────────────────────

type Group = { key: string; label: string; tasks: TaskRow[] }

function useGroupTasks(tasks: TaskRow[], swimlane: '' | 'priority' | 'assignee'): Group[] {
  if (swimlane === '') {
    return [{ key: '__all__', label: '', tasks }]
  }

  if (swimlane === 'priority') {
    const order: TaskPriority[] = ['critical', 'high', 'medium', 'low']
    return order
      .map(p => ({
        key:   p,
        label: TASK_PRIORITY_LABELS[p],
        tasks: tasks.filter(t => t.priority === p),
      }))
      .filter(g => g.tasks.length > 0)
  }

  // assignee
  const groups = new Map<string, { label: string; tasks: TaskRow[] }>()
  for (const t of tasks) {
    const key   = t.assignee_id ?? '__unassigned__'
    const label = t.assignee_name ?? 'Sin asignar'
    if (!groups.has(key)) groups.set(key, { label, tasks: [] })
    groups.get(key)!.tasks.push(t)
  }
  const result: Group[] = []
  groups.forEach((v, k) => result.push({ key: k, label: v.label, tasks: v.tasks }))
  // Sin asignar al final
  return result.sort((a, b) =>
    a.key === '__unassigned__' ? 1 : b.key === '__unassigned__' ? -1 : a.label.localeCompare(b.label)
  )
}

// ─── Filter select style ──────────────────────────────────────────────────────

const filterSelectCls =
  'bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 cursor-pointer transition-all focus:border-brand-cyan h-[36px]'

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = {
  tasks:            TaskRow[]
  members:          Member[]
  systems:          System[]
  currentProfileId: string | null
}

export function KanbanView({ tasks: initialTasks, members, systems, currentProfileId }: Props) {
  const router = useRouter()
  const [tasks,          setTasks]          = useState(initialTasks)
  const [search,         setSearch]         = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [myTasksOnly,    setMyTasksOnly]    = useState(false)
  const [swimlane,       setSwimlane]       = useState<'' | 'priority' | 'assignee'>('')
  const [showCreate,     setShowCreate]     = useState(false)
  const [selectedTask,   setSelectedTask]   = useState<TaskRow | null>(null)
  const [dropIndicator,  setDropIndicator]  = useState<DropIndicator>(null)
  const [moving,         setMoving]         = useState<string | null>(null)
  const [wipLimits,      setWipLimits]      = useState<Record<string, number>>({})
  const [showWipModal,   setShowWipModal]   = useState(false)

  const draggingRef   = useRef<{ id: string; fromStatus: TaskStatus } | null>(null)
  const [, startTransition] = useTransition()

  // Cargar WIP limits
  useEffect(() => {
    void getWipLimitsAction().then(setWipLimits)
  }, [])

  const effectiveAssigneeFilter = myTasksOnly ? (currentProfileId ?? '') : assigneeFilter

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (effectiveAssigneeFilter && t.assignee_id !== effectiveAssigneeFilter) return false
    return true
  })

  // Tareas por columna, ordenadas por posición
  const tasksByStatus = useCallback(() =>
    KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col.status] = filteredTasks
        .filter(t => t.status === col.status)
        .sort((a, b) => {
          const pa = a.position ?? Infinity
          const pb = b.position ?? Infinity
          return pa - pb
        })
      return acc
    }, {} as Record<TaskStatus, TaskRow[]>),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTasks]
  )()

  // ── Drag handlers ────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    draggingRef.current = { id: taskId, fromStatus: task.status }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  function handleCardDragOver(
    e: React.DragEvent,
    cardId: string,
    cardEl: HTMLDivElement,
    status: TaskStatus,
  ) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (draggingRef.current?.id === cardId) return // no drop on itself

    const rect   = cardEl.getBoundingClientRect()
    const midY   = rect.top + rect.height / 2
    const insertBefore = e.clientY < midY

    setDropIndicator({ overCardId: cardId, overStatus: status, insertBefore })
  }

  function handleColumnDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Only update if not already over a card in this column
    setDropIndicator(prev => {
      if (prev?.overCardId && prev.overStatus === status) return prev
      return { overCardId: null, overStatus: status, insertBefore: false }
    })
  }

  function handleColumnDragLeave(e: React.DragEvent) {
    const relatedTarget = e.relatedTarget as Node | null
    if (!e.currentTarget.contains(relatedTarget)) {
      setDropIndicator(null)
    }
  }

  function handleDrop(e: React.DragEvent, targetStatus: TaskStatus) {
    e.preventDefault()
    setDropIndicator(null)

    const meta   = draggingRef.current
    const taskId = meta?.id ?? e.dataTransfer.getData('text/plain')
    if (!taskId) return

    draggingRef.current = null

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const colTasks      = tasksByStatus[targetStatus] ?? []
    const overCardId    = dropIndicator?.overCardId ?? null
    const insertBefore  = dropIndicator?.insertBefore ?? false

    // If dropping on self in same position — no-op
    if (task.status === targetStatus && !overCardId) return

    const { position, needsRebalance } = computeInsertPosition(colTasks, overCardId, insertBefore)

    const previousStatus   = task.status
    const previousPosition = task.position

    // Optimistic update
    setMoving(taskId)
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: targetStatus, position } : t
    ))

    startTransition(async () => {
      let res: { ok: true } | { error: string }
      if (task.status === targetStatus && !needsRebalance) {
        // Same column, just reorder
        res = await reorderTaskAction(taskId, targetStatus, position, false)
      } else {
        res = await reorderTaskAction(taskId, targetStatus, position, needsRebalance)
      }

      if ('error' in res) {
        // Rollback
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: previousStatus, position: previousPosition } : t
        ))
      }
      setMoving(null)
    })
  }

  // ── Other handlers ───────────────────────────────────────────────────────

  function handleTaskUpdated(updated: TaskRow) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  function handleTaskDeleted(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  async function handleSaveWipLimits(limits: Record<string, number>) {
    await updateWipLimitsAction(limits)
    setWipLimits(limits)
  }

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
              Arrastra entre columnas para cambiar estado · arrastra dentro de la columna para reordenar
            </p>
          </div>
          <div className="flex items-center gap-3">
            {moving && (
              <div className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
                Guardando…
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
          {/* Search */}
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

          {/* Priority */}
          <div className="relative">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | '')} className={filterSelectCls}>
              <option value="">Todas las prioridades</option>
              {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(p => (
                <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </div>

          {/* Assignee */}
          <div className="relative">
            <select
              value={myTasksOnly ? '' : assigneeFilter}
              onChange={e => { setAssigneeFilter(e.target.value); setMyTasksOnly(false) }}
              disabled={myTasksOnly}
              className={filterSelectCls + (myTasksOnly ? ' opacity-40 cursor-not-allowed' : '')}
            >
              <option value="">Todos los asignados</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name || m.email || m.id.slice(0, 8)}</option>
              ))}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
          </div>

          {/* Mis tareas */}
          {currentProfileId && (
            <button
              onClick={() => { setMyTasksOnly(v => !v); setAssigneeFilter('') }}
              className={`flex items-center gap-1.5 px-3 h-[36px] rounded-lg border font-sora text-[12px] transition-all ${
                myTasksOnly
                  ? 'bg-cyan-dim text-brand-cyan border-cyan-border'
                  : 'bg-ltbg text-lttm border-ltb hover:text-ltt hover:border-brand-cyan'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Mis tareas
            </button>
          )}

          {/* Swimlane toggle */}
          <div className="flex items-center gap-1 bg-ltbg border border-ltb rounded-lg p-0.5">
            {([
              { value: '',           label: 'Sin agrupar' },
              { value: 'priority',   label: 'Prioridad'   },
              { value: 'assignee',   label: 'Asignado'    },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSwimlane(opt.value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-sora text-[11.5px] transition-all ${
                  swimlane === opt.value
                    ? 'bg-ltcard text-ltt shadow-sm'
                    : 'text-lttm hover:text-ltt'
                }`}
              >
                {opt.value === '' && <Rows3 className="w-3 h-3" />}
                {opt.label}
              </button>
            ))}
          </div>

          {/* WIP limits settings */}
          <button
            type="button"
            onClick={() => setShowWipModal(true)}
            className="flex items-center gap-1.5 px-3 h-[36px] rounded-lg border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all ml-auto"
            title="Configurar límites WIP"
          >
            <Settings2 className="w-3.5 h-3.5" />
            WIP
          </button>

          {/* Column count summary */}
          <div className="flex items-center gap-2">
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
              wipLimit={wipLimits[col.status] ?? 0}
              swimlane={swimlane}
              draggingId={draggingRef.current?.id ?? null}
              dropIndicator={dropIndicator}
              onDragStart={handleDragStart}
              onCardDragOver={handleCardDragOver}
              onColumnDragOver={handleColumnDragOver}
              onColumnDragLeave={handleColumnDragLeave}
              onDrop={handleDrop}
              onOpenDetail={setSelectedTask}
            />
          ))}
        </div>
      </div>

      {showWipModal && (
        <WipLimitsModal
          limits={wipLimits}
          onSave={handleSaveWipLimits}
          onClose={() => setShowWipModal(false)}
        />
      )}

      {showCreate && (
        <CreateTaskModal
          members={members}
          systems={systems}
          onClose={() => setShowCreate(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          members={members}
          systems={systems}
          currentProfileId={currentProfileId ?? ''}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
    </>
  )
}
