'use client'

import { useState, useMemo, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Search, Plus, Trash2, Loader2, ListTodo, Activity, AlertOctagon,
  CalendarClock, User, Tag, X as XIcon, Calendar, Download,
  CheckSquare, Square, ChevronDown, Bookmark, BookmarkPlus, Trash, LayoutTemplate, RefreshCw,
  CalendarDays, BarChart2,
} from 'lucide-react'
import type { TaskRow, TaskSummary, TaskStatus, TaskPriority, TaskSourceType } from '@/lib/tasks/types'
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_SOURCE_LABELS,
} from '@/lib/tasks/types'
import {
  updateTaskStatusAction,
  deleteTaskAction,
  bulkUpdateStatusAction,
  bulkDeleteAction,
  getSavedViewsAction,
  createSavedViewAction,
  deleteSavedViewAction,
  type SavedView,
} from '@/app/(app)/tareas/actions'
import { CreateTaskModal, type Member, type System } from './CreateTaskModal'
import { TaskDetailPanel } from './TaskDetailPanel'

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo:        'bg-ltbg text-lttm border-ltb',
  in_progress: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  blocked:     'bg-redim text-re border-reb',
  in_review:   'bg-ordim text-or border-orb',
  done:        'bg-grdim text-gr border-grb',
  cancelled:   'bg-ltbg text-lttm border-ltb',
}

