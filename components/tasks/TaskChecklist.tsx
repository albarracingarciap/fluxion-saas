'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { CheckSquare2, Square, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import {
  getChecklistAction,
  addChecklistItemAction,
  toggleChecklistItemAction,
  updateChecklistItemLabelAction,
  deleteChecklistItemAction,
  type ChecklistItem,
} from '@/app/(app)/tareas/actions'

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-1.5 bg-ltbg rounded-full overflow-hidden border border-ltb">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width:      `${pct}%`,
            background: pct === 100 ? '#2a9d55' : '#00adef',
          }}
        />
      </div>
      <span className="font-plex text-[10px] text-lttm shrink-0 w-12 text-right">
        {done}/{total} ({pct}%)
      </span>
    </div>
  )
}

// ── Single item ───────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  onToggle,
  onLabelSave,
  onDelete,
}: {
  item:        ChecklistItem
  onToggle:    (id: string, completed: boolean) => void
  onLabelSave: (id: string, label: string) => void
  onDelete:    (id: string) => void
}) {
  const [editing,    setEditing]    = useState(false)
  const [draft,      setDraft]      = useState(item.label)
  const [isPending,  startT]        = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function commitEdit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === item.label) { setEditing(false); setDraft(item.label); return }
    startT(async () => {
      await updateChecklistItemLabelAction(item.id, trimmed)
      onLabelSave(item.id, trimmed)
      setEditing(false)
    })
  }

  return (
    <div
      className={`group flex items-start gap-2 px-2 py-1.5 rounded-[8px] transition-colors ${
        item.completed ? 'opacity-60' : 'hover:bg-ltbg'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.completed)}
        className="mt-0.5 shrink-0 text-lttm hover:text-brand-cyan transition-colors"
        disabled={isPending}
      >
        {item.completed
          ? <CheckSquare2 className="w-4 h-4 text-gr" />
          : <Square       className="w-4 h-4" />
        }
      </button>

      {/* Label / edit input */}
      {editing ? (
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); commitEdit() }
              if (e.key === 'Escape') { setEditing(false); setDraft(item.label) }
            }}
            className="flex-1 min-w-0 bg-ltbg border border-brand-cyan rounded-[6px] px-2 py-0.5 font-sora text-[12px] text-ltt outline-none focus:ring-[2px] focus:ring-brand-cyan/20"
          />
          <button onClick={commitEdit}  className="w-5 h-5 flex items-center justify-center rounded bg-gr text-white shrink-0">
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button onClick={() => { setEditing(false); setDraft(item.label) }} className="w-5 h-5 flex items-center justify-center rounded border border-ltb text-lttm shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <span
          className={`flex-1 font-sora text-[12.5px] leading-5 cursor-default ${
            item.completed ? 'line-through text-lttm' : 'text-ltt'
          }`}
          onDoubleClick={() => setEditing(true)}
          title="Doble clic para editar"
        >
          {item.label}
        </span>
      )}

      {/* Action buttons — visible on hover */}
      {!editing && (
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="w-5 h-5 flex items-center justify-center rounded text-lttm hover:text-ltt transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-5 h-5 flex items-center justify-center rounded text-lttm hover:text-re transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TaskChecklist({ taskId }: { taskId: string }) {
  const [items,      setItems]      = useState<ChecklistItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newLabel,   setNewLabel]   = useState('')
  const [adding,     setAdding]     = useState(false)
  const [isPending,  startT]        = useTransition()
  const [showAddRow, setShowAddRow] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    getChecklistAction(taskId).then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [taskId])

  useEffect(() => {
    if (showAddRow) addInputRef.current?.focus()
  }, [showAddRow])

  const done  = items.filter((i) => i.completed).length
  const total = items.length

  function handleToggle(id: string, completed: boolean) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, completed } : i))
    startT(async () => { await toggleChecklistItemAction(id, completed) })
  }

  function handleLabelSave(id: string, label: string) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, label } : i))
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    startT(async () => { await deleteChecklistItemAction(id) })
  }

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    setAdding(true)
    const res = await addChecklistItemAction(taskId, label)
    setAdding(false)
    if ('id' in res) {
      const newItem: ChecklistItem = {
        id:           res.id,
        task_id:      taskId,
        label,
        completed:    false,
        completed_by: null,
        completed_at: null,
        position:     (items[items.length - 1]?.position ?? 0) + 10,
        created_at:   new Date().toISOString(),
      }
      setItems((prev) => [...prev, newItem])
      setNewLabel('')
      // mantener el input visible para añadir más ítems
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 font-sora text-[12px] text-lttm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando checklist…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CheckSquare2 className="w-3.5 h-3.5 text-lttm" />
          <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2">
            Checklist
          </span>
          {total > 0 && (
            <span className="font-plex text-[9px] bg-ltbg border border-ltb text-lttm rounded-full px-1.5 py-0.5">
              {done}/{total}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddRow((v) => !v)}
          className="flex items-center gap-1 font-sora text-[11px] text-lttm hover:text-brand-cyan transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir ítem
        </button>
      </div>

      {/* Progress */}
      {total > 0 && <ProgressBar done={done} total={total} />}

      {/* Items */}
      {items.length === 0 && !showAddRow && (
        <p className="font-sora text-[12px] text-lttm italic py-2">
          Sin ítems. Añade el primero con el botón de arriba.
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            onToggle={handleToggle}
            onLabelSave={handleLabelSave}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add row */}
      {showAddRow && (
        <div className="flex items-center gap-2 mt-2 px-2">
          <Square className="w-4 h-4 text-ltb shrink-0" />
          <input
            ref={addInputRef}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  { e.preventDefault(); void handleAdd() }
              if (e.key === 'Escape') { setShowAddRow(false); setNewLabel('') }
            }}
            placeholder="Nuevo ítem…"
            className="flex-1 min-w-0 bg-ltbg border border-dashed border-ltb rounded-[6px] px-2 py-1 font-sora text-[12px] text-ltt outline-none focus:border-brand-cyan focus:ring-[2px] focus:ring-brand-cyan/15"
          />
          <button
            onClick={() => void handleAdd()}
            disabled={adding || !newLabel.trim()}
            className="flex items-center gap-1 px-2.5 py-1 bg-brand-cyan text-white rounded-[6px] font-sora text-[11px] disabled:opacity-40 transition-all"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Añadir
          </button>
          <button
            onClick={() => { setShowAddRow(false); setNewLabel('') }}
            className="p-1 rounded text-lttm hover:text-ltt transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
