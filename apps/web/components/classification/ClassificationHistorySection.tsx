'use client'

import { useState } from 'react'
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
} from 'lucide-react'
import { getReconciliationDiff } from '@/app/(app)/inventario/actions/classification'
import type { DiffItem } from '@/types/classification'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ClassificationEventEntry {
  id: string
  version: number
  method: string
  risk_level: string
  risk_label: string
  basis: string | null
  reason: string | null
  obligations_set: string[]
  status: string
  review_notes: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_META: Record<string, { label: string; icon: React.ReactNode }> = {
  initial:       { label: 'Clasificación inicial', icon: <Plus className="w-3 h-3" /> },
  manual_review: { label: 'Revisión manual',       icon: <Pencil className="w-3 h-3" /> },
  ai_agent:      { label: 'Agente IA',             icon: <Bot className="w-3 h-3" /> },
  rules_engine:  { label: 'Motor de reglas',       icon: <GitBranch className="w-3 h-3" /> },
}

const RISK_COLORS: Record<string, string> = {
  high:     'text-re',
  gpai:     'text-brand-cyan',
  limited:  'text-or',
  minimal:  'text-gr',
  prohibited: 'text-re',
}

const DIFF_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  added:     { label: 'Añadida',    color: 'text-gr',       icon: <Plus className="w-3 h-3" /> },
  removed:   { label: 'Eliminada', color: 'text-re',       icon: <Trash2 className="w-3 h-3" /> },
  unchanged: { label: 'Sin cambio', color: 'text-lttm',    icon: <Shield className="w-3 h-3" /> },
}

const RESOLUTION_LABELS: Record<string, string> = {
  accepted:  'Aceptada',
  excluded:  'Excluida',
  preserved: 'Conservada',
  archived:  'Archivada',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Subcomponente: fila de diff expandible ───────────────────────────────────

function DiffRow({ item }: { item: DiffItem }) {
  const meta = DIFF_TYPE_META[item.diff_type] ?? DIFF_TYPE_META.unchanged
  const resolution = item.resolution ? RESOLUTION_LABELS[item.resolution] : null

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-ltb last:border-0">
      <div className="flex items-center gap-2">
        <span className={meta.color}>{meta.icon}</span>
        <span className="font-sora text-[11.5px] text-ltt">{item.obligation_label}</span>
      </div>
      <div className="flex items-center gap-2">
        {item.previous_status && (
          <span className="font-plex text-[10px] text-lttm bg-ltcard2 px-1.5 py-0.5 rounded border border-ltb">
            {item.previous_status}
          </span>
        )}
        {resolution && (
          <span className={`font-plex text-[10px] px-1.5 py-0.5 rounded border ${
            item.resolution === 'accepted'  ? 'text-gr bg-grdim border-grb'   :
            item.resolution === 'excluded'  ? 'text-re bg-red-dim border-reb' :
            item.resolution === 'archived'  ? 'text-lttm bg-ltcard2 border-ltb' :
            'text-gr bg-grdim border-grb'
          }`}>
            {resolution}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponente: tarjeta de evento ────────────────────────────────────────

function EventCard({ event, isActive }: { event: ClassificationEventEntry; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [diffs, setDiffs] = useState<DiffItem[] | null>(null)
  const [loading, setLoading] = useState(false)

  const methodMeta = METHOD_META[event.method] ?? { label: event.method, icon: null }
  const riskColor = RISK_COLORS[event.risk_level] ?? 'text-lttm'
  const isSuperseded = event.status === 'superseded'

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (diffs !== null) return
    setLoading(true)
    const { data } = await getReconciliationDiff(event.id)
    setDiffs((data as DiffItem[]) ?? [])
    setLoading(false)
  }

  return (
    <div className={`border border-ltb rounded-[10px] overflow-hidden ${isSuperseded ? 'opacity-60' : ''}`}>
      {/* Header de la tarjeta */}
      <button
        onClick={handleExpand}
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 bg-ltcard2 hover:bg-ltbg transition-colors text-left"
      >
        <div className="flex items-start gap-3">
          {/* Versión */}
          <div className={`font-plex text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${
            isActive
              ? 'bg-grdim text-gr border-grb'
              : isSuperseded
              ? 'bg-ltcard2 text-lttm border-ltb'
              : 'bg-ordim text-or border-orb'
          }`}>
            v{event.version}
          </div>

          <div className="min-w-0">
            {/* Nivel de riesgo */}
            <div className={`font-sora text-[14px] font-semibold ${riskColor}`}>
              {event.risk_label}
            </div>
            {/* Método + estado */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 font-plex text-[10.5px] text-lttm">
                {methodMeta.icon}
                {methodMeta.label}
              </span>
              {isActive && (
                <span className="font-plex text-[10px] text-gr bg-grdim border border-grb px-1.5 py-0.5 rounded-full">
                  Activa
                </span>
              )}
              {isSuperseded && (
                <span className="font-plex text-[10px] text-lttm bg-ltcard2 border border-ltb px-1.5 py-0.5 rounded-full">
                  Superada
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Autor + fecha */}
          <div className="text-right">
            {event.created_by_name && (
              <div className="flex items-center gap-1 justify-end font-sora text-[11px] text-lttm">
                <User className="w-3 h-3" />
                {event.created_by_name}
              </div>
            )}
            <div className="flex items-center gap-1 justify-end font-plex text-[10.5px] text-lttm mt-0.5">
              <Clock className="w-3 h-3" />
              {formatDate(event.created_at)}
            </div>
          </div>
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-lttm" />
            : <ChevronRight className="w-3.5 h-3.5 text-lttm" />
          }
        </div>
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-ltb bg-ltcard">
          {/* Fundamento */}
          {event.basis && (
            <div className="px-4 py-3 border-b border-ltb">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Fundamento</div>
              <div className="font-sora text-[12px] text-ltt">{event.basis}</div>
              {event.reason && (
                <div className="font-sora text-[11.5px] text-lttm mt-1">{event.reason}</div>
              )}
            </div>
          )}

          {/* Notas de revisión */}
          {event.review_notes && (
            <div className="px-4 py-3 border-b border-ltb">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Notas de revisión</div>
              <div className="font-sora text-[12px] text-ltt italic">&ldquo;{event.review_notes}&rdquo;</div>
            </div>
          )}

          {/* Diffs */}
          <div className="px-4 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">
              Cambios en obligaciones
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-lttm font-sora text-[12px] py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cargando...
              </div>
            )}
            {!loading && diffs !== null && diffs.length === 0 && (
              <div className="font-sora text-[12px] text-lttm py-2">
                {event.method === 'initial'
                  ? `${event.obligations_set.length} obligaciones establecidas en la clasificación inicial.`
                  : 'Sin cambios en obligaciones.'}
              </div>
            )}
            {!loading && diffs !== null && diffs.length > 0 && (
              <div className="border border-ltb rounded-[7px] overflow-hidden">
                {diffs.map((d) => <DiffRow key={d.id} item={d} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClassificationHistorySection({
  events,
  activeEventId,
}: {
  events: ClassificationEventEntry[]
  activeEventId: string | null
}) {
  if (events.length === 0) {
    return (
      <div className="font-sora text-[13px] text-lttm text-center py-8">
        No hay clasificaciones registradas para este sistema.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          isActive={event.id === activeEventId}
        />
      ))}
    </div>
  )
}
