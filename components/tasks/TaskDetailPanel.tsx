'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { X, Save, Trash2, Loader2, ExternalLink, XCircle, Plus, CheckCircle2 } from 'lucide-react'
import type { TaskRow, TaskStatus, TaskPriority } from '@/lib/tasks/types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_SOURCE_LABELS } from '@/lib/tasks/types'
import { updateTaskAction, deleteTaskAction } from '@/app/(app)/tareas/actions'
import type { Member, System } from './CreateTaskModal'

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo:        'bg-ltbg text-lttm border-ltb',
  in_progress: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  blocked:     'bg-redim text-re border-reb',
  in_review:   'bg-ordim text-or border-orb',
  done:        'bg-grdim text-gr border-grb',
  cancelled:   'bg-ltbg text-lttm border-ltb',
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isOverdue(dateStr: string | null, status: TaskStatus): boolean {
  if (!dateStr || status === 'done' || status === 'cancelled') return false
  return dateStr < new Date().toISOString().split('T')[0]!
}

function getSourceHref(task: TaskRow): string | null {
  if (task.source_type === 'manual') return null
  if (task.source_type === 'evaluation' && task.system_id && task.source_id) {
    return `/inventario/${task.system_id}/fmea/${task.source_id}/evaluar`
  }
  if ((task.source_type === 'treatment_action' || task.source_type === 'fmea_item') && task.system_id) {
    return `/inventario/${task.system_id}/fmea`
  }
  if (task.source_type === 'gap') {
    return task.system_id ? `/inventario/${task.system_id}` : '/gaps'
  }
  return null
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">{children}</p>
}

function ChevronIcon() {
  return (
    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const selectCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none appearance-none pr-8 transition-all focus:border-brand-cyan cursor-pointer'

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  task: TaskRow
  members: Member[]
  systems: System[]
  onClose: () => void
  onUpdated: (updated: TaskRow) => void
  onDeleted: (taskId: string) => void
}

export function TaskDetailPanel({ task, members, systems, onClose, onUpdated, onDeleted }: Props) {
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [tags, setTags] = useState<string[]>(task.tags)
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateTaskAction(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        tags,
      })
      if ('error' in res) {
        setError(res.error)
      } else {
        onUpdated({
          ...task,
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          tags,
          assignee_name: members.find(m => m.id === assigneeId)?.full_name ?? task.assignee_name ?? null,
          updated_at: new Date().toISOString(),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTaskAction(task.id)
      if ('ok' in res) {
        onDeleted(task.id)
      } else {
        setError(res.error)
        setConfirmDelete(false)
      }
    })
  }

  function addTag(value: string) {
    const t = value.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const sourceHref = getSourceHref(task)
  const overdue = isOverdue(dueDate || null, status)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[65]"
        style={{ background: show ? 'rgba(0,0,0,0.15)' : 'transparent', transition: 'background 0.22s' }}
        onClick={onClose}
      />

      {/* Panel — starts below topbar (52px) + intel banner (50px) */}
      <div
        className="fixed right-0 bottom-0 z-[65] w-[460px] max-w-full bg-ltcard border-l border-ltb shadow-[-8px_0_40px_rgba(0,0,0,0.12)] flex flex-col"
        style={{
          top: '102px',
          transform: show ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ltb bg-ltcard2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[task.status]}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
            <span className="font-plex text-[9px] uppercase tracking-[0.5px] text-lttm bg-ltbg border border-ltb px-2 py-0.5 rounded-full shrink-0">
              {TASK_SOURCE_LABELS[task.source_type]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Title */}
          <div>
            <FieldLabel>Título</FieldLabel>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls + ' font-medium'}
              maxLength={300}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Estado</FieldLabel>
              <div className="relative">
                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={selectCls}>
                  {(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'] as TaskStatus[]).map(s => (
                    <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
            <div>
              <FieldLabel>Prioridad</FieldLabel>
              <div className="relative">
                <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className={selectCls}>
                  {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(p => (
                    <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Asignado a</FieldLabel>
              <div className="relative">
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={selectCls}>
                  <option value="">Sin asignar</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name || m.email || m.id.slice(0, 8)}</option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
            <div>
              <FieldLabel>
                Fecha límite
                {overdue && <span className="ml-1.5 text-re normal-case tracking-normal">· Vencida</span>}
              </FieldLabel>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={inputCls + (overdue ? ' border-reb text-re' : '')}
              />
            </div>
          </div>

          {/* Sistema (solo lectura) */}
          <div>
            <FieldLabel>Sistema IA</FieldLabel>
            <p className={`font-sora text-[13px] ${task.system_name ? 'text-ltt' : 'text-lttm italic'}`}>
              {task.system_name ?? 'Sin sistema'}
            </p>
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Descripción</FieldLabel>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputCls + ' resize-none h-20'}
              placeholder="Añade una descripción..."
            />
          </div>

          {/* Tags */}
          <div>
            <FieldLabel>Etiquetas</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                  {tag}
                  <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-re transition-colors ml-0.5">
                    <XCircle className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  onBlur={() => { if (tagInput) addTag(tagInput) }}
                  placeholder="Añadir etiqueta..."
                  className="bg-ltbg border border-dashed border-ltb rounded-full px-2.5 py-0.5 font-plex text-[10px] text-ltt outline-none w-28 focus:border-brand-cyan"
                />
                {tagInput && (
                  <button type="button" onClick={() => addTag(tagInput)} className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-cyan text-white shrink-0">
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Source link */}
          {sourceHref && (
            <div>
              <FieldLabel>Origen</FieldLabel>
              <Link href={sourceHref} className="inline-flex items-center gap-1.5 font-sora text-[12px] text-brand-cyan hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
                {TASK_SOURCE_LABELS[task.source_type]}
                {task.system_name ? ` · ${task.system_name}` : ''}
              </Link>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-ltb">
            <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm">Creada</p>
            <p className="font-sora text-[12px] text-ltt2 mt-0.5">{formatDate(task.created_at)}</p>
            {task.completed_at && (
              <>
                <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-gr mt-2">Completada</p>
                <p className="font-sora text-[12px] text-ltt2 mt-0.5">{formatDate(task.completed_at)}</p>
              </>
            )}
          </div>

          {error && (
            <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ltb bg-ltcard2 shrink-0 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50 shadow-[0_2px_8px_rgba(0,173,239,0.3)] transition-all"
          >
            {isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : saved
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <Save className="w-3.5 h-3.5" />
            }
            {saved ? 'Guardado' : 'Guardar cambios'}
          </button>

          <div className="ml-auto">
            {task.source_type === 'manual' && (
              <>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="font-sora text-[12px] text-re">¿Eliminar?</span>
                    <button
                      onClick={handleDelete}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-re text-white rounded-[8px] font-sora text-[12px] font-medium disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Sí, eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="font-sora text-[12px] text-ltt2 hover:text-ltt">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-re hover:bg-redim border border-transparent hover:border-reb transition-all font-sora text-[12px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
