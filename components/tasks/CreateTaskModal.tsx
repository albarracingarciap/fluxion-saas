'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { createTaskAction } from '@/app/(app)/tareas/actions'
import type { TaskPriority } from '@/lib/tasks/types'

export type Member = { id: string; full_name: string; email: string }
export type System = { id: string; name: string }

type Props = {
  members: Member[]
  systems: System[]
  onClose: () => void
  onCreated?: () => void
}

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const selectCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2.5 text-[13px] text-ltt font-sora outline-none appearance-none pr-8 cursor-pointer transition-all focus:border-brand-cyan focus:ring-[3px] focus:ring-brand-cyan/10'
const labelCls = 'block font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5'

function SelectArrow() {
  return (
    <svg
      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lttm pointer-events-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function CreateTaskModal({ members, systems, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [systemId, setSystemId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createTaskAction({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        systemId: systemId || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        onCreated?.()
        onClose()
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-fadein">
        {/* Header */}
        <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-dim2 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-brand-cyan" />
            </div>
            <h2 className="font-sora text-[14px] font-semibold text-ltt">Nueva tarea</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-ltb transition-colors text-lttm hover:text-ltt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className={labelCls}>
              Título <span className="text-re">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Describe la tarea..."
              maxLength={300}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputCls + ' resize-none h-20'}
              placeholder="Detalles adicionales (opcional)"
            />
          </div>

          {/* Priority + System */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prioridad</label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className={selectCls}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <label className={labelCls}>Sistema IA</label>
              <div className="relative">
                <select value={systemId} onChange={e => setSystemId(e.target.value)} className={selectCls}>
                  <option value="">Sin sistema</option>
                  {systems.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
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
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={selectCls}>
                  <option value="">Sin asignar</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email}
                    </option>
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
                onChange={e => setDueDate(e.target.value)}
                className={inputCls}
                min={today}
              />
            </div>
          </div>

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
