import { useState } from 'react'
import type { RiskLevel, ClassificationProposal } from '@/types/classification'

const LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: 'prohibited', label: 'Prohibido' },
  { value: 'high',       label: 'Alto Riesgo' },
  { value: 'limited',    label: 'Riesgo Limitado' },
  { value: 'minimal',    label: 'Riesgo Mínimo' },
]

interface ConfirmationFormProps {
  proposal: ClassificationProposal
  isConfirming: boolean
  onConfirm: (level: RiskLevel, notes: string) => void
  onDiscard: () => void
}

export function ConfirmationForm({ proposal, isConfirming, onConfirm, onDiscard }: ConfirmationFormProps) {
  const [selectedLevel, setSelectedLevel] = useState<RiskLevel>(proposal.risk_level)
  const [notes, setNotes] = useState('')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
          Nivel de riesgo confirmado
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value as RiskLevel)}
          disabled={isConfirming}
          className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-[var(--cyan-border)] disabled:opacity-50"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
          Notas del revisor <span className="normal-case tracking-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isConfirming}
          placeholder="Justificación del ajuste o contexto adicional para la auditoría..."
          rows={3}
          className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[12.5px] text-ltt placeholder:text-lttm resize-none focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-[var(--cyan-border)] disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onConfirm(selectedLevel, notes)}
          disabled={isConfirming}
          className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora font-semibold text-[13px] hover:bg-[#00adef]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isConfirming && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Confirmar clasificación
        </button>
        <button
          onClick={onDiscard}
          disabled={isConfirming}
          className="px-4 py-2 rounded-[8px] border border-ltb bg-transparent font-sora text-[13px] text-lttm hover:bg-ltbg hover:text-ltt transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
