'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, History, Clock, CheckCircle2, AlertCircle, FileText, Loader2,
  ArrowRight, FileEdit, Send,
} from 'lucide-react'
import { getSoAHistory, getSoALifecycleLog } from './actions'

type ControlEntry = {
  id: string
  control_code: string
  is_applicable: boolean
  status: string
  justification: string | null
  notes: string | null
  created_at: string
  profiles: { full_name: string; display_name: string | null } | null
}

type LifecycleEntry = {
  id: string
  from_status: string | null
  to_status: string
  created_at: string
  profiles: { full_name: string; display_name: string | null } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started:  { label: 'No iniciado',   color: 'text-lttm' },
  planned:      { label: 'Planificado',   color: 'text-blue-500' },
  in_progress:  { label: 'En progreso',   color: 'text-amber-500' },
  implemented:  { label: 'Implantado',    color: 'text-green-500' },
  externalized: { label: 'Externalizado', color: 'text-brand-cyan' },
}

const LIFECYCLE_LABELS: Record<string, { label: string; cls: string }> = {
  draft:        { label: 'Borrador',    cls: 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]' },
  under_review: { label: 'En revisión', cls: 'bg-[#fffbeb] border-[#fde68a] text-[#b45309]' },
  approved:     { label: 'Aprobado',    cls: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]' },
}

const TRANSITION_ICON: Record<string, React.ReactNode> = {
  under_review: <Send size={13} className="text-[#b45309]" />,
  approved:     <CheckCircle2 size={13} className="text-[#15803d]" />,
  draft:        <FileEdit size={13} className="text-[#0369a1]" />,
}

function actorName(profiles: LifecycleEntry['profiles']): string {
  if (!profiles) return 'Sistema'
  return (profiles.display_name || profiles.full_name || '').trim() || 'Usuario'
}

function controlActorName(profiles: ControlEntry['profiles']): string {
  if (!profiles) return 'Sistema'
  return (profiles.display_name || profiles.full_name || '').trim() || 'Usuario'
}

