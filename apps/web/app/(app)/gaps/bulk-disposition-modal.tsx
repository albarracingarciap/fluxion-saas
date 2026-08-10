'use client'

import { useState } from 'react'
import { X, ShieldCheck, MinusCircle, Loader2 } from 'lucide-react'
import type { UnifiedGapRecord } from '@/lib/gaps/data'
import { bulkSetGapDispositionAction } from './actions'
import { GapPortal } from './gap-portal'

type Props = {
  selectedGaps: UnifiedGapRecord[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkDispositionModal({ selectedGaps, onClose, onSuccess }: Props) {
  const [disposition, setDisposition] = useState<'accepted' | 'not_applicable'>('accepted')
  const [rationale, setRationale] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [resultCount, setResultCount] = useState(0)

  async function handleSubmit() {
    if (rationale.trim().length < 10) {
      setError('La justificación debe tener al menos 10 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await bulkSetGapDispositionAction({
      gaps: selectedGaps.map((g) => ({
        gapKey: g.key,
        gapLayer: g.layer,
        gapSourceId: g.id,
      })),
      disposition,
      rationale: rationale.trim(),
      expiresAt: expiresAt || null,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      setResultCount(result.count)
      setDone(true)
    }
  }

  if (done) {
    return (
      <GapPortal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
        <div className="relative w-full max-w-[440px] bg-ltcard border border-ltb rounded-[16px] shadow-[0_20px_60px_rgba(0,74,173,0.18)]">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-dim2 border border-cyan-border flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={22} className="text-brand-cyan" />
            </div>
            <p className="font-sora text-[15px] font-semibold text-ltt">
              {resultCount} gap{resultCount !== 1 ? 's' : ''} excluido{resultCount !== 1 ? 's' : ''}
            </p>
            <p className="font-sora text-[12px] text-ltt2 mt-2">
              La exclusión se aplicó. Los gaps ya no aparecerán en la cola activa.
            </p>
            <button
              type="button"
              onClick={onSuccess}
              className="mt-5 px-5 py-2.5 rounded-[9px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      </GapPortal>
    )
  }

  return (
    <GapPortal>
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
      <div className="relative w-full max-w-[480px] bg-ltcard border border-ltb rounded-[16px] shadow-[0_20px_60px_rgba(0,74,173,0.18)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ltb">
          <h2 className="font-sora text-[15px] font-semibold text-ltt">
            Excluir {selectedGaps.length} gap{selectedGaps.length !== 1 ? 's' : ''}
          </h2>
          <button type="button" onClick={onClose} className="text-lttm hover:text-ltt transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2.5">
            <p className="font-sora text-[12px] text-ltt2">
              Se excluirán{' '}
              <span className="font-semibold text-ltt">{selectedGaps.length} gaps</span> con la
              misma justificación y tipo de exclusión.
            </p>
          </div>

          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">
              Tipo de exclusión
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDisposition('accepted')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-[9px] border text-left transition-colors ${
                  disposition === 'accepted'
                    ? 'border-brand-cyan bg-cyan-dim2 text-brand-blue'
                    : 'border-ltb bg-ltbg text-ltt2 hover:border-cyan-border'
                }`}
              >
                <ShieldCheck size={14} className="shrink-0" />
                <div>
                  <p className="font-sora text-[12px] font-medium leading-none">Aceptado</p>
                  <p className="font-sora text-[11px] text-lttm mt-0.5">Riesgo conocido y aceptado</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDisposition('not_applicable')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-[9px] border text-left transition-colors ${
                  disposition === 'not_applicable'
                    ? 'border-brand-cyan bg-cyan-dim2 text-brand-blue'
                    : 'border-ltb bg-ltbg text-ltt2 hover:border-cyan-border'
                }`}
              >
                <MinusCircle size={14} className="shrink-0" />
                <div>
                  <p className="font-sora text-[12px] font-medium leading-none">No aplica</p>
                  <p className="font-sora text-[11px] text-lttm mt-0.5">Fuera del alcance</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-1.5">
              Justificación compartida <span className="text-re">*</span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Describe el motivo de exclusión (mín. 10 caracteres)…"
              rows={3}
              className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt placeholder:text-lttm resize-none focus:outline-none focus:border-brand-cyan"
            />
            <p className="font-sora text-[11px] text-lttm mt-1">
              {rationale.trim().length} / 10 caracteres mínimos
            </p>
          </div>

          <div>
            <label className="block font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-1.5">
              Caducidad de la exclusión{' '}
              <span className="normal-case text-lttm">(opcional)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt focus:outline-none focus:border-brand-cyan"
            />
            <p className="font-sora text-[11px] text-lttm mt-1">
              Si se indica, los gaps volverán a la cola activa en esa fecha.
            </p>
          </div>

          {error && (
            <p className="font-sora text-[12px] text-re bg-red-dim border border-reb rounded-[8px] px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-ltb">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[8px] border border-ltb text-lttm font-sora text-[13px] hover:text-ltt transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || rationale.trim().length < 10}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Guardando…' : `Excluir ${selectedGaps.length} gap${selectedGaps.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
    </GapPortal>
  )
}
