'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  RefreshCw, Plus, Pencil, Trash2, Play, Loader2, X, Check,
  ChevronDown, Clock, Calendar, AlertCircle,
  CheckSquare2, User, Cpu, Tag, XCircle,
} from 'lucide-react'
import {
  createRecurrenceAction,
  updateRecurrenceAction,
  deleteRecurrenceAction,
  toggleRecurrenceAction,
  triggerRecurrenceNowAction,
  getRecurrenceRunsAction,
  type TaskRecurrence,
  type RecurrenceRun,
} from '@/app/(app)/tareas/actions'
import type { TaskPriority, RecurrenceFrequency } from '@/lib/tasks/types'
import {
  RECURRENCE_FREQUENCY_LABELS,
  DAY_OF_WEEK_LABELS,
  MONTH_LABELS,
} from '@/lib/tasks/types'
import type { Member, System } from './CreateTaskModal'

// ── Types ─────────────────────────────────────────────────────────────────────

type Template = { id: string; name: string; scope: string; checklist: unknown[] }

type FormState = {
  title:          string
  description:    string
  priority:       TaskPriority
  systemId:       string
  assigneeId:     string
  tags:           string[]
  templateId:     string
  frequency:      RecurrenceFrequency
  dayOfWeek:      string   // '0'..'6' | ''
  dayOfMonth:     string   // '1'..'31' | ''
  monthOfYear:    string   // '1'..'12' | ''
  dueOffsetDays:  string
}

const BLANK_FORM: FormState = {
  title:         '',
  description:   '',
  priority:      'medium',
  systemId:      '',
  assigneeId:    '',
  tags:          [],
  templateId:    '',
  frequency:     'monthly',
  dayOfWeek:     '0',
  dayOfMonth:    '1',
  monthOfYear:   '1',
  dueOffsetDays: '7',
}