const STATUS_DOT: Record<TaskStatus, string> = {
  todo:        'bg-lttm',
  in_progress: 'bg-brand-cyan',
  blocked:     'bg-re',
  in_review:   'bg-or',
  done:        'bg-gr',
  cancelled:   'bg-lttm',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-plex text-[10px] uppercase tracking-[0.5px] ${PRIORITY_STYLES[priority]}`}>
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr: string | null, status: TaskStatus): boolean {
  if (!dateStr || status === 'done' || status === 'cancelled') return false
  return dateStr < new Date().toISOString().split('T')[0]!
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportToCSV(tasks: TaskRow[]) {
  const headers = ['Título', 'Sistema', 'Asignado', 'Prioridad', 'Estado', 'Origen', 'Vencimiento', 'Tags', 'Creado']
  const rows = tasks.map(t => [
    t.title,
    t.system_name ?? '',
    t.assignee_name ?? t.assignee_email ?? '',
    TASK_PRIORITY_LABELS[t.priority],
    TASK_STATUS_LABELS[t.status],
    TASK_SOURCE_LABELS[t.source_type],
    t.due_date ?? '',
    t.tags.join('; '),
    new Date(t.created_at).toLocaleDateString('es-ES'),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tareas-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Saved views dropdown ─────────────────────────────────────────────────────

type ActiveFilters = {
  search:         string
  statusFilter:   string
  priorityFilter: string
  sourceFilter:   string
  assigneeFilter: string
  myTasksOnly:    boolean
  tagFilter:      string[]
  dueDateFrom:    string
  dueDateTo:      string
}

function SavedViewsMenu({
  views,
  currentFilters,
  onLoad,
  onSave,
  onDelete,
}: {
  views:          SavedView[]
  currentFilters: ActiveFilters
  onLoad:         (view: SavedView) => void
  onSave:         (name: string, scope: 'personal' | 'shared') => Promise<void>
  onDelete:       (id: string) => Promise<void>
}) {
  const [open,      setOpen]      = useState(false)
  const [showSave,  setShowSave]  = useState(false)
  const [name,      setName]      = useState('')
  const [scope,     setScope]     = useState<'personal' | 'shared'>('personal')
  const [saving,    setSaving]    = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowSave(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), scope)
    setSaving(false)
    setName('')
    setShowSave(false)
    setOpen(false)
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  const hasActiveFilters = !!(
    currentFilters.search || currentFilters.statusFilter || currentFilters.priorityFilter ||
    currentFilters.sourceFilter || currentFilters.assigneeFilter || currentFilters.myTasksOnly ||
    currentFilters.tagFilter.length || currentFilters.dueDateFrom || currentFilters.dueDateTo
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setShowSave(false) }}
        className={`flex items-center gap-1.5 px-3 h-[36px] rounded-lg border font-sora text-[12px] transition-all ${
          open ? 'bg-cyan-dim text-brand-cyan border-cyan-border' : 'bg-ltbg text-lttm border-ltb hover:text-ltt hover:border-brand-cyan'
        }`}
        title="Vistas guardadas"
      >
        <Bookmark className="w-3.5 h-3.5" />
        Vistas
        {views.length > 0 && (
          <span className="font-plex text-[9px] bg-brand-cyan text-white rounded-full px-1.5 py-0.5 leading-none">
            {views.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-72 bg-ltcard border border-ltb rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Guardar vista actual */}
          {!showSave ? (
            <button
              type="button"
              onClick={() => setShowSave(true)}
              disabled={!hasActiveFilters}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-sora text-brand-cyan hover:bg-cyan-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-b border-ltb"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Guardar filtros actuales…
            </button>
          ) : (
            <div className="px-3 py-2.5 border-b border-ltb">
              <p className="font-plex text-[10px] uppercase tracking-wider text-lttm mb-2">Nueva vista</p>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleSave(); if (e.key === 'Escape') setShowSave(false) }}
                placeholder="Nombre de la vista…"
                className="w-full bg-ltbg border border-ltb rounded-[7px] px-2.5 py-1.5 text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan mb-2"
              />
              <div className="flex items-center gap-2">
                <select
                  value={scope}
                  onChange={e => setScope(e.target.value as 'personal' | 'shared')}
                  className="flex-1 bg-ltbg border border-ltb rounded-[7px] px-2 py-1.5 text-[11px] text-ltt font-sora outline-none"
                >
                  <option value="personal">Solo yo</option>
                  <option value="shared">Toda la org</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!name.trim() || saving}
                  className="px-3 py-1.5 bg-brand-cyan text-white rounded-[7px] font-sora text-[11px] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
                </button>
                <button type="button" onClick={() => setShowSave(false)} className="p-1.5 text-lttm hover:text-ltt">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Lista de vistas */}
          {views.length === 0 ? (
            <p className="px-4 py-4 font-sora text-[12px] text-lttm text-center italic">
              Sin vistas guardadas
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-ltb">
              {views.map(v => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-ltbg cursor-pointer group"
                  onClick={() => { onLoad(v); setOpen(false) }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-sora text-[12.5px] text-ltt truncate">{v.name}</p>
                    <p className="font-plex text-[9.5px] text-lttm uppercase tracking-wider">
                      {v.scope === 'shared' ? '🌐 Compartida' : '🔒 Personal'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => void handleDelete(e, v.id)}
                    disabled={deletingId === v.id}
                    className="opacity-0 group-hover:opacity-100 p-1 text-lttm hover:text-re transition-all"
                    title="Eliminar vista"
                  >
                    {deletingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────────────────────────────

type RowProps = {
  task:           TaskRow
  selected:       boolean
  onToggleSelect: (id: string) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onDelete:       (taskId: string) => void
  onOpenDetail:   (task: TaskRow) => void
  deleting:       string | null
}

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']

const selectCls =
  'bg-transparent border-0 outline-none font-plex text-[10px] uppercase tracking-[0.5px] cursor-pointer appearance-none w-full pr-3'

function TaskListRow({ task, selected, onToggleSelect, onStatusChange, onDelete, onOpenDetail, deleting }: RowProps) {
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div
      className={`grid grid-cols-[32px_2.5fr_1fr_1fr_0.9fr_1.1fr_0.8fr_80px] gap-3 items-center px-4 py-3 hover:bg-ltbg transition-colors group border-b border-ltb last:border-0 ${
        selected ? 'bg-cyan-dim/10' : ''
      }`}
    >
      {/* Checkbox */}
      <div onClick={e => { e.stopPropagation(); onToggleSelect(task.id) }} className="flex items-center justify-center cursor-pointer">
        {selected
          ? <CheckSquare className="w-4 h-4 text-brand-cyan" />
          : <Square className="w-4 h-4 text-lttm opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </div>

      {/* Title */}
      <div className="min-w-0 cursor-pointer" onClick={() => onOpenDetail(task)}>
        <p className="font-sora text-[13px] text-ltt font-medium truncate">{task.title}</p>
        {task.description && (
          <p className="font-sora text-[11px] text-lttm truncate mt-0.5">{task.description}</p>
        )}
        {task.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sistema */}
      <div className="min-w-0 cursor-pointer" onClick={() => onOpenDetail(task)}>
        <p className="font-sora text-[12px] text-ltt2 truncate">{task.system_name ?? '—'}</p>
      </div>

      {/* Asignado */}
      <div className="min-w-0 cursor-pointer" onClick={() => onOpenDetail(task)}>
        <p className="font-sora text-[12px] text-ltt2 truncate">{task.assignee_name ?? '—'}</p>
      </div>

      {/* Prioridad */}
      <div className="cursor-pointer" onClick={() => onOpenDetail(task)}>
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Estado (editable) */}
      <div onClick={e => e.stopPropagation()}>
        <div className={`relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${STATUS_STYLES[task.status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[task.status]}`} />
          <select
            value={task.status}
            onChange={e => onStatusChange(task.id, e.target.value as TaskStatus)}
            className={selectCls}
            style={{ color: 'inherit' }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s} style={{ color: '#0d1b2e', backgroundColor: '#ffffff', textTransform: 'none', letterSpacing: 'normal' }}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vencimiento */}
      <div className="min-w-0 cursor-pointer" onClick={() => onOpenDetail(task)}>
        <span className={`font-sora text-[12px] ${overdue ? 'text-re font-medium' : 'text-ltt2'}`}>
          {formatDate(task.due_date)}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        {task.source_type === 'manual' && (
          <button
            onClick={() => onDelete(task.id)}
            disabled={deleting === task.id}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-re hover:bg-redim transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
            title="Eliminar tarea"
          >
            {deleting === task.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        {task.source_type !== 'manual' && (
          <span className="font-plex text-[9px] uppercase tracking-[0.5px] text-lttm opacity-0 group-hover:opacity-100">
            {TASK_SOURCE_LABELS[task.source_type].split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkBar({
  count,
  onClear,
  onBulkStatus,
  onBulkDelete,
  bulkLoading,
}: {
  count:         number
  onClear:       () => void
  onBulkStatus:  (status: TaskStatus) => void
  onBulkDelete:  () => void
  bulkLoading:   boolean
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-cyan-dim border-b border-cyan-border">
      <span className="font-sora text-[12.5px] font-semibold text-brand-cyan">
        {count} seleccionada{count !== 1 ? 's' : ''}
      </span>
      <div className="h-4 w-px bg-cyan-border" />

      {/* Cambiar estado */}
      <div className="relative">
        <select
          disabled={bulkLoading}
          defaultValue=""
          onChange={e => { if (e.target.value) onBulkStatus(e.target.value as TaskStatus); e.target.value = '' }}
          className="bg-ltcard border border-ltb rounded-[7px] px-2.5 py-1 text-[11.5px] text-ltt font-sora outline-none appearance-none pr-6 cursor-pointer disabled:opacity-50 h-[28px]"
        >
          <option value="" disabled>Cambiar estado…</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
      </div>

      {/* Eliminar selección */}
      <button
        type="button"
        onClick={onBulkDelete}
        disabled={bulkLoading}
        className="flex items-center gap-1.5 px-3 py-1 bg-redim text-re border border-reb rounded-[7px] font-sora text-[11.5px] hover:bg-re/20 transition-colors disabled:opacity-50 h-[28px]"
      >
        {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Eliminar
      </button>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto p-1 text-brand-cyan hover:text-ltt transition-colors"
        title="Deseleccionar todo"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

type SummaryCard = {
  label: string
  value: number
  icon:  React.ReactNode
  accent: string
  bar:    string
}

function KpiCard({ label, value, icon, accent, bar }: SummaryCard) {
  return (
    <div className="relative bg-ltcard border border-ltb rounded-[12px] overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${bar}`} />
      <div className="p-4 px-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-plex text-[10.5px] uppercase tracking-wider text-lttm">{label}</span>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>
            {icon}
          </div>
        </div>
        <span className="font-sora font-bold text-[32px] text-ltt leading-none">{value}</span>
      </div>
    </div>
  )
}

