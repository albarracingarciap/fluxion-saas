'use client'

import { CalendarClock, FilePlus2, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type SaveReportEvidencePayload = {
  tags: string[]
  expiresAt: string | null
  validationNotes: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (payload: SaveReportEvidencePayload) => void
  isPending: boolean
  reportLabel: string
  helperText?: string
  defaultTags: string[]
  defaultExpiryDays: number
  summaryLines?: string[]
}

function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function SaveReportEvidenceModal({
  open,
  onClose,
  onConfirm,
  isPending,
  reportLabel,
  helperText,
  defaultTags,
  defaultExpiryDays,
  summaryLines,
}: Props) {
  const [tags, setTags] = useState<string[]>(defaultTags)
  const [tagInput, setTagInput] = useState('')
  const [expiresAt, setExpiresAt] = useState<string>(addDaysISO(defaultExpiryDays))
  const [validationNotes, setValidationNotes] = useState('')

  // Reset state on open
  useEffect(() => {
    if (open) {
      setTags(defaultTags)
      setTagInput('')
      setExpiresAt(addDaysISO(defaultExpiryDays))
      setValidationNotes('')
    }
  }, [open, defaultTags, defaultExpiryDays])

  if (!open) return null

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag || tags.includes(tag)) {
      setTagInput('')
      return
    }
    setTags([...tags, tag])
    setTagInput('')
  }

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const handleConfirm = () => {
    onConfirm({
      tags,
      expiresAt: expiresAt || null,
      validationNotes: validationNotes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
      <div className="bg-ltcard w-full max-w-xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
          <div>
            <h2 className="font-fraunces text-lg font-semibold text-ltt">Guardar como evidencia</h2>
            <p className="font-sora text-[12px] text-lttm mt-1">{reportLabel}</p>
          </div>
          <button onClick={onClose} className="text-lttm hover:text-ltt transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {summaryLines && summaryLines.length > 0 && (
            <div className="rounded-[10px] border border-ltb bg-ltbg px-4 py-3">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1.5">
                Resumen del snapshot
              </p>
              <ul className="space-y-1">
                {summaryLines.map((line, i) => (
                  <li key={i} className="font-sora text-[12.5px] text-ltt leading-snug">{line}</li>
                ))}
              </ul>
            </div>
          )}

          {helperText && (
            <p className="font-sora text-[12px] text-ltt2 leading-relaxed">{helperText}</p>
          )}

          <div>
            <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
              Tags
              <span className="ml-1.5 normal-case text-lttm">Enter o coma para añadir</span>
            </label>
            <div className="flex flex-wrap gap-1.5 items-center min-h-[38px] w-full bg-ltbg border border-ltb rounded-lg px-2.5 py-1.5 focus-within:border-brand-cyan transition-colors">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-dim border border-cyan-border text-brand-cyan font-plex text-[10px] uppercase tracking-[0.5px]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="hover:opacity-60 transition-opacity leading-none"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                placeholder={tags.length === 0 ? 'Escribe un tag y pulsa Enter…' : ''}
                className="flex-1 min-w-[120px] bg-transparent font-sora text-[12.5px] text-ltt outline-none placeholder:text-lttm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
              <CalendarClock className="inline w-3 h-3 mr-1" />
              Caducidad
              <span className="ml-1.5 normal-case text-lttm">cuándo conviene regenerar este snapshot</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
            />
          </div>

          <div>
            <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
              Nota de validación
              <span className="ml-1.5 normal-case text-lttm">opcional · contexto para revisión posterior</span>
            </label>
            <textarea
              rows={3}
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              placeholder="Por qué se genera ahora, alcance, acuerdos relevantes…"
              className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
            />
          </div>

          <div className="rounded-[10px] border border-orb bg-ordim px-4 py-3">
            <p className="font-sora text-[11.5px] text-ltt leading-snug">
              La evidencia se guarda en estado <span className="font-medium text-or">pendiente de revisión</span>.
              Pasará a "válida" cuando alguien la apruebe desde la biblioteca de evidencias.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
            Confirmar y guardar
          </button>
        </div>
      </div>
    </div>
  )
}
