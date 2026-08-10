'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  LayoutTemplate, Plus, Trash2, Pencil, X, Check, Loader2, ChevronDown, ChevronRight,
  CheckSquare2, Lock, Globe, User,
} from 'lucide-react'
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  type TaskTemplate,
  type TemplateChecklistItem,
} from '@/app/(app)/tareas/actions'
import type { TaskPriority } from '@/lib/tasks/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-ltbg text-lttm border-ltb',
  medium:   'bg-cyan-dim text-brand-cyan border-cyan-border',
  high:     'bg-ordim text-or border-orb',
  critical: 'bg-redim text-re border-reb',
}

const SCOPE_ICONS = {
  system:   <Lock   className="w-3 h-3" />,
  shared:   <Globe  className="w-3 h-3" />,
  personal: <User   className="w-3 h-3" />,
}

const SCOPE_LABELS = {
  system:   'Sistema',
  shared:   'Compartida',
  personal: 'Personal',
}

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const labelCls = 'block font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5'

// ── Checklist editor sub-component ────────────────────────────────────────────

function ChecklistEditor({
  items,
  onChange,
}: {
  items:    TemplateChecklistItem[]
  onChange: (items: TemplateChecklistItem[]) => void
}) {
  const [draft, setDraft] = useState('')

  function addItem() {
    const label = draft.trim()
    if (!label) return
    onChange([...items, { label, required: false }])
    setDraft('')
  }

  function updateItem(idx: number, patch: Partial<TemplateChecklistItem>) {
    onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="flex flex-col gap-1 mb-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            <CheckSquare2 className="w-3.5 h-3.5 text-lttm shrink-0" />
            <input
              value={item.label}
              onChange={(e) => updateItem(idx, { label: e.target.value })}
              className="flex-1 min-w-0 bg-ltbg border border-ltb rounded-[6px] px-2.5 py-1 font-sora text-[12px] text-ltt outline-none focus:border-brand-cyan"
            />
            <label className="flex items-center gap-1 font-sora text-[11px] text-lttm cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={item.required ?? false}
                onChange={(e) => updateItem(idx, { required: e.target.checked })}
                className="w-3.5 h-3.5 accent-brand-cyan"
              />
              Req.
            </label>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="w-5 h-5 flex items-center justify-center rounded text-lttm hover:text-re transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          placeholder="Nuevo ítem…"
          className="flex-1 min-w-0 bg-ltbg border border-dashed border-ltb rounded-[6px] px-2.5 py-1 font-sora text-[12px] text-ltt outline-none focus:border-brand-cyan"
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!draft.trim()}
          className="flex items-center gap-1 px-2.5 py-1 bg-brand-cyan text-white rounded-[6px] font-sora text-[11px] disabled:opacity-40 transition-all"
        >
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>
    </div>
  )
}

// ── Template form (create/edit) ───────────────────────────────────────────────

type FormState = {
  name:             string
  description:      string
  scope:            'personal' | 'shared'
  default_priority: TaskPriority
  default_tags:     string[]
  checklist:        TemplateChecklistItem[]
}

const BLANK_FORM: FormState = {
  name:             '',
  description:      '',
  scope:            'personal',
  default_priority: 'medium',
  default_tags:     [],
  checklist:        [],
}

