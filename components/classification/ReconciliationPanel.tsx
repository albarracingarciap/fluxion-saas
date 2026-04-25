'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  X,
} from 'lucide-react'
import { getReconciliationDiff } from '@/app/(app)/inventario/actions/classification'
import type { DiffItem, DiffResolution, ObligationStatus } from '@/types/classification'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface Decision {
  resolution: DiffResolution
  resolution_note: string
}

interface ReconciliationPanelProps {
  systemId: string
  eventId: string
  version: number
  riskLabel: string
  riskLevel: string
  onConfirmed: () => void
  onCancelled: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  suggested:   'Sugerida',
  pending:     'Pendiente',
  in_progress: 'En progreso',
  resolved:    'Resuelta',
  blocked:     'Bloqueada',
  excluded:    'Excluida',
}

const STATUS_COLORS: Record<string, string> = {
  suggested:   'text-lttm',
  pending:     'text-re',
  in_progress: 'text-or',
  resolved:    'text-gr',
  blocked:     'text-re',
  excluded:    'text-lttm',
}

/** Items que requieren decisión explícita del usuario (no auto-resueltos por el backend) */
function needsDecision(item: DiffItem): boolean {
  return item.resolution === null
}

/** Items eliminados con trabajo real (resolved o accepted/in_progress) — requieren advertencia */
function isCriticalRemoval(item: DiffItem): boolean {
  return (
    item.diff_type === 'removed' &&
    item.previous_status !== null &&
    ['accepted', 'in_progress', 'resolved'].includes(item.previous_status)
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  accent,
}: {
  label: string
  count: number
  collapsed: boolean
  onToggle: () => void
  accent: string
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-ltcard2 border-b border-ltb hover:bg-ltbg transition-colors"
    >
      <div className="flex items-center gap-2">
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-lttm" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-lttm" />
        )}
        <span className={`font-plex text-[10.5px] uppercase tracking-[0.7px] font-semibold ${accent}`}>
          {label}
        </span>
      </div>
      <span className="font-plex text-[10.5px] text-lttm">{count}</span>
    </button>
  )
}

function NoteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <textarea
      rows={2}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12px] font-sora text-ltt outline-none focus:border-brand-cyan resize-none placeholder:text-lttm"
    />
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ReconciliationPanel({
  systemId,
  eventId,
  version,
  riskLabel,
  riskLevel,
  onConfirmed,
  onCancelled,
}: ReconciliationPanelProps) {
  const [diffs, setDiffs] = useState<DiffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [unchangedCollapsed, setUnchangedCollapsed] = useState(true)
  const [autoCollapsed, setAutoCollapsed] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Cargar diffs al montar
  useEffect(() => {
    setLoading(true)
    getReconciliationDiff(eventId).then(({ data, error }) => {
      if (error || !data) {
        setLoadError(error ?? 'No se pudieron cargar los cambios.')
      } else {
        setDiffs(data as DiffItem[])
      }
      setLoading(false)
    })
  }, [eventId])

  // Agrupar diffs
  const added = diffs.filter((d) => d.diff_type === 'added' && needsDecision(d))
  const removedCritical = diffs.filter((d) => d.diff_type === 'removed' && isCriticalRemoval(d) && needsDecision(d))
  const removedAuto = diffs.filter((d) => d.diff_type === 'removed' && !isCriticalRemoval(d))
  const unchanged = diffs.filter((d) => d.diff_type === 'unchanged')

  // El botón "Confirmar" se habilita cuando todos los items que requieren decisión la tienen
  const pendingDecisions = [...added, ...removedCritical].filter((item) => {
    const dec = decisions[item.id]
    if (!dec) return true
    if (['excluded', 'archived'].includes(dec.resolution) && !dec.resolution_note.trim()) return true
    return false
  })
  const canConfirm = pendingDecisions.length === 0

  function setResolution(itemId: string, resolution: DiffResolution) {
    setDecisions((prev) => ({
      ...prev,
      [itemId]: { resolution, resolution_note: prev[itemId]?.resolution_note ?? '' },
    }))
  }

  function setNote(itemId: string, note: string) {
    setDecisions((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], resolution_note: note },
    }))
  }

  async function handleConfirm() {
    setIsConfirming(true)
    setConfirmError(null)

    const decisionsPayload = Object.entries(decisions).map(([diff_id, dec]) => ({
      diff_id,
      resolution: dec.resolution,
      resolution_note: dec.resolution_note || undefined,
    }))

    try {
      const response = await fetch(`/api/v1/systems/${systemId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, decisions: decisionsPayload }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setConfirmError(err.detail ?? 'Error al confirmar los cambios.')
        return
      }

      onConfirmed()
    } catch {
      setConfirmError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsConfirming(false)
    }
  }

  async function handleCancel() {
    setIsCancelling(true)
    try {
      await fetch(`/api/v1/systems/${systemId}/classification-events/${eventId}`, {
        method: 'DELETE',
      })
      onCancelled()
    } catch {
      // Si falla el cancel, simplemente cerramos sin limpiar el evento
      onCancelled()
    } finally {
      setIsCancelling(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    // Drawer lateral fijo desde la derecha
    <div className="fixed inset-y-0 right-0 z-[10030] flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-[520px] bg-ltcard border-l border-ltb flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-ltb bg-ltcard2 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-1">
                Reconciliación de clasificación
              </div>
              <div className="font-fraunces text-[17px] font-semibold text-ltt">
                Versión anterior → Versión {version}
              </div>
              <div className="font-sora text-[12px] text-lttm mt-0.5">
                Nueva clasificación: <span className="text-ltt font-medium">{riskLabel}</span>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-lttm hover:text-ltt transition-colors mt-0.5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-lttm font-sora text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando cambios...
            </div>
          )}

          {loadError && (
            <div className="m-4 px-3 py-2.5 rounded-lg bg-red-dim border border-reb font-sora text-[12px] text-re">
              {loadError}
            </div>
          )}

          {!loading && !loadError && (
            <>
              {/* Obligaciones añadidas */}
              {added.length > 0 && (
                <div>
                  <div className="px-4 py-3 border-b border-ltb bg-ltcard2">
                    <span className="font-plex text-[10.5px] uppercase tracking-[0.7px] font-semibold text-brand-cyan">
                      Obligaciones añadidas ({added.length})
                    </span>
                  </div>
                  <div className="divide-y divide-ltb">
                    {added.map((item) => {
                      const dec = decisions[item.id]
                      return (
                        <div key={item.id} className="px-4 py-3.5">
                          <div className="font-sora text-[13px] text-ltt mb-2.5">{item.obligation_label}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResolution(item.id, 'accepted')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora text-[11.5px] font-medium border transition-all ${
                                dec?.resolution === 'accepted'
                                  ? 'bg-grdim text-gr border-grb'
                                  : 'text-lttm border-ltb hover:bg-ltbg hover:text-ltt'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              Aceptar
                            </button>
                            <button
                              onClick={() => setResolution(item.id, 'excluded')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora text-[11.5px] font-medium border transition-all ${
                                dec?.resolution === 'excluded'
                                  ? 'bg-red-dim text-re border-reb'
                                  : 'text-lttm border-ltb hover:bg-ltbg hover:text-ltt'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              Excluir
                            </button>
                          </div>
                          {dec?.resolution === 'excluded' && (
                            <NoteInput
                              value={dec.resolution_note}
                              onChange={(v) => setNote(item.id, v)}
                              placeholder="Motivo de la exclusión (requerido)"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Obligaciones eliminadas — requieren decisión */}
              {removedCritical.length > 0 && (
                <div>
                  <div className="px-4 py-3 border-b border-ltb bg-ltcard2">
                    <span className="font-plex text-[10.5px] uppercase tracking-[0.7px] font-semibold text-or">
                      Obligaciones eliminadas ({removedCritical.length + removedAuto.length})
                    </span>
                  </div>
                  <div className="divide-y divide-ltb">
                    {removedCritical.map((item) => {
                      const dec = decisions[item.id]
                      const statusLabel = STATUS_LABELS[item.previous_status ?? ''] ?? item.previous_status
                      const statusColor = STATUS_COLORS[item.previous_status ?? ''] ?? 'text-lttm'
                      const isResolved = item.previous_status === 'resolved'

                      return (
                        <div key={item.id} className="px-4 py-3.5">
                          <div className="flex items-start gap-2 mb-2.5">
                            {isResolved && (
                              <AlertTriangle className="w-3.5 h-3.5 text-or shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="font-sora text-[13px] text-ltt">{item.obligation_label}</div>
                              <div className={`font-plex text-[11px] mt-0.5 ${statusColor}`}>
                                Estado actual: {statusLabel.toUpperCase()}
                                {isResolved && ' · tiene evidencias adjuntas'}
                              </div>
                            </div>
                          </div>
                          {isResolved && (
                            <div className="mb-2.5 font-sora text-[11.5px] text-lttm bg-ltbg border border-ltb rounded-lg px-3 py-2">
                              Esta obligación ya estaba resuelta con evidencias. ¿Qué quieres hacer con el trabajo existente?
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResolution(item.id, 'preserved')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora text-[11.5px] font-medium border transition-all ${
                                dec?.resolution === 'preserved'
                                  ? 'bg-grdim text-gr border-grb'
                                  : 'text-lttm border-ltb hover:bg-ltbg hover:text-ltt'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              Conservar activa
                            </button>
                            <button
                              onClick={() => setResolution(item.id, 'archived')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora text-[11.5px] font-medium border transition-all ${
                                dec?.resolution === 'archived'
                                  ? 'bg-ordim text-or border-orb'
                                  : 'text-lttm border-ltb hover:bg-ltbg hover:text-ltt'
                              }`}
                            >
                              <Archive className="w-3 h-3" />
                              Archivar con nota
                            </button>
                          </div>
                          {dec?.resolution === 'archived' && (
                            <NoteInput
                              value={dec.resolution_note}
                              onChange={(v) => setNote(item.id, v)}
                              placeholder="Nota de cierre (requerida)"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Obligaciones eliminadas — auto-resueltas */}
              {removedAuto.length > 0 && removedCritical.length === 0 && (
                <div>
                  <div className="px-4 py-3 border-b border-ltb bg-ltcard2">
                    <span className="font-plex text-[10.5px] uppercase tracking-[0.7px] font-semibold text-or">
                      Obligaciones eliminadas ({removedAuto.length})
                    </span>
                  </div>
                </div>
              )}
              {removedAuto.length > 0 && (
                <div>
                  <SectionHeader
                    label={removedCritical.length > 0 ? `Auto-resueltas (${removedAuto.length})` : `Se archivarán automáticamente (${removedAuto.length})`}
                    count={removedAuto.length}
                    collapsed={autoCollapsed}
                    onToggle={() => setAutoCollapsed((v) => !v)}
                    accent="text-lttm"
                  />
                  {!autoCollapsed && (
                    <div className="divide-y divide-ltb">
                      {removedAuto.map((item) => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                          <span className="font-sora text-[12.5px] text-lttm">{item.obligation_label}</span>
                          <span className="font-plex text-[10.5px] text-lttm bg-ltcard2 border border-ltb px-2 py-0.5 rounded-full">
                            → Archivada
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sin cambios */}
              {unchanged.length > 0 && (
                <div>
                  <SectionHeader
                    label={`Sin cambios (${unchanged.length})`}
                    count={unchanged.length}
                    collapsed={unchangedCollapsed}
                    onToggle={() => setUnchangedCollapsed((v) => !v)}
                    accent="text-lttm"
                  />
                  {!unchangedCollapsed && (
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                      {unchanged.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center px-2.5 py-1 rounded-full font-plex text-[11px] bg-ltcard2 text-lttm border border-ltb"
                        >
                          {item.obligation_label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sin diffs (edge case) */}
              {diffs.length === 0 && (
                <div className="px-4 py-8 text-center font-sora text-[13px] text-lttm">
                  No hay cambios que reconciliar.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ltb bg-ltcard2 shrink-0">
          {confirmError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-dim border border-reb font-sora text-[11.5px] text-re">
              {confirmError}
            </div>
          )}
          {!canConfirm && !loading && (
            <div className="mb-3 font-sora text-[11.5px] text-lttm">
              Faltan decisiones en {pendingDecisions.length} obligación{pendingDecisions.length !== 1 ? 'es' : ''}.
            </div>
          )}
          <div className="flex gap-2 justify-between">
            <button
              onClick={handleCancel}
              disabled={isCancelling || isConfirming}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[7px] font-sora font-medium text-[12px] text-re border border-reb hover:bg-red-dim transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Cancelar reclasificación
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || isConfirming || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[7px] font-sora font-medium text-[12px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_8px_#00adef33] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Confirmar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
