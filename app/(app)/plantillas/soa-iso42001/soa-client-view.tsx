'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { SoAControlRecord } from '@/lib/templates/data'
import { Check, X, ShieldAlert, Settings2, Loader2, ArrowRight, Sparkles } from 'lucide-react'
import { updateSoAControl, suggestSoAJustification } from './actions'

type Props = {
  controls: SoAControlRecord[]
  aiSystems: { id: string; name: string; internal_id: string }[]
  evidences: { id: string; title: string; ai_system_id: string }[]
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  not_started: { label: 'No iniciado', tone: 'neutral' },
  planned: { label: 'Planificado', tone: 'blue' },
  in_progress: { label: 'En progreso', tone: 'amber' },
  implemented: { label: 'Implantado', tone: 'green' },
  externalized: { label: 'Externalizado', tone: 'cyan' },
}

export function SoAClientView({ controls, aiSystems, evidences }: Props) {
  const [selectedControl, setSelectedControl] = useState<SoAControlRecord | null>(null)

  const groupedControls = useMemo(() => {
    const groups: Record<string, SoAControlRecord[]> = {}
    controls.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = []
      groups[c.group].push(c)
    })
    return groups
  }, [controls])

  return (
    <>
      <div className="flex flex-col gap-6">
        {Object.entries(groupedControls).map(([groupName, groupControls]) => (
          <section key={groupName} className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
              <h2 className="font-sora text-[14px] font-semibold text-ltt">{groupName}</h2>
            </div>
            <div className="flex flex-col">
              {groupControls.map((control) => (
                <button
                  key={control.id}
                  onClick={() => setSelectedControl(control)}
                  className="px-5 py-4 text-left border-b border-ltb last:border-b-0 hover:bg-ltbg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border border-ltb bg-ltcard text-lttm">
                        {control.id}
                      </span>
                      {!control.isApplicable ? (
                        <span className="font-sora text-[11px] text-ltt2 bg-ltcard2 px-2 py-0.5 rounded border border-ltb">Excluido</span>
                      ) : (
                        <Badge tone={STATUS_LABELS[control.status].tone}>
                          {STATUS_LABELS[control.status].label}
                        </Badge>
                      )}
                    </div>
                    <p className={`font-sora text-[13px] ${!control.isApplicable ? 'text-ltt2 line-through opacity-70' : 'text-ltt font-medium'}`}>
                      {control.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {control.linkedSystemIds.length > 0 && control.isApplicable ? (
                      <span className="font-sora text-[11px] text-brand-cyan">
                        {control.linkedSystemIds.length} sist. vinculados
                      </span>
                    ) : null}
                    <ArrowRight size={14} className="text-lttm group-hover:text-brand-cyan transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {selectedControl && typeof document !== 'undefined' && createPortal(
        <SoAEditSlideOver
          control={selectedControl}
          aiSystems={aiSystems}
          evidences={evidences}
          onClose={() => setSelectedControl(null)}
        />,
        document.body
      )}
    </>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  const toneMap: Record<string, string> = {
    neutral: 'bg-ltbg border-ltb text-ltt2',
    blue: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    amber: 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]',
    green: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]',
    cyan: 'bg-[#f8fafc] border-[#cbd5e1] text-[#475569]',
  }
  return <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border ${toneMap[tone] || toneMap.neutral}`}>{children}</span>
}

function SoAEditSlideOver({
  control,
  aiSystems,
  evidences,
  onClose,
}: {
  control: SoAControlRecord
  aiSystems: { id: string; name: string }[]
  evidences: { id: string; title: string; ai_system_id: string }[]
  onClose: () => void
}) {
  const [isApplicable, setIsApplicable] = useState(control.isApplicable)
  const [validationEvidenceId, setValidationEvidenceId] = useState<string>(control.validationEvidenceId || '')
  const [justification, setJustification] = useState(control.justification || '')
  const [status, setStatus] = useState(control.status)
  const [notes, setNotes] = useState(control.notes || '')
  const [linkedSystems, setLinkedSystems] = useState<Set<string>>(new Set(control.linkedSystemIds))
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleSystem = (id: string) => {
    const next = new Set(linkedSystems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setLinkedSystems(next)
  }

  const handleSave = async () => {
    if (!control.dbId) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await updateSoAControl({
        id: control.dbId,
        isApplicable,
        justification,
        status,
        ownerUserId: control.ownerUserId,
        notes: notes || null,
        validationEvidenceId: validationEvidenceId || null,
        linkedSystemIds: Array.from(linkedSystems),
      })
      if (res.error) setError(res.error)
      else onClose()
    } catch (e) {
      setError('Error inesperado al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSuggest = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await suggestSoAJustification({
        controlId: control.id,
        linkedSystemIds: Array.from(linkedSystems),
        isApplicable
      })
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setJustification(res.data)
      }
    } catch (e) {
      setError('No se pudo generar la sugerencia')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#001024]/20 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-ltcard border-l border-ltb shadow-[-10px_0_40px_rgba(0,0,0,0.06)] z-[101] flex flex-col animate-slideinright">
        <div className="px-6 py-5 border-b border-ltb flex items-start justify-between bg-ltbg">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-0.5 rounded border border-ltb bg-ltcard text-lttm">
                {control.id}
              </span>
              <span className="font-sora text-[11px] text-ltt2">{control.group}</span>
            </div>
            <h3 className="font-sora text-[16px] font-semibold text-ltt leading-[1.3]">{control.title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-ltb text-lttm transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-dim border border-reb text-re text-[13px] font-sora">
              {error}
            </div>
          )}

          <div className="bg-ltbg border border-ltb rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="font-sora text-[14px] font-semibold text-ltt">Aplicabilidad</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">¿Aplica este control a tu SGIA?</p>
            </div>
            <button
              onClick={() => setIsApplicable(!isApplicable)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isApplicable ? 'bg-brand-cyan' : 'bg-ltb'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isApplicable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-sora text-[13px] font-semibold text-ltt block">
                Justificación de {isApplicable ? 'aplicabilidad' : 'exclusión'}
              </label>
              <button
                onClick={handleSuggest}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0F7FA]/50 border border-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan hover:text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span className="font-sora text-[11px] font-medium">Sugerir con IA</span>
              </button>
            </div>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Razona por qué aplica o se excluye en base a tu contexto..."
              className="w-full h-24 rounded-[10px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan resize-none"
            />
          </div>

          <div className={`space-y-6 transition-opacity ${!isApplicable ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Estado de implantación</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-[46px] rounded-[10px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              >
                {Object.entries(STATUS_LABELS).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div className={`space-y-2 transition-opacity ${linkedSystems.size === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="font-sora text-[13px] font-semibold text-ltt block">Evidencia asociada</label>
              <select
                value={validationEvidenceId}
                onChange={(e) => setValidationEvidenceId(e.target.value)}
                className="w-full h-[46px] rounded-[10px] border border-ltb bg-ltcard px-4 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              >
                <option value="">
                  {linkedSystems.size === 0 
                    ? 'Selecciona sistemas vinculados abajo primero' 
                    : 'Selecciona una evidencia (opcional)'}
                </option>
                {evidences
                  .filter((ev) => linkedSystems.has(ev.ai_system_id))
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))
                }
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-sora text-[13px] font-semibold text-ltt block">Observaciones / Acciones pendientes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica cualquier observación o acción pendiente para este control..."
                className="w-full h-24 rounded-[10px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[13px] text-ltt focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan resize-none"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-sora text-[13px] font-semibold text-ltt block">Sistemas vinculados</label>
                <p className="font-sora text-[11px] text-ltt2 mt-1">
                  Selecciona a qué sistemas de IA de tu inventario afecta o restringe concretamente este control.
                </p>
              </div>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto p-1">
                {aiSystems.length === 0 ? (
                  <p className="text-[12px] text-ltt2 italic">No hay sistemas en el inventario.</p>
                ) : (
                  aiSystems.map((sys) => {
                    const isLinked = linkedSystems.has(sys.id)
                    return (
                      <button
                        key={sys.id}
                        onClick={() => handleToggleSystem(sys.id)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          isLinked ? 'bg-cyan-dim border-cyan-border text-brand-cyan' : 'bg-ltcard border-ltb text-ltt hover:bg-ltbg'
                        }`}
                      >
                        <span className="font-sora text-[13px]">{sys.name}</span>
                        {isLinked && <Check size={14} />}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ltb bg-ltcard2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center min-w-[120px] px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar control'}
          </button>
        </div>
      </div>
    </>
  )
}
