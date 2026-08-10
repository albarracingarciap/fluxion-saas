'use client'

import { UserCheck, Calendar, RefreshCw, FileDown, X } from 'lucide-react'

type Props = {
  selectedCount: number
  onClearSelection: () => void
  onAssign: () => void
  onSetDueDate: () => void
  onChangeOption: () => void
  onExportCsv: () => void
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onAssign,
  onSetDueDate,
  onChangeOption,
  onExportCsv,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-[14px] border border-ltb bg-ltcard shadow-[0_8px_32px_rgba(0,0,0,0.14)] backdrop-blur-sm">
      <span className="inline-flex items-center px-3 py-1.5 rounded-[8px] border border-cyan-border bg-cyan-dim text-brand-cyan font-plex text-[11px] uppercase tracking-[1px] shrink-0">
        {selectedCount} {selectedCount === 1 ? 'acción' : 'acciones'}
      </span>

      <div className="w-px h-6 bg-ltb shrink-0" />

      <button
        type="button"
        onClick={onAssign}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard2 hover:bg-ltbg text-ltt font-plex text-[11px] uppercase tracking-[1px] transition-colors"
      >
        <UserCheck className="w-3.5 h-3.5" />
        Reasignar
      </button>

      <button
        type="button"
        onClick={onSetDueDate}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard2 hover:bg-ltbg text-ltt font-plex text-[11px] uppercase tracking-[1px] transition-colors"
      >
        <Calendar className="w-3.5 h-3.5" />
        Due date
      </button>

      <button
        type="button"
        onClick={onChangeOption}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard2 hover:bg-ltbg text-ltt font-plex text-[11px] uppercase tracking-[1px] transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Cambiar opción
      </button>

      <button
        type="button"
        onClick={onExportCsv}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard2 hover:bg-ltbg text-ltt font-plex text-[11px] uppercase tracking-[1px] transition-colors"
      >
        <FileDown className="w-3.5 h-3.5" />
        Exportar CSV
      </button>

      <div className="w-px h-6 bg-ltb shrink-0" />

      <button
        type="button"
        onClick={onClearSelection}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard2 hover:bg-ltbg text-lttm hover:text-ltt font-plex text-[11px] uppercase tracking-[1px] transition-colors"
        aria-label="Limpiar selección"
      >
        <X className="w-3.5 h-3.5" />
        Limpiar
      </button>
    </div>
  )
}
