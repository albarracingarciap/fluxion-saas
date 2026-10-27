'use client'

import { useState } from 'react'
import { X, ShieldCheck, MinusCircle } from 'lucide-react'
import type { UnifiedGapRecord } from '@/lib/gaps/data'
import { setGapDispositionAction } from './actions'
import { GAP_LAYER_EXCLUSION, gapExclusionNeedsApproval } from '@/lib/gaps/exclusion-rules'
import { LAYER_LABELS } from './gap-ui-constants'
import { GapPortal } from './gap-portal'

type Props = {
  gap: UnifiedGapRecord
  onClose: () => void
  onSuccess: () => void
}

export function GapDispositionModal({ gap, onClose, onSuccess }: Props) {
  const [disposition, setDisposition] = useState<'accepted' | 'not_applicable'>('accepted')
  const [rationale, setRationale] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // F-14 (B17d): una obligación se excluye sin caducidad; una evidencia caducada solo se pospone.
  const modo = GAP_LAYER_EXCLUSION[gap.layer]

  async function handleSubmit() {
    if (rationale.trim().length < 10) {
      setError('La justificación debe tener al menos 10 caracteres.')
      return
    }
    if (modo === 'posponer' && !expiresAt) {
      setError('Indica hasta qué fecha se pospone.')
      return
    }
    setLoading(true)
    setError(null)
    const result = await setGapDispositionAction({
      gapKey: gap.key,
      gapLayer: gap.layer,
      gapSourceId: gap.id,
      gapTitle: gap.title,
      disposition,
      rationale: rationale.trim(),
      expiresAt: modo === 'obligacion' ? null : expiresAt || null,
    })
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
    } else {
      onSuccess()
    }
  }

  return (
    <GapPortal>
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
      <div className="relative w-full max-w-[480px] bg-ltcard border border-ltb rounded-[16px] shadow-[0_20px_60px_rgba(0,74,173,0.18)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ltb">
          <h2 className="font-sora text-[15px] font-semibold text-ltt">
            {modo === 'posponer' ? 'Posponer gap' : 'Excluir obligación'}
          </h2>
          <button type="button" onClick={onClose} className="text-lttm hover:text-ltt transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2.5">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
              {LAYER_LABELS[gap.layer]} · {gap.system_code}
            </p>
            <p className="font-sora text-[13px] font-medium text-ltt mt-1 leading-snug">{gap.title}</p>
          </div>

          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">Tipo de exclusión</p>
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
              Justificación <span className="text-re">*</span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Describe el motivo de la exclusión (mín. 10 caracteres)…"
              rows={3}
              className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt placeholder:text-lttm resize-none focus:outline-none focus:border-brand-cyan"
            />
            <p className="font-sora text-[11px] text-lttm mt-1">
              {rationale.trim().length} / 10 caracteres mínimos
            </p>
          </div>

          {modo === 'obligacion' && (
            <p className="font-sora text-[11.5px] text-ltt2">
              La obligación pasa a Excluida en el sistema cuando la exclusión queda activa. Para recuperarla, reactiva el gap.
            </p>
          )}

          {modo === 'posponer' && (
          <div>
            <label className="block font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-1.5">
              Pospuesto hasta <span className="text-re">*</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt focus:outline-none focus:border-brand-cyan"
            />
            <p className="font-sora text-[11px] text-lttm mt-1">
              El gap vuelve a la cola activa en esa fecha.
            </p>
          </div>
          )}

          {gapExclusionNeedsApproval(gap.layer) && (
            <p className="font-sora text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2">
              Excluir un riesgo sin tratar o una obligación sin cubrir es aceptarlo: la exclusión pasa por
              Aprobaciones y el gap sigue en la cola hasta que se aprueba.
            </p>
          )}

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
            className="px-4 py-2 rounded-[8px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[13px] font-medium shadow-[0_2px_8px_rgba(0,173,239,0.3)] hover:-translate-y-px transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? 'Guardando…' : modo === 'posponer' ? 'Posponer' : 'Excluir obligación'}
          </button>
        </div>
      </div>
    </div>
    </GapPortal>
  )
}
