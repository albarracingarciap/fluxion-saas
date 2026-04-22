'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, History, User, Clock, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react'
import { getSoAHistory } from './actions'

type HistoryEntry = {
  id: string
  control_code: string
  is_applicable: boolean
  status: string
  justification: string | null
  notes: string | null
  created_at: string
  profiles: { first_name: string; last_name: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'No iniciado', color: 'text-lttm' },
  planned: { label: 'Planificado', color: 'text-blue-500' },
  in_progress: { label: 'En progreso', color: 'text-amber-500' },
  implemented: { label: 'Implantado', color: 'text-green-500' },
  externalized: { label: 'Externalizado', color: 'text-brand-cyan' },
}

export function HistoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getSoAHistory()
        .then((res) => {
          if (res.error) setError(res.error)
          else setHistory(res.data as HistoryEntry[])
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#001024]/40 backdrop-blur-sm z-[150] animate-fadein" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[650px] max-h-[85vh] bg-ltcard border border-ltb rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] z-[151] flex flex-col animate-scalein overflow-hidden">
        <div className="px-7 py-6 border-b border-ltb flex items-center justify-between bg-ltbg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-dim2 border border-cyan-border flex items-center justify-center text-brand-cyan">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-fraunces text-[20px] text-ltt leading-none">Historial de Cambios</h3>
              <p className="font-sora text-[12px] text-ltt2 mt-1.5">Registro de auditoría de controles (ISO 42001)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ltb text-lttm transition-colors">
            <X size={20} />
          </button>
        </div>

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
          ) : history.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <Clock size={32} className="text-lttm mb-3" />
              <p className="font-sora text-[14px] text-ltt font-medium">No hay registros aún</p>
              <p className="font-sora text-[13px] text-ltt2 mt-1">
                Los cambios aparecerán aquí conforme se actualicen los controles.
              </p>
            </div>
          ) : (
            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-ltb">
              {history.map((entry) => (
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
                        {entry.profiles 
                          ? `${entry.profiles.first_name} ${entry.profiles.last_name}`.trim() 
                          : 'Sistema'}
                      </span>
                      <span className="text-lttm">•</span>
                      <span className="font-sora text-[11px] text-ltt2">
                        {new Intl.DateTimeFormat('es-ES', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(entry.created_at))}
                      </span>
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
          )}
        </div>

        <div className="px-7 py-4 border-t border-ltb bg-ltbg flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[12px] font-medium hover:bg-ltb transition-colors"
          >
            Cerrar historial
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
