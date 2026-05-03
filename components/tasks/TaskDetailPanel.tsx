'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  X, Save, Trash2, Loader2, ExternalLink, XCircle, Plus, CheckCircle2,
  LayoutGrid, MessageSquare, Activity, Paperclip, Eye, EyeOff,
} from 'lucide-react'
import type { TaskRow, TaskStatus, TaskPriority } from '@/lib/tasks/types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_SOURCE_LABELS } from '@/lib/tasks/types'
import {
  updateTaskAction,
  deleteTaskAction,
  getTaskGapLinksAction,
  getWatchersAction,
  toggleWatchAction,
  type WatcherRow,
} from '@/app/(app)/tareas/actions'
import { TaskComments }    from './TaskComments'
import { TaskActivity }    from './TaskActivity'
import { TaskAttachments } from './TaskAttachments'
import type { Member, System } from './CreateTaskModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const GAP_LAYER_LABELS: Record<string, string> = {
  normativo: 'Normativo',
  fmea:      'FMEA',
  control:   'Control',
  caducidad: 'Caducidad',
}

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

type DetailTab = 'comments' | 'activity' | 'attachments'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (task.source_type === 'evaluation' && task.system_id && task.source_id)
    return `/inventario/${task.system_id}/fmea/${task.source_id}/evaluar`
  if ((task.source_type === 'treatment_action' || task.source_type === 'fmea_item') && task.system_id)
    return `/inventario/${task.system_id}/fmea`
  if (task.source_type === 'gap' && task.source_id)
    return `/gaps?focus=${task.source_id}`
  if (task.source_type === 'gap_group')
    return '/gaps'
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

const inputCls  = 'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const selectCls = 'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none appearance-none pr-8 transition-all focus:border-brand-cyan cursor-pointer'

// ── Watchers sidebar ──────────────────────────────────────────────────────────

