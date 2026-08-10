import type { TaskRow, TaskStatus, TaskPriority, TaskSourceType } from './types'

export type WeekBucket = {
  label: string   // e.g. "21 abr"
  created: number
  completed: number
}

export type TopSystem = {
  id: string
  name: string
  total: number
  done: number
  overdue: number
}

export type TaskMetrics = {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  bySource: Record<TaskSourceType, number>
  overdue: number
  completedOnTime: number
  completedLate: number
  slaPercent: number
  weeklyTrend: WeekBucket[]   // last 8 ISO weeks
  topSystems: TopSystem[]     // top 5 by total
}

const MONTH_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

/** ISO date string for Monday of the week containing `d` */
function weekMonday(d: Date): string {
  const day = d.getDay()              // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().split('T')[0]!
}

/** Label "3 may" from an ISO date string */
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`
}

export function computeTaskMetrics(tasks: TaskRow[]): TaskMetrics {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]!

  // ── 8 week buckets ──────────────────────────────────────────────────────────
  const buckets: Map<string, { created: number; completed: number }> = new Map()
  for (let w = 7; w >= 0; w--) {
    const d = new Date(today)
    d.setDate(today.getDate() - w * 7)
    const key = weekMonday(d)
    if (!buckets.has(key)) buckets.set(key, { created: 0, completed: 0 })
  }

  const bucketKeys = Array.from(buckets.keys())
  const oldest = bucketKeys[0]!

  // ── accumulators ────────────────────────────────────────────────────────────
  const byStatus = { todo: 0, in_progress: 0, blocked: 0, in_review: 0, done: 0, cancelled: 0 } as Record<TaskStatus, number>
  const byPriority = { low: 0, medium: 0, high: 0, critical: 0 } as Record<TaskPriority, number>
  const bySource: Record<string, number> = {}
  let overdue = 0
  let completedOnTime = 0
  let completedLate = 0
  const systemMap = new Map<string, { name: string; total: number; done: number; overdue: number }>()

  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1
    bySource[t.source_type] = (bySource[t.source_type] ?? 0) + 1

    // overdue: has due_date, not done/cancelled, past today
    const isActive = t.status !== 'done' && t.status !== 'cancelled'
    if (t.due_date && isActive && t.due_date < todayStr) overdue++

    // completed on time vs late
    if (t.status === 'done' && t.completed_at) {
      if (t.due_date) {
        const doneDay = t.completed_at.split('T')[0]!
        if (doneDay <= t.due_date) completedOnTime++
        else completedLate++
      } else {
        completedOnTime++ // no due_date means on-time by definition
      }
    }

    // weekly created bucket
    if (t.created_at >= oldest) {
      const key = weekMonday(new Date(t.created_at))
      const b = buckets.get(key)
      if (b) b.created++
    }

    // weekly completed bucket
    if (t.completed_at && t.completed_at >= oldest) {
      const key = weekMonday(new Date(t.completed_at))
      const b = buckets.get(key)
      if (b) b.completed++
    }

    // system aggregation
    if (t.system_id) {
      if (!systemMap.has(t.system_id)) {
        systemMap.set(t.system_id, { name: t.system_name ?? t.system_id, total: 0, done: 0, overdue: 0 })
      }
      const s = systemMap.get(t.system_id)!
      s.total++
      if (t.status === 'done') s.done++
      if (t.due_date && isActive && t.due_date < todayStr) s.overdue++
    }
  }

  // ── SLA % ────────────────────────────────────────────────────────────────────
  const totalClosed = completedOnTime + completedLate
  const slaPercent = totalClosed > 0 ? Math.round((completedOnTime / totalClosed) * 100) : 100

  // ── weekly trend ─────────────────────────────────────────────────────────────
  const weeklyTrend: WeekBucket[] = Array.from(buckets.entries()).map(([key, val]) => ({
    label: shortDate(key),
    created: val.created,
    completed: val.completed,
  }))

  // ── top systems ──────────────────────────────────────────────────────────────
  const topSystems: TopSystem[] = Array.from(systemMap.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    total: tasks.length,
    byStatus,
    byPriority,
    bySource: bySource as Record<TaskSourceType, number>,
    overdue,
    completedOnTime,
    completedLate,
    slaPercent,
    weeklyTrend,
    topSystems,
  }
}
