'use client'

import Link from 'next/link'
import { AlertTriangle, BarChart3, ListTodo } from 'lucide-react'
import type { TreatmentActionStatus } from '@/lib/fmea/treatment-plan'
import { getDaysFromToday, type EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import { ACTION_STATUS_META } from './treatment-plan-ui-constants'

type Props = {
  actions: EditableTreatmentAction[]
  deadline: string
  tasksTotal: number
  tasksDone: number
  systemId: string
}

export function PlanProgressPanel({ actions, deadline, tasksTotal, tasksDone }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const total = actions.length
  const completed = actions.filter((a) => ['completed', 'accepted'].includes(a.status)).length
  const inProgress = actions.filter((a) => a.status === 'in_progress').length
  const evidencePending = actions.filter((a) => a.status === 'evidence_pending').length
  const pending = actions.filter((a) => a.status === 'pending').length
  const cancelled = actions.filter((a) => a.status === 'cancelled').length
  const active = total - cancelled
  const pct = active > 0 ? Math.round((completed / active) * 100) : 0
  const daysRemaining = getDaysFromToday(deadline)

  const overdue = actions.filter(
    (a) => a.due_date && a.due_date < today && !['completed', 'accepted', 'cancelled'].includes(a.status)
  )

  return (
    <div className="mb-5 rounded-[12px] border border-ltb bg-ltcard overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[8px] border border-ltb bg-ltcard flex items-center justify-center text-lttm">
            <BarChart3 size={16} />
          </div>
          <div>
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-0.5">Progreso de ejecución</div>
            <div className="font-sora text-[13px] text-ltt2">Estado actual de las acciones del plan</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-fraunces text-[28px] text-ltt">{pct}%</span>
          {overdue.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border border-reb bg-red-dim font-plex text-[10px] uppercase tracking-[1px] text-re">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {overdue.length} vencida{overdue.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 pb-2">
        <div className="relative w-full h-[8px] bg-ltcard2 rounded-full overflow-hidden border border-ltb">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 bg-gradient-to-r from-[#00adef] to-[#2a9d55]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-plex text-[10px] text-lttm">
          <span>{completed} completada{completed !== 1 ? 's' : ''} de {active} activa{active !== 1 ? 's' : ''}</span>
          {cancelled > 0 && <span>{cancelled} cancelada{cancelled !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-ltb border-t border-ltb">
        {(
          [
            { key: 'completed' as const,        value: completed },
            { key: 'in_progress' as const,      value: inProgress },
            { key: 'evidence_pending' as const, value: evidencePending },
            { key: 'pending' as const,          value: pending },
            { key: 'cancelled' as const,        value: cancelled },
          ] as const
        ).map(({ key, value }) => (
          <div key={key} className="px-4 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1 truncate">
              {ACTION_STATUS_META[key].label}
            </div>
            <div className={`font-fraunces text-[22px] ${ACTION_STATUS_META[key].color}`}>{value}</div>
          </div>
        ))}

        <div className="px-4 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Días restantes</div>
          <div
            className={`font-fraunces text-[22px] ${
              daysRemaining === null
                ? 'text-lttm'
                : daysRemaining <= 0
                  ? 'text-re'
                  : daysRemaining <= 14
                    ? 'text-or'
                    : 'text-ltt'
            }`}
          >
            {daysRemaining === null ? '—' : daysRemaining <= 0 ? 'Vencido' : `${daysRemaining}d`}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="border-t border-ltb px-5 py-3">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">Acciones vencidas</div>
          <div className="space-y-1.5">
            {overdue.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-[8px] border border-reb bg-red-dim px-3 py-2"
              >
                <span className="font-sora text-[12.5px] text-ltt truncate min-w-0">{a.failure_mode_name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-plex text-[10px] uppercase tracking-[0.5px] text-lttm">
                    {ACTION_STATUS_META[a.status as TreatmentActionStatus]?.label ?? a.status}
                  </span>
                  <span className="font-plex text-[10px] text-re">{a.due_date}</span>
                </div>
              </div>
            ))}
            {overdue.length > 5 && (
              <p className="font-sora text-[12px] text-lttm">+{overdue.length - 5} más</p>
            )}
          </div>
        </div>
      )}

      {tasksTotal > 0 && (
        <div className="border-t border-ltb px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-lttm shrink-0" />
            <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">
              Tareas vinculadas · {tasksDone} / {tasksTotal} completadas
            </span>
            <div className="w-[80px] h-[4px] bg-ltcard2 rounded-full overflow-hidden border border-ltb">
              <div
                className="h-full bg-gradient-to-r from-[#00adef] to-[#2a9d55] rounded-full"
                style={{ width: `${Math.round((tasksDone / tasksTotal) * 100)}%` }}
              />
            </div>
          </div>
          <Link
            href="/tareas"
            className="font-sora text-[12px] text-brand-cyan hover:underline underline-offset-2 shrink-0"
          >
            Ver en Tareas →
          </Link>
        </div>
      )}
    </div>
  )
}