function fromTemplate(tpl: TaskTemplate): FormState {
  return {
    name:             tpl.name,
    description:      tpl.description ?? '',
    scope:            tpl.scope === 'system' ? 'personal' : tpl.scope,
    default_priority: tpl.default_priority,
    default_tags:     tpl.default_tags,
    checklist:        tpl.checklist,
  }
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial:  FormState
  onSave:   (form: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [form,      setForm]      = useState<FormState>(initial)
  const [tagInput,  setTagInput]  = useState('')
  const [isPending, startT]       = useTransition()
  const [error,     setError]     = useState<string | null>(null)

  function addTag(value: string) {
    const t = value.trim().toLowerCase()
    if (t && !form.default_tags.includes(t))
      setForm((prev) => ({ ...prev, default_tags: [...prev.default_tags, t] }))
    setTagInput('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setError(null)
    startT(async () => {
      try { await onSave(form) }
      catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error desconocido') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name + Scope */}
      <div className="grid grid-cols-[1fr_150px] gap-3">
        <div>
          <label className={labelCls}>Nombre <span className="text-re">*</span></label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputCls}
            placeholder="Nombre de la plantilla"
            maxLength={200}
            required
            autoFocus
          />
        </div>
        <div>
          <label className={labelCls}>Visibilidad</label>
          <div className="relative">
            <select
              value={form.scope}
              onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value as 'personal' | 'shared' }))}
              className={inputCls + ' appearance-none pr-8 cursor-pointer'}
            >
              <option value="personal">Personal</option>
              <option value="shared">Compartida</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" />
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
          placeholder="Breve descripción (opcional)"
        />
      </div>

      {/* Priority + Tags */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Prioridad por defecto</label>
          <div className="relative">
            <select
              value={form.default_priority}
              onChange={(e) => setForm((p) => ({ ...p, default_priority: e.target.value as TaskPriority }))}
              className={inputCls + ' appearance-none pr-8 cursor-pointer'}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Etiquetas</label>
          <div className="flex flex-wrap gap-1 mb-1">
            {form.default_tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 bg-cyan-dim text-brand-cyan border border-cyan-border rounded-full">
                {tag}
                <button type="button" onClick={() => setForm((p) => ({ ...p, default_tags: p.default_tags.filter((t) => t !== tag) }))}>
                  <X className="w-2.5 h-2.5 hover:text-re" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
            onBlur={() => { if (tagInput) addTag(tagInput) }}
            placeholder="Añadir etiqueta…"
            className="w-full bg-ltbg border border-dashed border-ltb rounded-[6px] px-2.5 py-1 font-sora text-[11px] text-ltt outline-none focus:border-brand-cyan"
          />
        </div>
      </div>

      {/* Checklist */}
      <div>
        <label className={labelCls}>Checklist de la plantilla</label>
        <div className="bg-ltbg border border-ltb rounded-[10px] p-3">
          <ChecklistEditor
            items={form.checklist}
            onChange={(items) => setForm((p) => ({ ...p, checklist: items }))}
          />
        </div>
        <p className="font-sora text-[10.5px] text-lttm mt-1">
          Al crear una tarea desde esta plantilla se generarán estos ítems de checklist automáticamente.
        </p>
      </div>

      {error && (
        <p className="font-sora text-[12px] text-re bg-redim border border-reb rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1 border-t border-ltb">
        <button type="button" onClick={onCancel} className="px-4 py-2 font-sora text-[13px] text-ltt2 hover:text-ltt transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !form.name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium disabled:opacity-50 transition-opacity"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Guardar plantilla
        </button>
      </div>
    </form>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  tpl,
  onEdit,
  onDelete,
  isOwner,
}: {
  tpl:     TaskTemplate
  onEdit:  () => void
  onDelete: () => void
  isOwner: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] overflow-hidden transition-shadow hover:shadow-sm">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-[8px] bg-ltbg border border-ltb flex items-center justify-center shrink-0 mt-0.5">
          <LayoutTemplate className="w-4 h-4 text-lttm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sora text-[13px] font-medium text-ltt">{tpl.name}</span>
            <span className={`inline-flex items-center gap-1 font-plex text-[8px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[tpl.default_priority]}`}>
              {PRIORITY_LABELS[tpl.default_priority]}
            </span>
            <span className="inline-flex items-center gap-1 font-plex text-[8px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border border-ltb bg-ltbg text-lttm">
              {SCOPE_ICONS[tpl.scope]}
              {SCOPE_LABELS[tpl.scope]}
            </span>
          </div>

          {tpl.description && (
            <p className="font-sora text-[11.5px] text-lttm mt-1 line-clamp-2">{tpl.description}</p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {tpl.default_tags.map((tag) => (
              <span key={tag} className="font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltbg border border-ltb text-lttm rounded-full">
                {tag}
              </span>
            ))}
            {tpl.checklist.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] px-1.5 py-0.5 bg-ltbg border border-ltb text-lttm rounded-full hover:border-brand-cyan hover:text-brand-cyan transition-colors"
              >
                <CheckSquare2 className="w-2.5 h-2.5" />
                {tpl.checklist.length} ítems
                {expanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Actions — only for owner (non-system) */}
        {isOwner && tpl.scope !== 'system' && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-lttm hover:text-re hover:bg-redim transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Checklist expandido */}
      {expanded && tpl.checklist.length > 0 && (
        <div className="border-t border-ltb bg-ltbg px-4 py-3">
          <p className="font-plex text-[9px] uppercase tracking-[0.7px] text-lttm mb-2">Checklist</p>
          <div className="flex flex-col gap-1.5">
            {tpl.checklist.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckSquare2 className="w-3.5 h-3.5 text-lttm shrink-0 mt-0.5" />
                <span className="font-sora text-[12px] text-ltt2">{item.label}</span>
                {item.required && (
                  <span className="shrink-0 font-plex text-[8px] uppercase tracking-[0.5px] text-re bg-redim border border-reb px-1 py-0.5 rounded-full">
                    req.
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'create' | 'edit'

export function PlantillasView({ templates: initial }: { templates: TaskTemplate[] }) {
  const [templates,    setTemplates]    = useState<TaskTemplate[]>(initial)
  const [mode,         setMode]         = useState<ViewMode>('list')
  const [editTarget,   setEditTarget]   = useState<TaskTemplate | null>(null)
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)
  const [isPending,    startT]          = useTransition()

  // Separate system templates from org templates
  const systemTpls = templates.filter((t) => t.scope === 'system')
  const orgTpls    = templates.filter((t) => t.scope !== 'system')

  async function handleCreate(form: FormState) {
    const res = await createTemplateAction({
      name:             form.name,
      description:      form.description || null,
      scope:            form.scope,
      default_priority: form.default_priority,
      default_tags:     form.default_tags,
      checklist:        form.checklist,
    })
    if ('error' in res) throw new Error(res.error)
    // Optimistic: add a placeholder and reload by navigation
    const newTpl: TaskTemplate = {
      id:               res.id,
      organization_id:  null,
      owner_id:         null,
      scope:            form.scope,
      name:             form.name,
      description:      form.description || null,
      default_priority: form.default_priority,
      default_tags:     form.default_tags,
      checklist:        form.checklist,
      is_archived:      false,
      created_at:       new Date().toISOString(),
    }
    setTemplates((prev) => [...prev, newTpl])
    setMode('list')
  }

  async function handleEdit(form: FormState) {
    if (!editTarget) return
    const res = await updateTemplateAction(editTarget.id, {
      name:             form.name,
      description:      form.description || null,
      scope:            form.scope,
      default_priority: form.default_priority,
      default_tags:     form.default_tags,
      checklist:        form.checklist,
    })
    if ('error' in res) throw new Error(res.error)
    setTemplates((prev) => prev.map((t) =>
      t.id === editTarget.id
        ? { ...t, ...form, description: form.description || null }
        : t
    ))
    setEditTarget(null)
    setMode('list')
  }

  function handleDelete(id: string) {
    startT(async () => {
      await deleteTemplateAction(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      setConfirmDelId(null)
    })
  }

  // ── Create / Edit form ───────────────────────────────────────────────────────
  if (mode !== 'list') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-6 font-sora text-[12px]">
          <Link href="/tareas" className="text-lttm hover:text-ltt transition-colors">Tareas</Link>
          <span className="text-lttm">/</span>
          <button onClick={() => { setMode('list'); setEditTarget(null) }} className="text-lttm hover:text-ltt transition-colors">
            Plantillas
          </button>
          <span className="text-lttm">/</span>
          <span className="text-ltt">{mode === 'create' ? 'Nueva plantilla' : 'Editar plantilla'}</span>
        </nav>

        <div className="bg-ltcard border border-ltb rounded-[14px] p-6">
          <h1 className="font-sora text-[16px] font-semibold text-ltt mb-6">
            {mode === 'create' ? 'Nueva plantilla' : `Editar: ${editTarget?.name}`}
          </h1>
          <TemplateForm
            initial={mode === 'create' ? BLANK_FORM : fromTemplate(editTarget!)}
            onSave={mode === 'create' ? handleCreate : handleEdit}
            onCancel={() => { setMode('list'); setEditTarget(null) }}
          />
        </div>
      </div>
    )
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <nav className="flex items-center gap-1.5 mb-1 font-sora text-[12px]">
            <Link href="/tareas" className="text-lttm hover:text-ltt transition-colors">Tareas</Link>
            <span className="text-lttm">/</span>
            <span className="text-ltt">Plantillas</span>
          </nav>
          <h1 className="font-sora text-[20px] font-bold text-ltt flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-brand-cyan" />
            Plantillas de tarea
          </h1>
          <p className="font-sora text-[12.5px] text-lttm mt-1">
            Crea y gestiona plantillas reutilizables con checklist predefinido.
          </p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nueva plantilla
        </button>
      </div>

      {/* Org templates */}
      {orgTpls.length > 0 && (
        <section className="mb-8">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Mis plantillas</p>
          <div className="flex flex-col gap-3">
            {orgTpls.map((tpl) => (
              <div key={tpl.id}>
                <TemplateCard
                  tpl={tpl}
                  isOwner
                  onEdit={() => { setEditTarget(tpl); setMode('edit') }}
                  onDelete={() => setConfirmDelId(tpl.id)}
                />
                {/* Confirm delete inline */}
                {confirmDelId === tpl.id && (
                  <div className="mt-2 px-4 py-3 bg-redim border border-reb rounded-[10px] flex items-center justify-between gap-3">
                    <span className="font-sora text-[12.5px] text-re">
                      ¿Eliminar <strong>{tpl.name}</strong>? Esta acción no se puede deshacer.
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-re text-white rounded-[6px] font-sora text-[12px] font-medium disabled:opacity-50"
                      >
                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDelId(null)}
                        className="px-3 py-1.5 font-sora text-[12px] text-ltt2 hover:text-ltt transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {orgTpls.length === 0 && (
        <div className="bg-ltcard border border-dashed border-ltb rounded-[12px] p-8 text-center mb-8">
          <LayoutTemplate className="w-8 h-8 text-lttm mx-auto mb-3" />
          <p className="font-sora text-[13px] font-medium text-ltt">Sin plantillas propias</p>
          <p className="font-sora text-[12px] text-lttm mt-1 mb-4">
            Crea tu primera plantilla con checklist para agilizar la creación de tareas recurrentes.
          </p>
          <button
            onClick={() => setMode('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ltbg border border-ltb rounded-[8px] font-sora text-[12.5px] text-ltt hover:border-brand-cyan hover:text-brand-cyan transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva plantilla
          </button>
        </div>
      )}

      {/* System templates */}
      {systemTpls.length > 0 && (
        <section>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">
            Plantillas del sistema (solo lectura)
          </p>
          <div className="flex flex-col gap-3">
            {systemTpls.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                isOwner={false}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