function fmt(date: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function HistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'documento' | 'controles'>('documento')
  const [controls, setControls] = useState<ControlEntry[]>([])
  const [lifecycle, setLifecycle] = useState<LifecycleEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    setError(null)
    Promise.all([getSoAHistory(), getSoALifecycleLog()])
      .then(([histRes, lcRes]) => {
        if (histRes.error || lcRes.error) {
          setError(histRes.error ?? lcRes.error ?? 'Error')
        } else {
          setControls(histRes.data as ControlEntry[])
          setLifecycle(lcRes.data as unknown as LifecycleEntry[])
        }
      })
      .finally(() => setIsLoading(false))
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#001024]/40 backdrop-blur-sm z-[150] animate-fadein" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[650px] max-h-[85vh] bg-ltcard border border-ltb rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-[151] flex flex-col animate-scalein overflow-hidden">

        {/* Header */}
        <div className="px-7 py-6 border-b border-ltb flex items-center justify-between bg-ltbg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-dim2 border border-cyan-border flex items-center justify-center text-brand-cyan">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-fraunces text-[20px] text-ltt leading-none">Historial de Auditoría</h3>
              <p className="font-sora text-[12px] text-ltt2 mt-1.5">Registro completo de cambios del SoA ISO 42001</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ltb text-lttm transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ltb bg-ltbg px-7">
          {(['documento', 'controles'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-6 font-sora text-[13px] font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand-cyan text-brand-cyan'
                  : 'border-transparent text-ltt2 hover:text-ltt'
              }`}
            >
              {t === 'documento' ? 'Ciclo de vida' : 'Cambios en controles'}
              <span className="ml-2 font-plex text-[10px] px-1.5 py-0.5 rounded bg-ltb text-lttm">
                {t === 'documento' ? lifecycle.length : controls.length}
              </span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-7">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="text-brand-cyan animate-spin" />
              <p className="font-sora text-[13px] text-ltt2">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <AlertCircle size={32} className="text-re mb-3" />
              <p className="font-sora text-[14px] text-ltt font-medium">{error}</p>
            </div>
          ) : tab === 'documento' ? (
            <LifecycleTab entries={lifecycle} />
          ) : (
            <ControlsTab entries={controls} />
          )}
        </div>

        <div className="px-7 py-4 border-t border-ltb bg-ltbg flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[12px] font-medium hover:bg-ltb transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

function LifecycleTab({ entries }: { entries: LifecycleEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-10">
        <Clock size={32} className="text-lttm mb-3" />
        <p className="font-sora text-[14px] text-ltt font-medium">Sin transiciones aún</p>
        <p className="font-sora text-[13px] text-ltt2 mt-1">
          Las transiciones de estado del documento aparecerán aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-ltb">
      {entries.map((entry) => {
        const toLc = LIFECYCLE_LABELS[entry.to_status]
        const fromLc = entry.from_status ? LIFECYCLE_LABELS[entry.from_status] : null
        return (
          <div key={entry.id} className="relative pl-10">
            <div className="absolute left-[-2px] top-1.5 w-[28px] h-[28px] rounded-full bg-ltcard border border-ltb flex items-center justify-center z-10">
              {TRANSITION_ICON[entry.to_status] ?? <ArrowRight size={13} className="text-lttm" />}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sora text-[12px] font-medium text-ltt">
                  {actorName(entry.profiles)}
                </span>
                <span className="text-lttm">•</span>
                <span className="font-sora text-[11px] text-ltt2">{fmt(entry.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {fromLc && (
                  <>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-plex text-[10px] ${fromLc.cls}`}>
                      {fromLc.label}
                    </span>
                    <ArrowRight size={12} className="text-lttm shrink-0" />
                  </>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border font-plex text-[10px] font-semibold ${toLc?.cls ?? ''}`}>
                  {toLc?.label ?? entry.to_status}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ControlsTab({ entries }: { entries: ControlEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-10">
        <Clock size={32} className="text-lttm mb-3" />
        <p className="font-sora text-[14px] text-ltt font-medium">No hay registros aún</p>
        <p className="font-sora text-[13px] text-ltt2 mt-1">
          Los cambios en controles aparecerán aquí conforme se actualicen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-ltb">
      {entries.map((entry) => (
        <div key={entry.id} className="relative pl-10">
          <div className="absolute left-[-2px] top-1.5 w-[28px] h-[28px] rounded-full bg-ltcard border border-ltb flex items-center justify-center z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan ring-4 ring-cyan-dim" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border border-ltb bg-ltbg text-lttm">
                {entry.control_code}
              </span>
              <span className="font-sora text-[12px] font-medium text-ltt">
                {controlActorName(entry.profiles)}
              </span>
              <span className="text-lttm">•</span>
              <span className="font-sora text-[11px] text-ltt2">{fmt(entry.created_at)}</span>
            </div>
            <div className="p-4 rounded-xl border border-ltb bg-ltcard2/50">
              <div className="flex flex-wrap gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className={entry.is_applicable ? 'text-green-500' : 'text-lttm'} />
                  <span className="font-sora text-[11px] text-ltt2">
                    {entry.is_applicable ? 'Aplicable' : 'Excluido'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-sora text-[11px] font-semibold ${STATUS_LABELS[entry.status]?.color || 'text-ltt'}`}>
                    {STATUS_LABELS[entry.status]?.label || entry.status}
                  </span>
                </div>
              </div>
              {entry.justification && (
                <div className="flex gap-2 text-[12px] font-sora leading-relaxed">
                  <FileText size={14} className="shrink-0 mt-1 text-lttm" />
                  <p className="text-ltt2 italic">"{entry.justification}"</p>
                </div>
              )}
              {entry.notes && (
                <div className="mt-2 pt-2 border-t border-ltb/50 flex gap-2 text-[11px] font-sora leading-relaxed">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-lttm" />
                  <p className="text-ltt2"><span className="font-semibold">Notas:</span> {entry.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