function fromRecurrence(r: TaskRecurrence): FormState {
  return {
    title:         r.title,
    description:   r.description ?? '',
    priority:      r.priority,
    systemId:      r.system_id   ?? '',
    assigneeId:    r.assignee_id ?? '',
    tags:          r.tags,
    templateId:    r.template_id ?? '',
    frequency:     r.frequency,
    dayOfWeek:     r.day_of_week   != null ? String(r.day_of_week)   : '0',
    dayOfMonth:    r.day_of_month  != null ? String(r.day_of_month)  : '1',
    monthOfYear:   r.month_of_year != null ? String(r.month_of_year) : '1',
    dueOffsetDays: String(r.due_offset_days ?? 7),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
}

function formatDateTime(str: string | null): string {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function humanFrequency(r: TaskRecurrence): string {
  switch (r.frequency) {
    case 'daily':     return 'Cada día'
    case 'biweekly':  return 'Cada 2 semanas'
    case 'quarterly': return 'Cada trimestre'
    case 'weekly':
      return `Cada ${DAY_OF_WEEK_LABELS[r.day_of_week ?? 0]}`
    case 'monthly':
      return `El día ${r.day_of_month ?? 1} de cada mes`
    case 'annually':
      return `El ${r.day_of_month ?? 1} de ${MONTH_LABELS[(r.month_of_year ?? 1) - 1]}`
    default:          return RECURRENCE_FREQUENCY_LABELS[r.frequency]
  }
}

function isOverdue(nextRunAt: string | null): boolean {
  if (!nextRunAt) return false
  return new Date(nextRunAt) < new Date()
}

const inputCls  = 'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const selectCls = inputCls + ' appearance-none pr-8 cursor-pointer'
const labelCls  = 'block font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5'

function SelectArrow() {
  return <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" />
}

// ── Schedule preview ──────────────────────────────────────────────────────────

function ScheduleFields({
  form,
  setForm,
}: {
  form:    FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
}) {
  return (
    <>
      {/* Frequency */}
      <div>
        <label className={labelCls}>Frecuencia <span className="text-re">*</span></label>
        <div className="relative">
          <select
            value={form.frequency}
            onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as RecurrenceFrequency }))}
            className={selectCls}
          >
            {(Object.entries(RECURRENCE_FREQUENCY_LABELS) as [RecurrenceFrequency, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <SelectArrow />
        </div>
      </div>

      {/* Day of week — solo weekly */}
      {form.frequency === 'weekly' && (
        <div>
          <label className={labelCls}>Día de la semana</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_OF_WEEK_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setForm((p) => ({ ...p, dayOfWeek: String(idx) }))}
                className={`px-2.5 py-1 rounded-[6px] border font-sora text-[12px] transition-all ${
                  form.dayOfWeek === String(idx)
                    ? 'bg-brand-cyan text-white border-brand-cyan'
                    : 'bg-ltbg text-lttm border-ltb hover:border-brand-cyan'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day of month — monthly/annually */}
      {(form.frequency === 'monthly' || form.frequency === 'annually') && (
        <div>
          <label className={labelCls}>Día del mes</label>
          <div className="relative w-32">
            <input
              type="number"
              min={1} max={31}
              value={form.dayOfMonth}
              onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: e.target.value }))}
              className={inputCls}
            />
          </div>
          <p className="font-sora text-[10.5px] text-lttm mt-1">
            Si el mes tiene menos días se usará el último día disponible.
          </p>
        </div>
      )}

      {/* Month of year — annually */}
      {form.frequency === 'annually' && (
        <div>
          <label className={labelCls}>Mes del año</label>
          <div className="relative">
            <select
              value={form.monthOfYear}
              onChange={(e) => setForm((p) => ({ ...p, monthOfYear: e.target.value }))}
              className={selectCls}
            >
              {MONTH_LABELS.map((m, idx) => (
                <option key={idx+1} value={String(idx+1)}>{m}</option>
              ))}
            </select>
            <SelectArrow />
          </div>
        </div>
      )}

      {/* Due offset */}
      <div>
        <label className={labelCls}>Días hasta vencimiento</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={365}
            value={form.dueOffsetDays}
            onChange={(e) => setForm((p) => ({ ...p, dueOffsetDays: e.target.value }))}
            className={inputCls + ' w-24'}
          />
          <span className="font-sora text-[12px] text-lttm">días desde la creación</span>
        </div>
      </div>
    </>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────

function RecurrenceForm({
  initial,
  members,
  systems,
  templates,
  onSave,
  onCancel,
  title: formTitle,
}: {
  initial:   FormState
  members:   Member[]
  systems:   System[]
  templates: Template[]
  onSave:    (form: FormState) => Promise<void>
  onCancel:  () => void
  title:     string
}) {
  const [form,     setForm]     = useState<FormState>(initial)
  const [tagInput, setTagInput] = useState('')
  const [isPending, startT]     = useTransition()
  const [error,    setError]    = useState<string | null>(null)

  function addTag(value: string) {
    const t = value.trim().toLowerCase()
    if (t && !form.tags.includes(t)) setForm((p) => ({ ...p, tags: [...p.tags, t] }))
    setTagInput('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError(null)
    startT(async () => {
      try { await onSave(form) }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error desconocido') }
    })
  }

  const orgTemplates    = templates.filter((t) => t.scope !== 'system')
  const systemTemplates = templates.filter((t) => t.scope === 'system')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-xl bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-dim2 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-brand-cyan" />
            </div>
            <h2 className="font-sora text-[14px] font-semibold text-ltt">{formTitle}</h2>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb transition-colors text-lttm hover:text-ltt">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className={labelCls}>
              Título de la tarea <span className="text-re">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={inputCls}
              placeholder="Ej: Revisión mensual {{month}}"
              maxLength={300}
              required
              autoFocus
            />
            <p className="font-sora text-[10.5px] text-lttm mt-1">
              Variables: <code className="bg-ltbg px-1 rounded text-brand-cyan">{'{{date}}'}</code>{' '}
              <code className="bg-ltbg px-1 rounded text-brand-cyan">{'{{month}}'}</code>{' '}
              <code className="bg-ltbg px-1 rounded text-brand-cyan">{'{{year}}'}</code>{' '}
              <code className="bg-ltbg px-1 rounded text-brand-cyan">{'{{quarter}}'}</code>
            </p>
          </div>

          {/* Schedule fields */}
          <div className="bg-ltbg border border-ltb rounded-[10px] p-4 flex flex-col gap-4">
            <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm -mb-1">Programación</p>
            <ScheduleFields form={form} setForm={setForm} />
          </div>

          {/* Priority + Template */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="relative">
                <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as TaskPriority }))} className={selectCls}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>Plantilla (checklist)</label>
              <div className="relative">
                <select value={form.templateId} onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))} className={selectCls}>
                  <option value="">Sin plantilla</option>
                  {orgTemplates.length > 0 && (
                    <optgroup label="Mi organización">
                      {orgTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  )}
                  {systemTemplates.length > 0 && (
                    <optgroup label="Del sistema">
                      {systemTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  )}
                </select>
                <SelectArrow />
              </div>
              {form.templateId && (() => {
                const tpl = templates.find((t) => t.id === form.templateId)
                return tpl?.checklist?.length ? (
                  <p className="font-sora text-[10.5px] text-lttm mt-1">
                    {tpl.checklist.length} ítems de checklist por tarea
                  </p>
                ) : null
              })()}
            </div>
          </div>

          {/* System + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Sistema IA</label>
              <div className="relative">
                <select value={form.systemId} onChange={(e) => setForm((p) => ({ ...p, systemId: e.target.value }))} className={selectCls}>
                  <option value="">Sin sistema</option>
                  {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>Asignado a</label>
              <div className="relative">
                <select value={form.assigneeId} onChange={(e) => setForm((p) => ({ ...p, assigneeId: e.target.value }))} className={selectCls}>
                  <option value="">Sin asignar</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email || m.id.slice(0,8)}</option>)}
                </select>
                <SelectArrow />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className={inputCls + ' resize-none h-16'}
              placeholder="Descripción de la tarea generada (opcional)"
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Etiquetas</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {form.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                  {tag}
                  <button type="button" onClick={() => setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))}>
                    <XCircle className="w-3 h-3 hover:text-re" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                onBlur={() => { if (tagInput) addTag(tagInput) }}
                placeholder="Escribe y Enter…"
                className="bg-ltbg border border-dashed border-ltb rounded-full px-2.5 py-0.5 font-plex text-[10px] text-ltt outline-none focus:border-brand-cyan min-w-[120px]"
              />
            </div>
          </div>

          {error && (
            <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1 border-t border-ltb">
            <button type="button" onClick={onCancel} className="px-4 py-2 font-sora text-[13px] text-ltt2 hover:text-ltt transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !form.title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium disabled:opacity-50 transition-opacity"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Runs history panel ────────────────────────────────────────────────────────

function RunsHistory({ recurrenceId, onClose }: { recurrenceId: string; onClose: () => void }) {
  const [runs,    setRuns]    = useState<RecurrenceRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecurrenceRunsAction(recurrenceId, 15).then((data) => {
      setRuns(data)
      setLoading(false)
    })
  }, [recurrenceId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein max-h-[80vh] flex flex-col">
        <div className="bg-ltcard2 px-5 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px] shrink-0">
          <h3 className="font-sora text-[14px] font-semibold text-ltt">Historial de ejecuciones</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb text-lttm hover:text-ltt transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center font-sora text-[12px] text-lttm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
            </div>
          ) : runs.length === 0 ? (
            <p className="font-sora text-[12px] text-lttm italic text-center py-6">
              Sin ejecuciones registradas
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {runs.map((run) => (
                <div key={run.id} className="flex items-start gap-3 p-3 rounded-[8px] border border-ltb bg-ltbg">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    run.triggered_by === 'manual' ? 'bg-ordim border border-orb' : 'bg-cyan-dim border border-cyan-border'
                  }`}>
                    {run.triggered_by === 'manual'
                      ? <Play  className="w-2.5 h-2.5 text-or" />
                      : <Clock className="w-2.5 h-2.5 text-brand-cyan" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sora text-[12.5px] text-ltt truncate">
                      {run.task_title ?? '(tarea eliminada)'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-plex text-[9px] uppercase tracking-[0.5px] text-lttm">
                        {run.triggered_by === 'manual' ? 'Manual' : 'Automático'}
                      </span>
                      <span className="font-sora text-[10.5px] text-lttm">
                        {new Date(run.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {run.task_id && (
                    <Link
                      href="/tareas"
                      className="shrink-0 font-sora text-[11px] text-brand-cyan hover:underline"
                    >
                      Ver →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Recurrence card ───────────────────────────────────────────────────────────

function RecurrenceCard({
  rec,
  onEdit,
  onDelete,
  onToggle,
  onTrigger,
  onShowHistory,
}: {
  rec:            TaskRecurrence
  onEdit:         () => void
  onDelete:       () => void
  onToggle:       () => void
  onTrigger:      () => void
  onShowHistory:  () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending,     _startT]          = useTransition()
  const overdue = isOverdue(rec.next_run_at) && rec.active

  return (
    <div className={`bg-ltcard border rounded-[12px] transition-shadow hover:shadow-sm overflow-hidden ${
      rec.active ? 'border-ltb' : 'border-dashed border-ltb opacity-60'
    }`}>
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-[10px] border flex items-center justify-center shrink-0 mt-0.5 ${
          rec.active ? 'bg-cyan-dim border-cyan-border' : 'bg-ltbg border-ltb'
        }`}>
          <RefreshCw className={`w-4 h-4 ${rec.active ? 'text-brand-cyan' : 'text-lttm'}`} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sora text-[13px] font-medium text-ltt">{rec.title}</span>
            <span className={`inline-block font-plex text-[8px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[rec.priority]}`}>
              {PRIORITY_LABELS[rec.priority]}
            </span>
            {!rec.active && (
              <span className="inline-block font-plex text-[8px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border border-ltb bg-ltbg text-lttm">
                Pausada
              </span>
            )}
          </div>

          {/* Schedule info */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1 font-sora text-[11.5px] text-lttm">
              <Calendar className="w-3 h-3" />
              {humanFrequency(rec)}
            </div>
            {rec.next_run_at && (
              <div className={`flex items-center gap-1 font-sora text-[11.5px] ${overdue ? 'text-re' : 'text-lttm'}`}>
                {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                Próxima: {formatDateTime(rec.next_run_at)}
              </div>
            )}
            {rec.last_run_at && (
              <span className="font-sora text-[11px] text-lttm">
                Última: {formatDateTime(rec.last_run_at)}
              </span>
            )}
          </div>

          {/* Metadata chips */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {rec.system_name && (
              <span className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltbg border border-ltb text-lttm rounded-full">
                <Cpu className="w-2.5 h-2.5" /> {rec.system_name}
              </span>
            )}
            {rec.assignee_name && (
              <span className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltbg border border-ltb text-lttm rounded-full">
                <User className="w-2.5 h-2.5" /> {rec.assignee_name}
              </span>
            )}
            {rec.template_name && (
              <span className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-cyan-dim border border-cyan-border text-brand-cyan rounded-full">
                <CheckSquare2 className="w-2.5 h-2.5" /> {rec.template_name}
              </span>
            )}
            {rec.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltbg border border-ltb text-lttm rounded-full">
                <Tag className="w-2 h-2" /> {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {/* Toggle active */}
          <button
            onClick={onToggle}
            title={rec.active ? 'Pausar' : 'Activar'}
            className={`relative w-9 h-5 rounded-full border transition-all ${
              rec.active ? 'bg-brand-cyan border-brand-cyan' : 'bg-ltbg border-ltb'
            }`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
              rec.active ? 'left-[18px]' : 'left-0.5'
            }`} />
          </button>

          {/* Trigger now */}
          <button
            onClick={onTrigger}
            disabled={isPending}
            title="Ejecutar ahora"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-gr hover:bg-grdim transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* History */}
          <button
            onClick={onShowHistory}
            title="Historial"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            title="Editar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => setConfirmDelete(true)}
            title="Eliminar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-re hover:bg-redim transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="border-t border-reb bg-redim px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-sora text-[12.5px] text-re">
            ¿Eliminar <strong>{rec.title}</strong>? Se perderá el historial.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-re text-white rounded-[6px] font-sora text-[12px] font-medium"
            >
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 font-sora text-[12px] text-ltt2 hover:text-ltt transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

type Props = {
  recurrences: TaskRecurrence[]
  members:     Member[]
  systems:     System[]
  templates:   Template[]
}

export function RecurrentTasksView({ recurrences: initial, members, systems, templates }: Props) {
  const [recurrences,  setRecurrences]  = useState<TaskRecurrence[]>(initial)
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<TaskRecurrence | null>(null)
  const [historyFor,   setHistoryFor]   = useState<string | null>(null)
  const [triggerMsg,   setTriggerMsg]   = useState<{ id: string; msg: string } | null>(null)
  const [_isPending,   startT]          = useTransition()

  const active   = recurrences.filter((r) => r.active)
  const inactive = recurrences.filter((r) => !r.active)

  async function handleCreate(form: FormState) {
    const res = await createRecurrenceAction({
      title:          form.title,
      description:    form.description || null,
      priority:       form.priority,
      systemId:       form.systemId     || null,
      assigneeId:     form.assigneeId   || null,
      tags:           form.tags,
      templateId:     form.templateId   || null,
      frequency:      form.frequency,
      dayOfWeek:      form.dayOfWeek     ? parseInt(form.dayOfWeek)     : null,
      dayOfMonth:     form.dayOfMonth    ? parseInt(form.dayOfMonth)    : null,
      monthOfYear:    form.monthOfYear   ? parseInt(form.monthOfYear)   : null,
      dueOffsetDays:  form.dueOffsetDays ? parseInt(form.dueOffsetDays) : 7,
    })
    if ('error' in res) throw new Error(res.error)
    // Reload: simple page reload to get server-computed next_run_at
    window.location.reload()
  }

  async function handleEdit(form: FormState) {
    if (!editTarget) return
    const res = await updateRecurrenceAction(editTarget.id, {
      title:          form.title,
      description:    form.description || null,
      priority:       form.priority,
      systemId:       form.systemId     || null,
      assigneeId:     form.assigneeId   || null,
      tags:           form.tags,
      templateId:     form.templateId   || null,
      frequency:      form.frequency,
      dayOfWeek:      form.dayOfWeek     ? parseInt(form.dayOfWeek)     : null,
      dayOfMonth:     form.dayOfMonth    ? parseInt(form.dayOfMonth)    : null,
      monthOfYear:    form.monthOfYear   ? parseInt(form.monthOfYear)   : null,
      dueOffsetDays:  form.dueOffsetDays ? parseInt(form.dueOffsetDays) : 7,
    })
    if ('error' in res) throw new Error(res.error)
    window.location.reload()
  }

  function handleDelete(id: string) {
    startT(async () => {
      await deleteRecurrenceAction(id)
      setRecurrences((prev) => prev.filter((r) => r.id !== id))
    })
  }

  function handleToggle(rec: TaskRecurrence) {
    startT(async () => {
      const res = await toggleRecurrenceAction(rec.id)
      if ('active' in res) {
        setRecurrences((prev) => prev.map((r) => r.id === rec.id ? { ...r, active: res.active } : r))
      }
    })
  }

  function handleTrigger(rec: TaskRecurrence) {
    startT(async () => {
      const res = await triggerRecurrenceNowAction(rec.id)
      if ('taskId' in res) {
        setTriggerMsg({ id: rec.id, msg: '✓ Tarea creada correctamente' })
        setRecurrences((prev) => prev.map((r) =>
          r.id === rec.id ? { ...r, last_run_at: new Date().toISOString() } : r
        ))
        setTimeout(() => setTriggerMsg(null), 3000)
      } else {
        setTriggerMsg({ id: rec.id, msg: `Error: ${res.error}` })
        setTimeout(() => setTriggerMsg(null), 4000)
      }
    })
  }

  return (
    <>
      <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-6 animate-fadein pb-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <nav className="flex items-center gap-1.5 mb-1 font-sora text-[12px]">
              <Link href="/tareas" className="text-lttm hover:text-ltt transition-colors">Tareas</Link>
              <span className="text-lttm">/</span>
              <span className="text-ltt">Recurrentes</span>
            </nav>
            <h1 className="font-sora text-[20px] font-bold text-ltt flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-brand-cyan" />
              Tareas recurrentes
            </h1>
            <p className="font-sora text-[12.5px] text-lttm mt-1">
              Tareas que se crean automáticamente según una programación. Procesadas cada hora.
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nueva recurrencia
          </button>
        </div>

        {/* Active */}
        {active.length > 0 && (
          <section>
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3 flex items-center gap-2">
              Activas
              <span className="font-plex text-[9px] bg-cyan-dim border border-cyan-border text-brand-cyan rounded-full px-1.5 py-0.5">{active.length}</span>
            </p>
            <div className="flex flex-col gap-3">
              {active.map((rec) => (
                <div key={rec.id}>
                  <RecurrenceCard
                    rec={rec}
                    onEdit={() => { setEditTarget(rec); setShowForm(true) }}
                    onDelete={() => handleDelete(rec.id)}
                    onToggle={() => handleToggle(rec)}
                    onTrigger={() => handleTrigger(rec)}
                    onShowHistory={() => setHistoryFor(rec.id)}
                  />
                  {triggerMsg?.id === rec.id && (
                    <p className={`mt-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] ${
                      triggerMsg.msg.startsWith('✓')
                        ? 'bg-grdim border border-grb text-gr'
                        : 'bg-redim border border-reb text-re'
                    }`}>
                      {triggerMsg.msg}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Inactive */}
        {inactive.length > 0 && (
          <section>
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Pausadas</p>
            <div className="flex flex-col gap-3">
              {inactive.map((rec) => (
                <RecurrenceCard
                  key={rec.id}
                  rec={rec}
                  onEdit={() => { setEditTarget(rec); setShowForm(true) }}
                  onDelete={() => handleDelete(rec.id)}
                  onToggle={() => handleToggle(rec)}
                  onTrigger={() => handleTrigger(rec)}
                  onShowHistory={() => setHistoryFor(rec.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {recurrences.length === 0 && (
          <div className="bg-ltcard border border-dashed border-ltb rounded-[12px] p-10 text-center">
            <RefreshCw className="w-8 h-8 text-lttm mx-auto mb-3" />
            <p className="font-sora text-[13px] font-medium text-ltt">Sin tareas recurrentes</p>
            <p className="font-sora text-[12px] text-lttm mt-1 mb-5">
              Las tareas recurrentes se crean automáticamente según la programación que definas.
            </p>
            <button
              onClick={() => { setEditTarget(null); setShowForm(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ltbg border border-ltb rounded-[8px] font-sora text-[12.5px] text-ltt hover:border-brand-cyan hover:text-brand-cyan transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva recurrencia
            </button>
          </div>
        )}

        {/* pg_cron info box */}
        <div className="bg-ltbg border border-ltb rounded-[10px] px-4 py-3 flex items-start gap-3">
          <Clock className="w-4 h-4 text-lttm shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[12px] text-ltt2">
              <strong className="text-ltt">Procesamiento automático:</strong>{' '}
              el motor de recurrencias ejecuta la función <code className="bg-ltcard border border-ltb px-1 rounded text-brand-cyan text-[11px]">fluxion.process_task_recurrences()</code>{' '}
              cada hora (minuto 5) vía <strong>pg_cron</strong>.
            </p>
            <p className="font-sora text-[11.5px] text-lttm mt-1">
              Si pg_cron no está habilitado, usa el botón <Play className="inline w-3 h-3" /> para disparar manualmente.
            </p>
          </div>
        </div>
      </div>

      {/* Create/edit form modal */}
      {showForm && (
        <RecurrenceForm
          initial={editTarget ? fromRecurrence(editTarget) : BLANK_FORM}
          members={members}
          systems={systems}
          templates={templates}
          title={editTarget ? `Editar: ${editTarget.title}` : 'Nueva recurrencia'}
          onSave={editTarget ? handleEdit : handleCreate}
          onCancel={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {/* Runs history modal */}
      {historyFor && (
        <RunsHistory recurrenceId={historyFor} onClose={() => setHistoryFor(null)} />
      )}
    </>
  )
}