// ─── Filter select style ──────────────────────────────────────────────────────

const filterSelectCls =
  'bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] text-ltt font-sora outline-none appearance-none pr-7 cursor-pointer transition-all focus:border-brand-cyan h-[36px]'

// ─── Main view ────────────────────────────────────────────────────────────────

type Props = {
  tasks:            TaskRow[]
  summary:          TaskSummary
  members:          Member[]
  systems:          System[]
  currentProfileId: string | null
}

export function TasksView({ tasks: initialTasks, summary, members, systems, currentProfileId }: Props) {
  const router = useRouter()
  const [tasks,           setTasks]           = useState(initialTasks)
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<TaskStatus | ''>('')
  const [priorityFilter,  setPriorityFilter]  = useState<TaskPriority | ''>('')
  const [sourceFilter,    setSourceFilter]    = useState<TaskSourceType | ''>('')
  const [assigneeFilter,  setAssigneeFilter]  = useState('')
  const [myTasksOnly,     setMyTasksOnly]     = useState(false)
  const [tagFilter,       setTagFilter]       = useState<string[]>([])
  const [dueDateFrom,     setDueDateFrom]     = useState('')
  const [dueDateTo,       setDueDateTo]       = useState('')
  const [showCreate,      setShowCreate]      = useState(false)
  const [selectedTask,    setSelectedTask]    = useState<TaskRow | null>(null)
  const [deleting,        setDeleting]        = useState<string | null>(null)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())
  const [bulkLoading,     setBulkLoading]     = useState(false)
  const [savedViews,      setSavedViews]      = useState<SavedView[]>([])
  const [, startTransition] = useTransition()

  // Cargar vistas guardadas al montar
  useEffect(() => {
    void getSavedViewsAction().then(setSavedViews)
  }, [])

  const effectiveAssigneeFilter = myTasksOnly ? (currentProfileId ?? '') : assigneeFilter

  // Todos los tags únicos presentes en las tareas
  const allTags = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => t.tags.forEach(tag => set.add(tag)))
    return Array.from(set).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (sourceFilter && t.source_type !== sourceFilter) return false
      if (effectiveAssigneeFilter && t.assignee_id !== effectiveAssigneeFilter) return false
      if (tagFilter.length > 0 && !tagFilter.every(tag => t.tags.includes(tag))) return false
      if (dueDateFrom && (!t.due_date || t.due_date < dueDateFrom)) return false
      if (dueDateTo   && (!t.due_date || t.due_date > dueDateTo))   return false
      return true
    })
  }, [tasks, search, statusFilter, priorityFilter, sourceFilter, effectiveAssigneeFilter, tagFilter, dueDateFrom, dueDateTo])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null)
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, newStatus)
      if ('error' in res) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: tasks.find(x => x.id === taskId)?.status ?? t.status } : t))
      }
    })
  }

  function handleDelete(taskId: string) {
    setDeleting(taskId)
    startTransition(async () => {
      const res = await deleteTaskAction(taskId)
      if ('ok' in res) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        if (selectedTask?.id === taskId) setSelectedTask(null)
        setSelectedIds(prev => { const s = new Set(prev); s.delete(taskId); return s })
      }
      setDeleting(null)
    })
  }

  function handleTaskUpdated(updated: TaskRow) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  function handleTaskDeleted(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(taskId); return s })
    setSelectedTask(null)
  }

  // ── Bulk handlers ────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) { s.delete(id) } else { s.add(id) }
      return s
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
  }

  async function handleBulkStatus(status: TaskStatus) {
    const ids = Array.from(selectedIds)
    setBulkLoading(true)
    const res = await bulkUpdateStatusAction(ids, status)
    if ('ok' in res) {
      setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, status } : t))
      if (selectedTask && selectedIds.has(selectedTask.id)) {
        setSelectedTask(prev => prev ? { ...prev, status } : null)
      }
      setSelectedIds(new Set())
    }
    setBulkLoading(false)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    setBulkLoading(true)
    const res = await bulkDeleteAction(ids)
    if ('ok' in res) {
      setTasks(prev => prev.filter(t => !selectedIds.has(t.id)))
      if (selectedTask && selectedIds.has(selectedTask.id)) setSelectedTask(null)
      setSelectedIds(new Set())
    }
    setBulkLoading(false)
  }

  // ── Saved views handlers ─────────────────────────────────────────────────

  function buildCurrentFilters(): ActiveFilters {
    return { search, statusFilter, priorityFilter, sourceFilter, assigneeFilter, myTasksOnly, tagFilter, dueDateFrom, dueDateTo }
  }

  async function handleSaveView(name: string, scope: 'personal' | 'shared') {
    const res = await createSavedViewAction({
      name,
      scope,
      filters: buildCurrentFilters() as unknown as Record<string, unknown>,
    })
    if ('id' in res) {
      const updated = await getSavedViewsAction()
      setSavedViews(updated)
    }
  }

  function handleLoadView(view: SavedView) {
    const f = view.filters as Partial<ActiveFilters>
    setSearch(f.search ?? '')
    setStatusFilter((f.statusFilter ?? '') as TaskStatus | '')
    setPriorityFilter((f.priorityFilter ?? '') as TaskPriority | '')
    setSourceFilter((f.sourceFilter ?? '') as TaskSourceType | '')
    setAssigneeFilter(f.assigneeFilter ?? '')
    setMyTasksOnly(f.myTasksOnly ?? false)
    setTagFilter(f.tagFilter ?? [])
    setDueDateFrom(f.dueDateFrom ?? '')
    setDueDateTo(f.dueDateTo ?? '')
    setSelectedIds(new Set())
  }

  async function handleDeleteView(id: string) {
    await deleteSavedViewAction(id)
    setSavedViews(prev => prev.filter(v => v.id !== id))
  }

  // ── Derived counts ───────────────────────────────────────────────────────

  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const blockedCount    = tasks.filter(t => t.status === 'blocked').length
  const allSelected     = filtered.length > 0 && selectedIds.size === filtered.length

  return (
    <>
      <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein pb-10">
        {/* Header */}
        <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
          >
            <ArrowLeft size={13} />
            Volver al dashboard
          </Link>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListTodo size={13} className="text-lttm" />
                <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Seguimiento · Tareas</p>
              </div>
              <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Gestión de Tareas</h1>
              <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
                Seguimiento de tareas de cumplimiento — manuales y generadas automáticamente
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/tareas/calendario"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-ltbg border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all"
              >
                <CalendarDays className="w-4 h-4" />
                Calendario
              </Link>
              <Link
                href="/tareas/metricas"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-ltbg border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all"
              >
                <BarChart2 className="w-4 h-4" />
                Métricas
              </Link>
              <Link
                href="/tareas/recurrentes"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-ltbg border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Recurrentes
              </Link>
              <Link
                href="/tareas/plantillas"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-ltbg border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all"
              >
                <LayoutTemplate className="w-4 h-4" />
                Plantillas
              </Link>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue text-white rounded-[8px] font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva tarea
              </button>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total tareas"
            value={summary.total}
            icon={<ListTodo className="w-3.5 h-3.5 text-brand-cyan" />}
            accent="bg-cyan-dim"
            bar="bg-gradient-to-r from-brand-cyan to-brand-blue"
          />
          <KpiCard
            label="En progreso"
            value={inProgressCount}
            icon={<Activity className="w-3.5 h-3.5 text-brand-blue" />}
            accent="bg-blue-dim"
            bar="bg-gradient-to-r from-brand-blue to-brand-cyan"
          />
          <KpiCard
            label="Bloqueadas"
            value={blockedCount}
            icon={<AlertOctagon className="w-3.5 h-3.5 text-re" />}
            accent="bg-redim"
            bar="bg-gradient-to-r from-re to-[#ef5350]"
          />
          <KpiCard
            label="Vencidas"
            value={summary.overdue}
            icon={<CalendarClock className="w-3.5 h-3.5 text-or" />}
            accent="bg-ordim"
            bar="bg-gradient-to-r from-or to-[#f59e0b]"
          />
        </div>

        {/* Table card */}
        <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_4px_24px_rgba(0,74,173,0.04)]">

          {/* Filter row 1 */}
          <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center gap-3 flex-wrap rounded-t-[12px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tarea..."
                className="w-full pl-8 pr-3 py-2 bg-ltbg border border-ltb rounded-lg text-[12px] text-ltt font-sora outline-none focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10 transition-all h-[36px]"
              />
            </div>

            {/* Status */}
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | '')} className={filterSelectCls}>
                <option value="">Todos los estados</option>
                {(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'] as TaskStatus[]).map(s => (
                  <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                ))}
              </select>
              <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
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

            {/* Source */}
            <div className="relative">
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as TaskSourceType | '')} className={filterSelectCls}>
                <option value="">Todos los orígenes</option>
                {(['manual', 'treatment_action', 'gap', 'evaluation', 'fmea_item'] as TaskSourceType[]).map(s => (
                  <option key={s} value={s}>{TASK_SOURCE_LABELS[s]}</option>
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

            {/* Saved views */}
            <SavedViewsMenu
              views={savedViews}
              currentFilters={buildCurrentFilters()}
              onLoad={handleLoadView}
              onSave={handleSaveView}
              onDelete={handleDeleteView}
            />

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => exportToCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 h-[36px] rounded-lg border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all disabled:opacity-40"
              title="Exportar a CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>

            <span className="font-plex text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border ml-auto">
              {filtered.length} TAREA{filtered.length !== 1 ? 'S' : ''}
            </span>
          </div>

          {/* Filter row 2: tags + date range */}
          <div className="px-5 py-2.5 border-b border-ltb bg-ltcard2 flex items-center gap-3 flex-wrap">
            {/* Tag chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3 h-3 text-lttm shrink-0" />
                {allTags.map(tag => {
                  const active = tagFilter.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(prev =>
                        active ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={`font-plex text-[9.5px] uppercase tracking-[0.5px] px-2 py-1 rounded-full border transition-all ${
                        active
                          ? 'bg-cyan-dim text-brand-cyan border-cyan-border'
                          : 'bg-ltbg text-lttm border-ltb hover:border-brand-cyan hover:text-ltt'
                      }`}
                    >
                      {tag}
                      {active && <XIcon className="inline ml-1 w-2.5 h-2.5" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Date range */}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-3 h-3 text-lttm shrink-0" />
              <input
                type="date"
                value={dueDateFrom}
                onChange={e => setDueDateFrom(e.target.value)}
                className="bg-ltbg border border-ltb rounded-lg px-2 py-1 text-[11px] text-ltt font-sora outline-none focus:border-brand-cyan h-[30px]"
                title="Vencimiento desde"
              />
              <span className="font-plex text-[10px] text-lttm">—</span>
              <input
                type="date"
                value={dueDateTo}
                onChange={e => setDueDateTo(e.target.value)}
                className="bg-ltbg border border-ltb rounded-lg px-2 py-1 text-[11px] text-ltt font-sora outline-none focus:border-brand-cyan h-[30px]"
                title="Vencimiento hasta"
              />
              {(dueDateFrom || dueDateTo) && (
                <button
                  type="button"
                  onClick={() => { setDueDateFrom(''); setDueDateTo('') }}
                  className="p-1 text-lttm hover:text-ltt transition-colors"
                  title="Limpiar fechas"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <BulkBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onBulkStatus={status => void handleBulkStatus(status)}
              onBulkDelete={() => void handleBulkDelete()}
              bulkLoading={bulkLoading}
            />
          )}

          {/* Column headers */}
          <div className="grid grid-cols-[32px_2.5fr_1fr_1fr_0.9fr_1.1fr_0.8fr_80px] gap-3 px-4 py-2.5 border-b border-ltb bg-ltbg">
            {/* Select all */}
            <div
              className="flex items-center justify-center cursor-pointer"
              onClick={toggleSelectAll}
              title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-brand-cyan" />
                : <Square className="w-4 h-4 text-lttm" />
              }
            </div>
            {['Tarea', 'Sistema', 'Asignado', 'Prioridad', 'Estado', 'Vencimiento', ''].map((col, i) => (
              <span key={i} className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-lttm">
              <ListTodo className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-sora text-[13px]">
                {tasks.length === 0 ? 'No hay tareas aún' : 'No hay tareas con estos filtros'}
              </p>
              {tasks.length === 0 && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 font-sora text-[12px] text-brand-cyan hover:underline"
                >
                  Crear la primera tarea
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map(task => (
                <TaskListRow
                  key={task.id}
                  task={task}
                  selected={selectedIds.has(task.id)}
                  onToggleSelect={toggleSelect}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onOpenDetail={setSelectedTask}
                  deleting={deleting}
                />
              ))}
            </div>
          )}
        </div>
      </div>

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
