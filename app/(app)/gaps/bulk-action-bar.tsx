'use client'

import { X, UserCheck, ClipboardList, Download, ShieldOff } from 'lucide-react'
import type { UnifiedGapRecord, GapAssignableMember, GapLayer } from '@/lib/gaps/data'
import { downloadGapsCsv } from '@/lib/gaps/csv'
import { LAYER_LABELS } from './gap-ui-constants'

type Props = {
  selectedGaps: UnifiedGapRecord[]
  members: GapAssignableMember[]
  onClear: () => void
  onAssign: () => void
  onCreateTasks: () => void
  onDispose: () => void
}

const ASSIGNABLE_LAYERS: GapLayer[] = ['normativo', 'control', 'caducidad']

export function BulkActionBar({ selectedGaps, onClear, onAssign, onCreateTasks, onDispose }: Props) {
  if (selectedGaps.length === 0) return null

  const layerCounts = selectedGaps.reduce<Partial<Record<GapLayer, number>>>((acc, gap) => {
    acc[gap.layer] = (acc[gap.layer] ?? 0) + 1
    return acc
  }, {})

  const layerSummary = (Object.entries(layerCounts) as [GapLayer, number][])
    .map(([layer, count]) => `${count} ${LAYER_LABELS[layer].toLowerCase()}`)
    .join(' · ')

  const assignableCount = selectedGaps.filter((g) => ASSIGNABLE_LAYERS.includes(g.layer)).length
  const taskableCount = selectedGaps.filter((g) => g.layer !== 'fmea').length

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10)
    downloadGapsCsv(selectedGaps, `gaps_seleccion_${date}.csv`)
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 bg-ltcard border border-ltb rounded-[14px] shadow-[0_8px_30px_rgba(0,74,173,0.18)]">
      <div className="flex flex-col gap-0.5 mr-1">
        <span className="font-sora text-[13px] font-semibold text-ltt">
          {selectedGaps.length} seleccionado{selectedGaps.length !== 1 ? 's' : ''}
        </span>
        {layerSummary && (
          <span className="font-sora text-[11px] text-lttm">{layerSummary}</span>
        )}
      </div>

      <div className="h-8 w-px bg-ltb" />

      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb text-lttm font-sora text-[12px] hover:border-ltbl hover:text-ltt transition-colors"
      >
        <X size={12} />
        Limpiar
      </button>

      <button
        type="button"
        onClick={onAssign}
        disabled={assignableCount === 0}
        title={assignableCount === 0 ? 'No hay gaps asignables en la selección' : `Asignar ${assignableCount} gaps`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb text-ltt2 font-sora text-[12px] hover:border-brand-cyan hover:text-brand-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UserCheck size={12} />
        Asignar
        {assignableCount > 0 && <span className="font-plex text-[9px] uppercase tracking-[0.4px] px-1 py-0.5 rounded bg-ltbg border border-ltb">{assignableCount}</span>}
      </button>

      <button
        type="button"
        onClick={onCreateTasks}
        disabled={taskableCount === 0}
        title={taskableCount === 0 ? 'No hay gaps en la selección para crear tareas' : `Crear tareas para ${taskableCount} gaps`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb text-ltt2 font-sora text-[12px] hover:border-brand-cyan hover:text-brand-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ClipboardList size={12} />
        Crear tareas
        {taskableCount > 0 && <span className="font-plex text-[9px] uppercase tracking-[0.4px] px-1 py-0.5 rounded bg-ltbg border border-ltb">{taskableCount}</span>}
      </button>

      <button
        type="button"
        onClick={onDispose}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb text-ltt2 font-sora text-[12px] hover:border-ltbl hover:text-ltt transition-colors"
        title="Marcar los gaps seleccionados como aceptados o no aplicables"
      >
        <ShieldOff size={12} />
        Excluir
        <span className="font-plex text-[9px] uppercase tracking-[0.4px] px-1 py-0.5 rounded bg-ltbg border border-ltb">
          {selectedGaps.length}
        </span>
      </button>

      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[12px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:-translate-y-px transition-all"
      >
        <Download size={12} />
        Exportar
      </button>
    </div>
  )
}