function WatchersSection({
  taskId,
  currentProfileId,
}: {
  taskId:           string
  currentProfileId: string
}) {
  const [watchers,  setWatchers]  = useState<WatcherRow[]>([])
  const [watching,  setWatching]  = useState(false)
  const [toggling,  setToggling]  = useState(false)

  const loadWatchers = useCallback(async () => {
    const data = await getWatchersAction(taskId)
    setWatchers(data)
    setWatching(data.some((w) => w.user_id === currentProfileId))
  }, [taskId, currentProfileId])

  useEffect(() => { void loadWatchers() }, [loadWatchers])

  async function handleToggle() {
    setToggling(true)
    const res = await toggleWatchAction(taskId)
    setToggling(false)
    if ('watching' in res) {
      setWatching(res.watching)
      void loadWatchers()
    }
  }

  function WatcherAvatar({ w }: { w: WatcherRow }) {
    const initials = (w.name ?? w.email ?? '?')
      .split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase()
    return (
      <div title={w.name ?? w.email ?? undefined} className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-brand-cyan to-brand-blue border border-ltb flex items-center justify-center shrink-0">
        {w.avatar_url
          ? <Image src={w.avatar_url} alt={w.name ?? ''} width={24} height={24} className="object-cover" unoptimized />
          : <span className="font-sora text-[9px] font-bold text-white">{initials}</span>
        }
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <FieldLabel>Seguidores ({watchers.length})</FieldLabel>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-1 text-[11px] font-sora px-2 py-1 rounded-[6px] border transition-colors ${
            watching
              ? 'border-brand-cyan text-brand-cyan bg-cyan-dim hover:bg-ltbg'
              : 'border-ltb text-lttm hover:border-brand-cyan hover:text-brand-cyan'
          }`}
        >
          {toggling
            ? <Loader2 size={10} className="animate-spin" />
            : watching
              ? <><EyeOff size={10} /> Dejar de seguir</>
              : <><Eye size={10} /> Seguir</>
          }
        </button>
      </div>
      {watchers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((w) => <WatcherAvatar key={w.user_id} w={w} />)}
        </div>
      ) : (
        <p className="font-sora text-[11.5px] text-lttm italic">Sin seguidores</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  task:             TaskRow
  members:          Member[]
  systems:          System[]
  currentProfileId: string
  onClose:          () => void
  onUpdated:        (updated: TaskRow) => void
  onDeleted:        (taskId: string) => void
}

export function TaskDetailPanel({
  task, members, systems, currentProfileId, onClose, onUpdated, onDeleted,
}: Props) {
  const [show,          setShow]          = useState(false)
  const [title,         setTitle]         = useState(task.title)
  const [description,   setDescription]   = useState(task.description ?? '')
  const [status,        setStatus]        = useState<TaskStatus>(task.status)
  const [priority,      setPriority]      = useState<TaskPriority>(task.priority)
  const [assigneeId,    setAssigneeId]    = useState(task.assignee_id ?? '')
  const [dueDate,       setDueDate]       = useState(task.due_date ?? '')
  const [tags,          setTags]          = useState<string[]>(task.tags)
  const [tagInput,      setTagInput]      = useState('')
  const [error,         setError]         = useState<string | null>(null)
  const [saved,         setSaved]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [activeTab,     setActiveTab]     = useState<DetailTab>('comments')
  const [isPending,     startTransition]  = useTransition()
  const [gapLinks,      setGapLinks]      = useState<Array<{
    gap_key: string; group_key: string | null; gap_layer: string; gap_source_id: string | null
  }>>([])
  const [loadingLinks, setLoadingLinks] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (task.source_type !== 'gap_group') return
    setLoadingLinks(true)
    getTaskGapLinksAction(task.id).then((links) => {
      setGapLinks(links)
      setLoadingLinks(false)
    })
  }, [task.id, task.source_type])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateTaskAction(task.id, {
        title:       title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigneeId:  assigneeId || null,
        dueDate:     dueDate || null,
        tags,
      })
      if ('error' in res) {
        setError(res.error)
      } else {
        onUpdated({
          ...task,
          title:         title.trim(),
          description:   description.trim() || null,
          status,
          priority,
          assignee_id:   assigneeId || null,
          due_date:      dueDate || null,
          tags,
          assignee_name: members.find((m) => m.id === assigneeId)?.full_name ?? task.assignee_name ?? null,
          updated_at:    new Date().toISOString(),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTaskAction(task.id)
      if ('ok' in res) onDeleted(task.id)
      else { setError(res.error); setConfirmDelete(false) }
    })
  }

  function addTag(value: string) {
    const t = value.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const sourceHref = getSourceHref(task)
  const overdue    = isOverdue(dueDate || null, status)

  const TABS: Array<{ key: DetailTab; label: string; icon: React.ReactNode }> = [
    { key: 'comments',    label: 'Comentarios', icon: <MessageSquare size={13} /> },
    { key: 'activity',    label: 'Actividad',   icon: <Activity      size={13} /> },
    { key: 'attachments', label: 'Adjuntos',    icon: <Paperclip     size={13} /> },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[65]"
        style={{ background: show ? 'rgba(0,0,0,0.15)' : 'transparent', transition: 'background 0.22s' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 bottom-0 z-[65] w-[500px] max-w-full bg-ltcard border-l border-ltb shadow-[-8px_0_40px_rgba(0,0,0,0.12)] flex flex-col"
        style={{
          top:       '102px',
          transform: show ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ltb bg-ltcard2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`shrink-0 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
              {TASK_STATUS_LABELS[status]}
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
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ── Fields section ── */}
          <div className="p-5 flex flex-col gap-4 border-b border-ltb">
            {/* Title */}
            <div>
              <FieldLabel>Título</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls + ' font-medium'}
                maxLength={300}
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Estado</FieldLabel>
                <div className="relative">
                  <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={selectCls}>
                    {(['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'] as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </div>
              <div>
                <FieldLabel>Prioridad</FieldLabel>
                <div className="relative">
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectCls}>
                    {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map((p) => (
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
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectCls}>
                    <option value="">Sin asignar</option>
                    {members.map((m) => (
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
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputCls + (overdue ? ' border-reb text-re' : '')}
                />
              </div>
            </div>

            {/* Sistema */}
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
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + ' resize-none h-20'}
                placeholder="Añade una descripción..."
              />
            </div>

            {/* Tags */}
            <div>
              <FieldLabel>Etiquetas</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-re transition-colors ml-0.5">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
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

            {/* Gaps cubiertos */}
            {task.source_type === 'gap_group' && (
              <div>
                <FieldLabel>
                  Gaps cubiertos
                  {gapLinks.length > 0 && (
                    <span className="ml-1.5 font-plex text-[9px] normal-case tracking-normal text-lttm">({gapLinks.length})</span>
                  )}
                </FieldLabel>
                {loadingLinks ? (
                  <div className="flex items-center gap-2 font-sora text-[12px] text-lttm">
                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando gaps…
                  </div>
                ) : gapLinks.length === 0 ? (
                  <p className="font-sora text-[12px] text-lttm italic">Sin vínculos registrados</p>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {gapLinks.map((link) => (
                      <div key={link.gap_key} className="flex items-center justify-between gap-2 rounded-[8px] border border-ltb bg-ltbg px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-plex text-[10px] uppercase tracking-[0.5px] text-lttm truncate">
                            {GAP_LAYER_LABELS[link.gap_layer] ?? link.gap_layer}
                          </p>
                          <p className="font-sora text-[11px] text-ltt2 mt-0.5 truncate">{link.gap_key}</p>
                        </div>
                        {link.gap_source_id && (
                          <Link href={`/gaps?focus=${link.gap_source_id}`} className="shrink-0 inline-flex items-center gap-1 font-sora text-[10px] text-brand-cyan hover:underline">
                            <LayoutGrid className="w-3 h-3" />
                            Ver
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Watchers */}
            <WatchersSection taskId={task.id} currentProfileId={currentProfileId} />

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

          {/* ── Tabs section (Comentarios / Actividad / Adjuntos) ── */}
          <div className="flex flex-col flex-1">
            {/* Tab nav */}
            <div className="flex border-b border-ltb bg-ltcard2 px-3 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 font-sora text-[12px] border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-brand-cyan text-brand-cyan'
                      : 'border-transparent text-lttm hover:text-ltt'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 p-5 overflow-y-auto">
              {activeTab === 'comments' && (
                <TaskComments
                  taskId={task.id}
                  members={members}
                  currentProfileId={currentProfileId}
                />
              )}
              {activeTab === 'activity' && (
                <TaskActivity taskId={task.id} />
              )}
              {activeTab === 'attachments' && (
                <TaskAttachments
                  taskId={task.id}
                  currentProfileId={currentProfileId}
                />
              )}
            </div>
          </div>
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
