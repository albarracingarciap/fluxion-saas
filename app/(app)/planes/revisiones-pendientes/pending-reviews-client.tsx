'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, RefreshCw } from 'lucide-react'
import type { PendingReviewAction } from '@/lib/treatment-plans/data'
import type { ReviewStatus } from '@/lib/fmea/treatment-plan'

type UrgencyFilter = 'all' | 'overdue' | 'upcoming'

const URGENCY_META: Record<Exclude<ReviewStatus, 'not_required'>, {
  label: string
  pill: string
}> = {
  overdue_review: { label: 'Vencida',        pill: 'border-reb bg-red-dim text-re' },
  due:            { label: 'Vence hoy',       pill: 'border-reb bg-red-dim text-re' },
  upcoming:       { label: 'Próxima',         pill: 'border-orb bg-ordim text-or' },
}

const OPTION_LABEL: Record<string, string> = {
  aceptar: 'Aceptar',
  diferir:  'Diferir',
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

type SystemGroup = {
  system_id: string
  system_name: string
  system_internal_id: string | null
  plans: PlanGroup[]
}

type PlanGroup = {
  plan_id: string
  plan_code: string
  plan_status: string
  system_id: string
  evaluation_id: string
  actions: PendingReviewAction[]
}

function groupActions(actions: PendingReviewAction[]): SystemGroup[] {
  const systemMap = new Map<string, SystemGroup>()
  const planMap = new Map<string, PlanGroup>()

  for (const action of actions) {
    if (!planMap.has(action.plan_id)) {
      planMap.set(action.plan_id, {
        plan_id: action.plan_id,
        plan_code: action.plan_code,
        plan_status: action.plan_status,
        system_id: action.system_id,
        evaluation_id: action.evaluation_id,
        actions: [],
      })
    }
    planMap.get(action.plan_id)!.actions.push(action)

    if (!systemMap.has(action.system_id)) {
      systemMap.set(action.system_id, {
        system_id: action.system_id,
        system_name: action.system_name,
        system_internal_id: action.system_internal_id,
        plans: [],
      })
    }
  }

  // Attach plans to systems
  for (const plan of Array.from(planMap.values())) {
    systemMap.get(plan.system_id)!.plans.push(plan)
  }

  return Array.from(systemMap.values())
}

export function PendingReviewsClient({ actions }: { actions: PendingReviewAction[] }) {
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all')

  const filtered = useMemo(() => {
    if (urgencyFilter === 'all') return actions
    if (urgencyFilter === 'overdue') {
      return actions.filter((a) => a.review_status === 'overdue_review' || a.review_status === 'due')
    }
    return actions.filter((a) => a.review_status === 'upcoming')
  }, [actions, urgencyFilter])

  const groups = useMemo(() => groupActions(filtered), [filtered])

  const overdueCount = actions.filter((a) => a.review_status === 'overdue_review' || a.review_status === 'due').length
  const upcomingCount = actions.filter((a) => a.review_status === 'upcoming').length

  return (
    <div className="space-y-5">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">Urgencia:</span>
        <FilterChip
          label={`Todas (${actions.length})`}
          active={urgencyFilter === 'all'}
          onClick={() => setUrgencyFilter('all')}
        />
        <FilterChip
          label={`Vencidas (${overdueCount})`}
          active={urgencyFilter === 'overdue'}
          tone="re"
          onClick={() => setUrgencyFilter('overdue')}
        />
        <FilterChip
          label={`Próximas (${upcomingCount})`}
          active={urgencyFilter === 'upcoming'}
          tone="or"
          onClick={() => setUrgencyFilter('upcoming')}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[12px] border border-ltb bg-ltcard px-6 py-8 text-center">
          <p className="font-sora text-[13px] text-lttm">
            No hay acciones que coincidan con el filtro seleccionado.
          </p>
        </div>
      ) : (
        groups.map((system) => (
          <div key={system.system_id} className="space-y-3">
            {/* System header */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-ltb" />
              <span className="font-plex text-[11px] uppercase tracking-[1.2px] text-lttm shrink-0">
                {system.system_name}
                {system.system_internal_id ? ` · ${system.system_internal_id}` : ''}
              </span>
              <div className="h-px flex-1 bg-ltb" />
            </div>

            {system.plans.map((plan) => (
              <div
                key={plan.plan_id}
                className="rounded-[12px] border border-ltb bg-ltcard overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                {/* Plan header */}
                <div className="px-4 py-3 bg-ltcard2 border-b border-ltb flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-plex text-[11px] uppercase tracking-[1px] text-ltt font-medium">
                      {plan.plan_code}
                    </span>
                    <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">
                      {plan.actions.length} {plan.actions.length === 1 ? 'acción' : 'acciones'}
                    </span>
                  </div>
                  <Link
                    href={`/inventario/${plan.system_id}/fmea/${plan.evaluation_id}/plan`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg font-sora text-[11.5px] text-lttm hover:border-brand-blue hover:text-brand-blue transition-colors"
                  >
                    Ir al plan
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {/* Actions */}
                <div className="divide-y divide-ltb">
                  {plan.actions.map((action) => (
                    <ActionReviewRow key={action.action_id} action={action} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

function ActionReviewRow({ action }: { action: PendingReviewAction }) {
  const rs = action.review_status
  const urgencyMeta = URGENCY_META[rs]
  const isOverdue = action.days_until_review < 0
  const daysAbs = Math.abs(action.days_until_review)

  return (
    <div className="px-4 py-3 flex items-center gap-4 hover:bg-ltbg transition-colors">
      {/* S score */}
      <div className={`w-9 h-9 rounded-[8px] border flex items-center justify-center font-fraunces text-[18px] shrink-0 ${
        action.s_actual_at_creation >= 9
          ? 'border-reb bg-red-dim text-re'
          : action.s_actual_at_creation >= 7
            ? 'border-orb bg-ordim text-or'
            : 'border-ltb bg-ltcard2 text-lttm'
      }`}>
        {action.s_actual_at_creation}
      </div>

      {/* Failure mode info */}
      <div className="min-w-0 flex-1">
        <p className="font-sora text-[13px] font-semibold text-ltt leading-snug truncate">
          {action.failure_mode_name}
        </p>
        <p className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mt-0.5">
          {action.failure_mode_code}
        </p>
      </div>

      {/* Option badge */}
      <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-orb bg-ordim font-plex text-[10px] uppercase tracking-[1px] text-or shrink-0">
        {OPTION_LABEL[action.option] ?? action.option}
      </span>

      {/* Review date + urgency */}
      <div className="text-right shrink-0">
        <div className="flex items-center gap-1.5 justify-end">
          <Clock size={11} className={isOverdue ? 'text-re' : 'text-lttm'} />
          <span className={`font-plex text-[11px] ${isOverdue ? 'text-re font-semibold' : 'text-lttm'}`}>
            {formatDate(action.review_due_date)}
          </span>
        </div>
        <p className={`font-plex text-[10px] mt-0.5 ${isOverdue ? 'text-re' : 'text-lttm'}`}>
          {action.days_until_review === 0
            ? 'Vence hoy'
            : isOverdue
              ? `Vencida hace ${daysAbs} d`
              : `En ${daysAbs} d`}
        </p>
      </div>

      {/* Urgency badge */}
      {urgencyMeta && (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[0.8px] shrink-0 ${urgencyMeta.pill}`}>
          <RefreshCw size={9} />
          {urgencyMeta.label}
        </span>
      )}

      {/* Review count */}
      {action.review_count > 0 && (
        <span className="font-plex text-[10px] text-lttm shrink-0">
          {action.review_count} {action.review_count === 1 ? 'revisión' : 'revisiones'} previas
        </span>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  tone,
  onClick,
}: {
  label: string
  active: boolean
  tone?: 're' | 'or'
  onClick: () => void
}) {
  const activeClass =
    tone === 're'
      ? 'bg-red-dim border-reb text-re'
      : tone === 'or'
        ? 'bg-ordim border-orb text-or'
        : 'bg-cyan-dim border-cyan-border text-brand-cyan'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-[7px] border font-plex text-[10.5px] uppercase tracking-[1px] transition-colors ${
        active ? activeClass : 'bg-ltcard border-ltb text-lttm hover:border-cyan-border hover:text-ltt'
      }`}
    >
      {label}
    </button>
  )
}
