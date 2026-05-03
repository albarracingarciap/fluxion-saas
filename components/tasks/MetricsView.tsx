'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  BarChart2, Target, ListTodo, Shield,
} from 'lucide-react'
import type { TaskRow, TaskStatus, TaskPriority, TaskSourceType } from '@/lib/tasks/types'
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_SOURCE_LABELS,
} from '@/lib/tasks/types'
import { computeTaskMetrics } from '@/lib/tasks/metrics'

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  if (total === 0) return 0
  return Math.round((n / total) * 100)
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex-1 h-2 bg-ltbg rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo:        'bg-lttm',
  in_progress: 'bg-brand-cyan',
  blocked:     'bg-re',
  in_review:   'bg-or',
  done:        'bg-gr',
  cancelled:   'bg-lttm',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:      'bg-lttm',
  medium:   'bg-brand-cyan',
  high:     'bg-or',
  critical: 'bg-re',
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-5 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center ${accent ?? 'bg-cyan-dim'}`}>
        <Icon className={`w-4.5 h-4.5 ${accent ? 'text-white' : 'text-brand-cyan'}`} />
      </div>
      <div>
        <p className="font-plex text-[11px] uppercase tracking-[0.8px] text-lttm">{label}</p>
        <p className="font-sora text-[28px] font-semibold text-ltt leading-none mt-1">{value}</p>
        {sub && <p className="font-sora text-[11px] text-lttm mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Row bar for breakdown ────────────────────────────────────────────────────

function BreakdownRow({
  label,
  value,
  total,
  barColor,
}: {
  label: string
  value: number
  total: number
  barColor: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-sora text-[12px] text-ltt w-28 shrink-0 truncate">{label}</span>
      <Bar value={value} max={total} color={barColor} />
      <span className="font-sora text-[12px] text-lttm w-8 text-right">{value}</span>
      <span className="font-plex text-[11px] text-lttm w-8 text-right">{pct(value, total)}%</span>
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-2 border-b border-ltb">
        <Icon className="w-4 h-4 text-brand-cyan" />
        <h3 className="font-sora text-[13px] font-semibold text-ltt">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Weekly trend ─────────────────────────────────────────────────────────────

function WeeklyTrend({ buckets }: { buckets: { label: string; created: number; completed: number }[] }) {
  const maxVal = Math.max(...buckets.flatMap(b => [b.created, b.completed]), 1)

  return (
    <div className="flex items-end gap-2 h-32">
      {buckets.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end gap-0.5 h-24">
            {/* created bar */}
            <div className="flex-1 flex items-end">
              <div
                className="w-full rounded-t-[3px] bg-brand-cyan/50 transition-all duration-500"
                style={{ height: `${Math.round((b.created / maxVal) * 100)}%` }}
                title={`Creadas: ${b.created}`}
              />
            </div>
            {/* completed bar */}
            <div className="flex-1 flex items-end">
              <div
                className="w-full rounded-t-[3px] bg-gr/70 transition-all duration-500"
                style={{ height: `${Math.round((b.completed / maxVal) * 100)}%` }}
                title={`Completadas: ${b.completed}`}
              />
            </div>
          </div>
          <span className="font-plex text-[9px] text-lttm text-center leading-tight">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function MetricsView({ tasks }: { tasks: TaskRow[] }) {
  const m = useMemo(() => computeTaskMetrics(tasks), [tasks])

  const totalClosed = m.completedOnTime + m.completedLate
  const inFlight = m.byStatus.todo + m.byStatus.in_progress + m.byStatus.blocked + m.byStatus.in_review

  const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled']
  const priorityOrder: TaskPriority[] = ['critical', 'high', 'medium', 'low']
  const sourceOrder: TaskSourceType[] = ['manual', 'treatment_action', 'gap', 'gap_group', 'evaluation', 'fmea_item']

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="border-b border-ltb bg-ltcard">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            href="/tareas"
            className="flex items-center gap-1.5 text-lttm hover:text-ltt transition-colors font-sora text-[13px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Tareas
          </Link>
          <span className="text-ltb">·</span>
          <div>
            <h1 className="font-sora text-[18px] font-semibold text-ltt">Métricas de cumplimiento</h1>
            <p className="font-sora text-[12px] text-lttm">Análisis de rendimiento y SLA basado en {m.total} tareas</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={ListTodo}
            label="Total tareas"
            value={m.total}
            sub={`${inFlight} activas`}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Completadas"
            value={m.byStatus.done}
            sub={`${pct(m.byStatus.done, m.total)}% del total`}
            accent="bg-gr"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Vencidas"
            value={m.overdue}
            sub="activas sin completar"
            accent={m.overdue > 0 ? 'bg-re' : undefined}
          />
          <KpiCard
            icon={Target}
            label="SLA cumplimiento"
            value={`${m.slaPercent}%`}
            sub={`${totalClosed} cerradas — ${m.completedLate} tardías`}
            accent={m.slaPercent >= 80 ? 'bg-gr' : 'bg-or'}
          />
        </div>

        {/* Middle row: status + priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Por estado" icon={BarChart2}>
            <div className="flex flex-col gap-3">
              {statusOrder.map(s => (
                <BreakdownRow
                  key={s}
                  label={TASK_STATUS_LABELS[s]}
                  value={m.byStatus[s] ?? 0}
                  total={m.total}
                  barColor={STATUS_COLORS[s]}
                />
              ))}
            </div>
          </Section>

          <Section title="Por prioridad" icon={Shield}>
            <div className="flex flex-col gap-3">
              {priorityOrder.map(p => (
                <BreakdownRow
                  key={p}
                  label={TASK_PRIORITY_LABELS[p]}
                  value={m.byPriority[p] ?? 0}
                  total={m.total}
                  barColor={PRIORITY_COLORS[p]}
                />
              ))}
            </div>
            {/* SLA visual */}
            <div className="mt-2 pt-4 border-t border-ltb flex flex-col gap-2">
              <p className="font-plex text-[11px] uppercase tracking-[0.6px] text-lttm">Tiempo de cierre (SLA)</p>
              <div className="flex items-center gap-3">
                <span className="font-sora text-[12px] text-gr w-28 shrink-0">A tiempo</span>
                <Bar value={m.completedOnTime} max={totalClosed} color="bg-gr" />
                <span className="font-sora text-[12px] text-lttm w-8 text-right">{m.completedOnTime}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-sora text-[12px] text-re w-28 shrink-0">Tarde</span>
                <Bar value={m.completedLate} max={totalClosed} color="bg-re" />
                <span className="font-sora text-[12px] text-lttm w-8 text-right">{m.completedLate}</span>
              </div>
            </div>
          </Section>
        </div>

        {/* Bottom row: origin + systems + trend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Section title="Por origen" icon={TrendingUp}>
            <div className="flex flex-col gap-3">
              {sourceOrder.map(s => (
                <BreakdownRow
                  key={s}
                  label={TASK_SOURCE_LABELS[s]}
                  value={m.bySource[s] ?? 0}
                  total={m.total}
                  barColor="bg-brand-cyan"
                />
              ))}
            </div>
          </Section>

          <Section title="Por sistema (top 5)" icon={ListTodo}>
            {m.topSystems.length === 0 ? (
              <p className="font-sora text-[12px] text-lttm italic">Sin sistemas asignados</p>
            ) : (
              <div className="flex flex-col gap-3">
                {m.topSystems.map(sys => (
                  <div key={sys.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-sora text-[12px] text-ltt truncate max-w-[140px]">{sys.name}</span>
                      <div className="flex items-center gap-2 text-[11px] font-plex text-lttm">
                        <span className="text-gr">{sys.done}✓</span>
                        {sys.overdue > 0 && <span className="text-re">{sys.overdue}!</span>}
                      </div>
                    </div>
                    <Bar value={sys.done} max={sys.total} color="bg-gr" />
                    <p className="font-plex text-[10px] text-lttm">{sys.total} total · {pct(sys.done, sys.total)}% completadas</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Tendencia semanal (8 semanas)" icon={BarChart2}>
            <WeeklyTrend buckets={m.weeklyTrend} />
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2.5 rounded-sm bg-brand-cyan/50" />
                <span className="font-plex text-[10px] text-lttm">Creadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2.5 rounded-sm bg-gr/70" />
                <span className="font-plex text-[10px] text-lttm">Completadas</span>
              </div>
            </div>
          </Section>
        </div>

      </div>
    </div>
  )
}
