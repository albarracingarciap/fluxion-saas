'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Plus, Loader2, XCircle, LayoutTemplate, ChevronRight, Check } from 'lucide-react'
import {
  createTaskAction,
  createTaskFromTemplateAction,
  getTemplatesAction,
  type TaskTemplate,
} from '@/app/(app)/tareas/actions'
import type { TaskPriority } from '@/lib/tasks/types'

export type Member = { id: string; full_name: string; email?: string }
export type System = { id: string; name: string }

type Props = {
  members:   Member[]
  systems:   System[]
  onClose:   () => void
  onCreated?: () => void
}

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const selectCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none appearance-none pr-8 cursor-pointer transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const labelCls = 'block font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
}

function SelectArrow() {
  return (
    <svg
      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// ── Template picker step ──────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  loading,
  onSelect,
  onSkip,
}: {
  templates: TaskTemplate[]
  loading:   boolean
  onSelect:  (tpl: TaskTemplate) => void
  onSkip:    () => void
}) {
  const system   = templates.filter((t) => t.scope === 'system')
  const org      = templates.filter((t) => t.scope !== 'system')

  function TemplateCard({ tpl }: { tpl: TaskTemplate }) {
    const checkCount = tpl.checklist.length
    return (
      <button
        type="button"
        onClick={() => onSelect(tpl)}
        className="w-full text-left flex items-start gap-3 p-3 rounded-[10px] border border-ltb bg-ltbg hover:border-brand-cyan hover:bg-cyan-dim transition-all group"
      >
        <div className="mt-0.5 w-7 h-7 rounded-[8px] bg-ltcard border border-ltb flex items-center justify-center shrink-0 group-hover:border-brand-cyan group-hover:bg-cyan-dim2 transition-all">
          <LayoutTemplate className="w-3.5 h-3.5 text-lttm group-hover:text-brand-cyan transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sora text-[12.5px] font-medium text-ltt truncate">{tpl.name}</p>
          {tpl.description && (
            <p className="font-sora text-[11px] text-lttm mt-0.5 line-clamp-2">{tpl.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-block font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[tpl.default_priority]}`}>
              {PRIORITY_LABELS[tpl.default_priority]}
            </span>
            {checkCount > 0 && (
              <span className="font-plex text-[9px] uppercase tracking-[0.5px] text-lttm bg-ltcard border border-ltb px-1.5 py-0.5 rounded-full">
                {checkCount} ítems
              </span>
            )}
            {tpl.default_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltcard border border-ltb text-lttm rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-lttm group-hover:text-brand-cyan shrink-0 mt-1 transition-colors" />
      </button>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <p className="font-sora text-[12.5px] text-lttm">
        Selecciona una plantilla para pre-rellenar los campos de la tarea.
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-lttm font-sora text-[12px]">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando plantillas…
        </div>
      ) : (
        <>
          {org.length > 0 && (
            <div>
              <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm mb-2">Mi organización</p>
              <div className="flex flex-col gap-2">
                {org.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} />)}
              </div>
            </div>
          )}
          {system.length > 0 && (
            <div>
              <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm mb-2">Plantillas del sistema</p>
              <div className="flex flex-col gap-2">
                {system.map((tpl) => <TemplateCard key={tpl.id} tpl={tpl} />)}
              </div>
            </div>
          )}
          {templates.length === 0 && (
            <p className="font-sora text-[12px] text-lttm italic text-center py-4">
              No hay plantillas disponibles.
            </p>
          )}
        </>
      )}

      <div className="flex justify-between pt-2 border-t border-ltb">
        <button
          type="button"
          onClick={onSkip}
          className="font-sora text-[12.5px] text-lttm hover:text-ltt transition-colors"
        >
          Continuar sin plantilla →
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Mode = 'choose' | 'template-pick' | 'form'

export function CreateTaskModal({ members, systems, onClose, onCreated }: Props) {
  const [mode,        setMode]        = useState<Mode>('choose')
  const [selectedTpl, setSelectedTpl] = useState<TaskTemplate | null>(null)
  const [templates,   setTemplates]   = useState<TaskTemplate[]>([])
  const [loadingTpls, setLoadingTpls] = useState(false)

  // Form state
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority,    setPriority]    = useState<TaskPriority>('medium')
  const [systemId,    setSystemId]    = useState('')
  const [assigneeId,  setAssigneeId]  = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [tags,        setTags]        = useState<string[]>([])
  const [tagInput,    setTagInput]    = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  // Load templates when user clicks "Desde plantilla"
  function openTemplatePicker() {
    setMode('template-pick')
    if (templates.length === 0) {
      setLoadingTpls(true)
      getTemplatesAction().then((data) => {
        setTemplates(data)
        setLoadingTpls(false)
      })
    }
  }

  function handleSelectTemplate(tpl: TaskTemplate) {
    setSelectedTpl(tpl)
    // Pre-fill form from template
    setTitle(tpl.name)
    setDescription('')
    setPriority(tpl.default_priority)
    setTags([...tpl.default_tags])
    setMode('form')
  }

  function handleSkipTemplate() {
    setSelectedTpl(null)
    setMode('form')
  }

  function addTag(value: string) {
    const t = value.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      let result: { id: string } | { error: string }

      if (selectedTpl) {
        result = await createTaskFromTemplateAction(selectedTpl.id, {
          title:      title.trim(),
          systemId:   systemId   || null,
          assigneeId: assigneeId || null,
          dueDate:    dueDate    || null,
        })
      } else {
        result = await createTaskAction({
          title:       title.trim(),
          description: description.trim() || null,
          priority,
          systemId:    systemId   || null,
          assigneeId:  assigneeId || null,
          dueDate:     dueDate    || null,
          tags,
        })
      }

      if ('error' in result) {
        setError(result.error)
      } else {
        onCreated?.()
        onClose()
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  // ── Choose screen ────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-sm bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein">
          <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px]">
            <h2 className="font-sora text-[14px] font-semibold text-ltt">Crear tarea</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb transition-colors text-lttm hover:text-ltt">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode('form')}
              className="w-full flex items-center gap-3 p-4 rounded-[10px] border border-ltb bg-ltbg hover:border-brand-cyan hover:bg-cyan-dim transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-[10px] bg-ltcard border border-ltb flex items-center justify-center shrink-0 group-hover:border-brand-cyan group-hover:bg-cyan-dim2 transition-all">
                <Plus className="w-4 h-4 text-lttm group-hover:text-brand-cyan transition-colors" />
              </div>
              <div>
                <p className="font-sora text-[13px] font-medium text-ltt">Tarea en blanco</p>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5">Crea una tarea nueva desde cero</p>
              </div>
            </button>
            <button
              type="button"
              onClick={openTemplatePicker}
              className="w-full flex items-center gap-3 p-4 rounded-[10px] border border-ltb bg-ltbg hover:border-brand-cyan hover:bg-cyan-dim transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-[10px] bg-ltcard border border-ltb flex items-center justify-center shrink-0 group-hover:border-brand-cyan group-hover:bg-cyan-dim2 transition-all">
                <LayoutTemplate className="w-4 h-4 text-lttm group-hover:text-brand-cyan transition-colors" />
              </div>
              <div>
                <p className="font-sora text-[13px] font-medium text-ltt">Desde plantilla</p>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5">Usa una plantilla con checklist predefinido</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Template pick screen ─────────────────────────────────────────────────────
  if (mode === 'template-pick') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein max-h-[90vh] flex flex-col">
          <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px] shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setMode('choose')} className="w-6 h-6 flex items-center justify-center rounded text-lttm hover:text-ltt transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <h2 className="font-sora text-[14px] font-semibold text-ltt">Elegir plantilla</h2>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb transition-colors text-lttm hover:text-ltt">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <TemplatePicker
              templates={templates}
              loading={loadingTpls}
              onSelect={handleSelectTemplate}
              onSkip={handleSkipTemplate}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Form screen ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode(selectedTpl ? 'template-pick' : 'choose')} className="w-6 h-6 flex items-center justify-center rounded text-lttm hover:text-ltt transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div className="w-7 h-7 rounded-lg bg-cyan-dim2 flex items-center justify-center">
              {selectedTpl ? <LayoutTemplate className="w-3.5 h-3.5 text-brand-cyan" /> : <Plus className="w-3.5 h-3.5 text-brand-cyan" />}
            </div>
            <div>
              <h2 className="font-sora text-[14px] font-semibold text-ltt">
                {selectedTpl ? 'Nueva tarea desde plantilla' : 'Nueva tarea'}
              </h2>
              {selectedTpl && (
                <p className="font-sora text-[11px] text-lttm -mt-0.5">
                  Plantilla: <span className="text-brand-cyan">{selectedTpl.name}</span>
                  {selectedTpl.checklist.length > 0 && (
                    <span className="ml-1 text-lttm">· {selectedTpl.checklist.length} ítems de checklist</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb transition-colors text-lttm hover:text-ltt">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Template checklist preview */}
          {selectedTpl && selectedTpl.checklist.length > 0 && (
            <div className="bg-ltbg border border-ltb rounded-[10px] px-3.5 py-3">
              <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm mb-2">
                Checklist de la plantilla ({selectedTpl.checklist.length} ítems)
              </p>
              <div className="flex flex-col gap-1">
                {selectedTpl.checklist.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-lttm shrink-0" />
                    <span className="font-sora text-[11.5px] text-lttm truncate">{item.label}</span>
                    {item.required && <span className="shrink-0 font-plex text-[8px] uppercase tracking-[0.5px] text-re bg-redim border border-reb px-1 py-0.5 rounded-full">requerido</span>}
                  </div>
                ))}
                {selectedTpl.checklist.length > 5 && (
                  <p className="font-sora text-[11px] text-lttm italic">
                    …y {selectedTpl.checklist.length - 5} más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelCls}>
              Título <span className="text-re">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Describe la tarea..."
              maxLength={300}
              required
              autoFocus
            />
          </div>

          {/* Description (only when NOT from template — template uses its own description) */}
          {!selectedTpl && (
            <div>
              <label className={labelCls}>Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + ' resize-none h-20'}
                placeholder="Detalles adicionales (opcional)"
              />
            </div>
          )}

          {/* Priority + System */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className={selectCls}
                  disabled={!!selectedTpl}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
                <SelectArrow />
              </div>
              {selectedTpl && (
                <p className="font-sora text-[10px] text-lttm mt-1">Heredada de la plantilla</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Sistema IA</label>
              <div className="relative">
                <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className={selectCls}>
                  <option value="">Sin sistema</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Asignado a</label>
              <div className="relative">
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={selectCls}>
                  <option value="">Sin asignar</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name || m.email || m.id.slice(0, 8)}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>Fecha límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
                min={today}
              />
            </div>
          </div>

          {/* Tags — only when NOT from template */}
          {!selectedTpl && (
            <div>
              <label className={labelCls}>Etiquetas</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-re transition-colors ml-0.5">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                  }}
                  onBlur={() => { if (tagInput) addTag(tagInput) }}
                  placeholder="Escribe y pulsa Enter..."
                  className="bg-ltbg border border-dashed border-ltb rounded-full px-2.5 py-0.5 font-plex text-[10px] text-ltt outline-none focus:border-brand-cyan min-w-[140px]"
                />
              </div>
            </div>
          )}

          {selectedTpl && tags.length > 0 && (
            <div>
              <label className={labelCls}>Etiquetas de la plantilla</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="inline-block font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-sora text-[13px] text-ltt2 hover:text-ltt transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Crear tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
