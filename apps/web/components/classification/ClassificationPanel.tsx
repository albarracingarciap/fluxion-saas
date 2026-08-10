'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ClassificationProposal, PanelState, RiskLevel } from '@/types/classification'
import { RiskLevelBadge } from './RiskLevelBadge'
import { StreamingReasoning } from './StreamingReasoning'
import { RagSourcesAccordion } from './RagSourcesAccordion'
import { ConfirmationForm } from './ConfirmationForm'

const CONFIDENCE_MAP: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3 }
const LEVEL_MAP: Record<string, RiskLevel> = {
  prohibited:   'prohibited',
  high_risk:    'high',
  limited_risk: 'limited',
  minimal_risk: 'minimal',
  high:         'high',
  limited:      'limited',
  minimal:      'minimal',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendProposal(raw: Record<string, any>, sessionId: string, systemId: string): ClassificationProposal {
  const riskLevel: RiskLevel = LEVEL_MAP[raw.aiact_risk_level] ?? 'pending'
  const confidence = typeof raw.confidence === 'number'
    ? raw.confidence
    : CONFIDENCE_MAP[raw.confidence] ?? 0.5

  const basisParts: string[] = []
  if (Array.isArray(raw.annexiii_items) && raw.annexiii_items.length > 0) {
    basisParts.push(...raw.annexiii_items.map((i: { section?: string }) => i.section ?? '').filter(Boolean))
  }
  if (raw.annexii_applies) basisParts.push('Anexo II')

  return {
    proposal_id:           sessionId,
    system_id:             systemId,
    risk_level:            riskLevel,
    confidence,
    reasoning:             raw.classification_note ?? '',
    rag_sources:           [],
    applicable_articles:   Array.isArray(raw.normative_refs)
      ? raw.normative_refs.map((r: { article?: string }) => r.article ?? '').filter(Boolean)
      : [],
    obligations:           Array.isArray(raw.transparency_obligations) ? raw.transparency_obligations : [],
    requires_human_review: raw.confidence === 'low' ||
      (Array.isArray(raw.flags) && raw.flags.some((f: { severity?: string }) => f.severity === 'error')),
    classification_basis:  basisParts.join(' / ') || (raw.aiact_risk_level ?? ''),
  }
}

export interface ClassificationPanelProps {
  systemId: string
  organizationId: string
  currentLevel: RiskLevel
  currentBasis: string
  onConfirmed: (level: RiskLevel, summary: string) => void
  isOpen: boolean
  onClose: () => void
}

const LEVEL_BORDER: Record<RiskLevel, string> = {
  prohibited: 'border-l-re',
  high:       'border-l-re',
  limited:    'border-l-or',
  minimal:    'border-l-gr',
  pending:    'border-l-ltbl',
}

export function ClassificationPanel({
  systemId,
  organizationId,
  currentLevel,
  currentBasis,
  onConfirmed,
  isOpen,
  onClose,
}: ClassificationPanelProps) {
  const [phase, setPhase] = useState<PanelState>('idle')
  const [reasoningText, setReasoningText] = useState('')
  const [proposal, setProposal] = useState<ClassificationProposal | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort()
      setPhase('idle')
      setReasoningText('')
      setProposal(null)
      setErrorMsg(null)
      setConfirmedAt(null)
    } else {
      startClassification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  async function startClassification() {
    if (!systemId || !organizationId) return

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setErrorMsg('Sesión expirada. Por favor recarga la página.')
      setPhase('error')
      return
    }

    abortRef.current = new AbortController()
    setPhase('connecting')
    setReasoningText('')
    setProposal(null)
    setErrorMsg(null)

    let retried = false

    async function doFetch() {
      try {
        const response = await fetch('/api/agent/classify-system', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system_id: systemId, force_reclassify: true }),
          signal: abortRef.current!.signal,
        })

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `Error ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No stream body')
        const decoder = new TextDecoder()
        let buffer = ''

        setPhase('thinking')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let event: Record<string, any>
            try { event = JSON.parse(raw) } catch { continue }

            // delta = chunk de texto del LLM (sin campo type)
            if ('delta' in event) {
              setPhase('streaming')
              setReasoningText((prev) => prev + (event.delta ?? ''))
            } else if (event.type === 'complete' && event.proposal) {
              setProposal(mapBackendProposal(event.proposal, event.session_id ?? '', systemId))
              setPhase('proposal')
            } else if (event.type === 'error') {
              setErrorMsg(event.message ?? 'Error desconocido del agente.')
              setPhase('error')
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        if (!retried) {
          retried = true
          await doFetch()
          return
        }
        const message = err instanceof Error ? err.message : 'Error de red.'
        setErrorMsg(message)
        setPhase('error')
      }
    }

    await doFetch()
  }

  async function handleConfirm(level: RiskLevel, _reviewerNotes: string) {
    if (!proposal) return
    setPhase('confirming')

    try {
      const res = await fetch('/api/agent/classify-system/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:           proposal.proposal_id,
          system_id:            systemId,
          risk_level:           level,
          classification_basis: proposal.classification_basis,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Error ${res.status}`)
      }

      const now = new Date().toLocaleString('es-ES')
      setConfirmedAt(now)
      setPhase('confirmed')
      const summary = proposal
        ? `El agente clasificó el sistema como ${level}. ${proposal.classification_basis}`
        : `Clasificación confirmada por agente IA.`
      onConfirmed(level, summary)

      setTimeout(() => { onClose() }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al confirmar.'
      setErrorMsg(message)
      setPhase('error')
    }
  }

  if (!isOpen) return null

  const borderColor = proposal
    ? LEVEL_BORDER[proposal.risk_level]
    : LEVEL_BORDER[currentLevel]

  return (
    <div className={`mt-3 border-l-4 ${borderColor} rounded-r-[10px] bg-ltcard border border-ltb border-l-0 p-5 flex flex-col gap-4 animate-fadein`}>

      {/* ── connecting / thinking ── */}
      {(phase === 'connecting' || phase === 'thinking') && (
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-ltbl border-t-brand-cyan rounded-full animate-spin shrink-0" />
          <span className="font-sora text-[13px] text-ltt2 animate-pulse-custom">
            Consultando base regulatoria...
          </span>
        </div>
      )}

      {/* ── streaming ── */}
      {phase === 'streaming' && (
        <div className="flex flex-col gap-2">
          <div className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
            Razonamiento del agente
          </div>
          <StreamingReasoning text={reasoningText} />
        </div>
      )}

      {/* ── proposal ── */}
      {(phase === 'proposal' || phase === 'confirming') && proposal && (
        <div className="flex flex-col gap-4">

          {/* Comparación actual vs propuesta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[8px] border border-ltb bg-ltcard2 p-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">
                Clasificación actual
              </div>
              <RiskLevelBadge level={currentLevel} size="sm" />
              <div className="font-plex text-[10.5px] text-lttm mt-1.5">{currentBasis || '—'}</div>
            </div>
            <div className="rounded-[8px] border border-ltb bg-ltcard2 p-3">
              <div className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">
                Propuesta del agente
              </div>
              <RiskLevelBadge level={proposal.risk_level} size="sm" />
              <div className="font-plex text-[10.5px] text-lttm mt-1.5">{proposal.classification_basis}</div>
            </div>
          </div>

          {/* Confianza */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">Confianza</span>
              <span className="font-plex text-[11px] text-ltt2">{Math.round(proposal.confidence * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-ltb overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-cyan transition-all duration-500"
                style={{ width: `${Math.round(proposal.confidence * 100)}%` }}
              />
            </div>
          </div>

          {/* Aviso revisión humana */}
          {proposal.requires_human_review && (
            <div className="flex items-start gap-2.5 rounded-[8px] border border-orb bg-ordim px-3 py-2.5">
              <AlertTriangle size={14} className="text-or shrink-0 mt-0.5" />
              <span className="font-sora text-[12px] text-or">
                Este sistema requiere revisión humana antes de confirmar la clasificación.
              </span>
            </div>
          )}

          {/* Razonamiento */}
          {(reasoningText || proposal.reasoning) && (
            <div className="flex flex-col gap-1.5">
              <div className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
                Razonamiento
              </div>
              <div className="max-h-[200px] overflow-y-auto font-sora text-[12.5px] text-ltt2 leading-relaxed bg-ltcard2 border border-ltb rounded-[8px] p-3">
                {proposal.reasoning || reasoningText}
              </div>
            </div>
          )}

          {/* Artículos aplicables */}
          {proposal.applicable_articles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
                Artículos aplicables
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {proposal.applicable_articles.map((art) => (
                  <span
                    key={art}
                    className="inline-flex items-center px-2 py-0.5 rounded-full font-plex text-[10px] bg-redim text-re border border-reb"
                  >
                    {art}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Obligaciones */}
          {proposal.obligations.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-lttm">
                Obligaciones identificadas
              </div>
              <ul className="flex flex-col gap-1">
                {proposal.obligations.map((obl) => (
                  <li key={obl} className="flex items-start gap-2 font-sora text-[12px] text-ltt2">
                    <CheckCircle2 size={12} className="text-gr mt-0.5 shrink-0" />
                    {obl}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fuentes RAG */}
          <RagSourcesAccordion sources={proposal.rag_sources} />

          {/* Formulario de confirmación */}
          <div className="border-t border-ltb pt-4">
            <ConfirmationForm
              proposal={proposal}
              isConfirming={phase === 'confirming'}
              onConfirm={handleConfirm}
              onDiscard={onClose}
            />
          </div>
        </div>
      )}

      {/* ── confirmed ── */}
      {phase === 'confirmed' && proposal && (
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-gr shrink-0" />
          <div>
            <div className="font-sora text-[13px] font-semibold text-ltt">Clasificación registrada</div>
            <div className="font-plex text-[11px] text-lttm mt-0.5">{confirmedAt}</div>
          </div>
          <div className="ml-auto">
            <RiskLevelBadge level={proposal.risk_level} size="md" />
          </div>
        </div>
      )}

      {/* ── error ── */}
      {phase === 'error' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 rounded-[8px] border border-reb bg-redim px-3 py-2.5">
            <AlertTriangle size={14} className="text-re shrink-0 mt-0.5" />
            <span className="font-sora text-[12px] text-re">{errorMsg ?? 'Error desconocido.'}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={startClassification}
              className="px-3.5 py-1.5 rounded-[7px] font-sora font-medium text-[12px] bg-brand-cyan text-white hover:bg-[#00adef]/90 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[7px] font-sora font-medium text-[12px] border border-ltb text-lttm hover:bg-ltbg hover:text-ltt transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
