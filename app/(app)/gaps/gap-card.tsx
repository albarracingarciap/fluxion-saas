'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { UnifiedGapRecord, GapAssignableMember } from '@/lib/gaps/data'
import type { TaskGapStatus } from '@/lib/tasks/queries'

import { GapAssignmentPanel } from './gap-assignment-panel'
import { CreateGapTaskButton } from './create-gap-task-button'
import { LAYER_META, LAYER_LABELS, SEVERITY_META } from './gap-ui-constants'

function getGapSecondaryHref(gap: UnifiedGapRecord) {
  if (gap.layer === 'control' && gap.evaluation_id) {
    return `/inventario/${gap.system_id}/fmea/${gap.evaluation_id}/evaluar`
  }
  return `/inventario/${gap.system_id}`
}

function getGapSecondaryLabel(gap: UnifiedGapRecord) {
  if (gap.layer === 'control') return 'Ver evaluación'
  return 'Ver sistema'
}

type GapCardProps = {
  gap: UnifiedGapRecord
  members: GapAssignableMember[]
  taskStatus: TaskGapStatus | null
  selected?: boolean
  onToggleSelect?: (gapKey: string) => void
}

export function GapCard({ gap, members, taskStatus, selected, onToggleSelect }: GapCardProps) {
  const selectable = onToggleSelect !== undefined && gap.layer !== 'fmea'

  return (
    <div
      data-gap-id={gap.id}
      className={`rounded-[12px] border bg-ltcard hover:border-cyan-border hover:shadow-[0_4px_16px_rgba(0,74,173,0.08)] transition-all ${selected ? 'border-brand-cyan bg-cyan-dim2' : 'border-ltb'}`}
    >
      <div className="flex items-stretch gap-0">
        {selectable && (
          <button
            type="button"
            onClick={() => onToggleSelect(gap.key)}
            className={`w-10 shrink-0 rounded-l-[12px] flex items-center justify-center transition-colors ${selected ? 'bg-cyan-dim2' : 'hover:bg-ltbg'}`}
            aria-label={selected ? 'Deseleccionar gap' : 'Seleccionar gap'}
          >
            <span
              className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${selected ? 'bg-brand-cyan border-brand-cyan text-white' : 'border-ltb bg-white'}`}
            >
              {selected && (
                <svg viewBox="0 0 10 8" fill="none" className="w-2 h-2">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
        )}
        <div className={`w-1 shrink-0 ${selectable ? '' : 'rounded-l-[12px]'} ${LAYER_META[gap.layer].bar}`} />
        <div className="flex-1 px-4 py-4 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border shrink-0 ${LAYER_META[gap.layer].pill}`}>
                  {LAYER_LABELS[gap.layer]}
                </span>
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[gap.severity].badge}`}>
                  {SEVERITY_META[gap.severity].label}
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                  {gap.system_code}
                </span>
              </div>
              <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">{gap.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-2">{gap.context_label}</p>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mt-2 break-words">
                {gap.meta}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <span
                className={`font-plex text-[10px] uppercase tracking-[0.7px] ${
                  gap.overdue ? 'text-re' : gap.severity === 'alto' ? 'text-or' : 'text-lttm'
                }`}
              >
                {gap.overdue
                  ? 'Vencido'
                  : gap.due_date
                    ? typeof gap.days_until_due === 'number'
                      ? `${gap.days_until_due} días`
                      : 'Con plazo'
                    : 'Sin plazo'}
              </span>
              <span
                className={`font-sora text-[11px] font-medium px-3 py-1.5 rounded-[7px] border ${
                  gap.action_label.includes('Asignar') || gap.action_label.includes('Renovar')
                    ? 'bg-gradient-to-r from-brand-cyan to-brand-blue text-white border-transparent'
                    : 'bg-ltcard2 text-ltt2 border-ltb'
                }`}
              >
                {gap.action_label}
              </span>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3 mt-4">
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Sistema</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">{gap.system_name}</p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Responsable</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {gap.owner_name ?? 'Sin owner'}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltbg px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Plazo</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {gap.due_date
                  ? gap.overdue
                    ? `Vencido (${gap.due_date})`
                    : `${gap.due_date}${typeof gap.days_until_due === 'number' ? ` · ${gap.days_until_due} días` : ''}`
                  : 'Sin fecha objetivo'}
              </p>
            </div>
          </div>

          {gap.layer === 'normativo' && gap.causal_amplifiers && gap.causal_amplifiers.length > 0 && (
            <div className="mt-3 rounded-[10px] border border-orb bg-ordim px-3 py-2.5">
              <p className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-or mb-2">
                ⚠ {gap.causal_amplifiers.length} modo{gap.causal_amplifiers.length > 1 ? 's' : ''} activo{gap.causal_amplifiers.length > 1 ? 's' : ''} amplifica{gap.causal_amplifiers.length > 1 ? 'n' : ''} este incumplimiento
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gap.causal_amplifiers.map((amp) => (
                  <span
                    key={amp.failure_mode_id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${
                      (amp.s_actual ?? 0) >= 9 ? 'bg-red-dim border-reb text-re' : 'bg-ltcard border-ltb text-ltt2'
                    }`}
                    title={amp.failure_mode_name}
                  >
                    {amp.failure_mode_code}
                    {amp.s_actual !== null && <span className="opacity-70">· S={amp.s_actual}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-ltb">
            <p className="font-sora text-[12px] text-lttm">
              Origen: <span className="text-ltt font-medium">{gap.source_ref}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <GapAssignmentPanel
                mode="single"
                members={members}
                layer={gap.layer}
                id={gap.id}
                systemId={gap.system_id}
                currentOwnerId={gap.owner_id}
                currentDueDate={gap.due_date}
              />
              {gap.layer !== 'fmea' && (
                <CreateGapTaskButton
                  gap={{
                    id:           gap.id,
                    key:          gap.key,
                    layer:        gap.layer,
                    systemId:     gap.system_id,
                    title:        gap.title,
                    contextLabel: gap.context_label,
                    ownerId:      gap.owner_id,
                    dueDate:      gap.due_date,
                    severity:     gap.severity,
                  }}
                  initialTaskStatus={taskStatus}
                />
              )}
              <Link
                href={getGapSecondaryHref(gap)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
              >
                {getGapSecondaryLabel(gap)}
              </Link>
              <Link
                href={gap.detail_url}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[11px] hover:-translate-y-px transition-all"
              >
                {gap.action_label}
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
