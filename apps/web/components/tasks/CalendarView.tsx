'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import type { TaskRow, TaskPriority, TaskStatus } from '@/lib/tasks/types'
import { TaskDetailPanel } from './TaskDetailPanel'
import { CreateTaskModal, type Member, type System } from './CreateTaskModal'

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const DAY_NAMES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low:      'bg-lttm',
  medium:   'bg-brand-cyan',
  high:     'bg-or',
  critical: 'bg-re',
}

const STATUS_STRIKE: Record<TaskStatus, boolean> = {
  todo: false,
  in_progress: false,
  blocked: false,
  in_review: false,
  done: true,
  cancelled: true,
}

// ─── Task chip ───────────────────────────────────────────────────────────────

function TaskChip({
  task,
  today,
  onClick,
}: {
  task: TaskRow
  today: string
  onClick: (t: TaskRow) => void
}) {
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done' && task.status !== 'cancelled'
  const isDone    = task.status === 'done' || task.status === 'cancelled'

  return (
    <button
      onClick={() => onClick(task)}
      className={`
        w-full text-left px-1.5 py-0.5 rounded-[4px] font-sora text-[10px] leading-tight
        flex items-center gap-1 truncate transition-colors
        ${isOverdue
          ? 'bg-redim text-re hover:bg-re/20'
          : isDone
          ? 'bg-ltbg text-lttm hover:bg-ltbg/80'
          : 'bg-cyan-dim text-brand-cyan hover:bg-cyan-border/30'
        }
      `}
      title={task.title}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
      <span className={`truncate ${STATUS_STRIKE[task.status] ? 'line-through opacity-60' : ''}`}>
        {task.title}
      </span>
    </button>
  )
}

// ─── Day cell ────────────────────────────────────────────────────────────────

const MAX_CHIPS = 3

function DayCell({
  day,
  isCurrentMonth,
  isToday,
  tasks,
  todayStr,
  onTaskClick,
  onAddClick,
}: {
  day: string          // ISO date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: TaskRow[]
  todayStr: string
  onTaskClick: (t: TaskRow) => void
  onAddClick: (date: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? tasks : tasks.slice(0, MAX_CHIPS)
  const hidden  = tasks.length - MAX_CHIPS

  return (
    <div
      className={`
        min-h-[100px] p-1.5 border-r border-b border-ltb flex flex-col gap-0.5 group
        ${isCurrentMonth ? 'bg-ltcard' : 'bg-ltbg/40'}
        ${isToday ? 'ring-1 ring-inset ring-brand-cyan' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={`
          font-plex text-[11px] w-5 h-5 flex items-center justify-center rounded-full
          ${isToday ? 'bg-brand-cyan text-white font-medium' : isCurrentMonth ? 'text-lttm' : 'text-lttm/40'}
        `}>
          {parseInt(day.split('-')[2]!)}
        </span>
        {isCurrentMonth && (
          <button
            onClick={() => onAddClick(day)}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center rounded-sm hover:bg-cyan-dim text-lttm hover:text-brand-cyan text-[14px] leading-none font-light"
            title="Nueva tarea"
          >
            +
          </button>
        )}
      </div>

      {visible.map(t => (
        <TaskChip key={t.id} task={t} today={todayStr} onClick={onTaskClick} />
      ))}

      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="font-plex text-[9px] text-lttm hover:text-brand-cyan transition-colors pl-1"
        >
          +{hidden} más
        </button>
      )}
      {expanded && tasks.length > MAX_CHIPS && (
        <button
          onClick={() => setExpanded(false)}
          className="font-plex text-[9px] text-lttm hover:text-brand-cyan transition-colors pl-1"
        >
          ver menos
        </button>
      )}
    </div>
  )
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView({
  tasks,
  members,
  systems,
  currentProfileId,
}: {
  tasks: TaskRow[]
  members: Member[]
  systems: System[]
  currentProfileId: string | null
}) {
  const todayDate = useMemo(() => new Date(), [])
  const todayStr  = todayDate.toISOString().split('T')[0]!

  const [year, setYear]   = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth())   // 0-based
  const [selectedTask, setSelectedTask]   = useState<TaskRow | null>(null)
  const [showCreate, setShowCreate]       = useState(false)
  const [createDate, setCreateDate]       = useState<string | null>(null)

  // ── task index by due_date ────────────────────────────────────────────────
  const byDate = useMemo(() => {
    const map = new Map<string, TaskRow[]>()
    for (const t of tasks) {
      if (!t.due_date) continue
      if (!map.has(t.due_date)) map.set(t.due_date, [])
      map.get(t.due_date)!.push(t)
    }
    return map
  }, [tasks])

  const noDueDate = useMemo(() => tasks.filter(t => !t.due_date && t.status !== 'done' && t.status !== 'cancelled'), [tasks])

  // ── calendar grid ────────────────────────────────────────────────────────
  const { weeks } = useMemo(() => {
    const first = new Date(year, month, 1)
    // day-of-week Mon=0 ... Sun=6
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev  = new Date(year, month, 0).getDate()

    const cells: string[] = []
    for (let i = 0; i < startDow; i++) {
      const d = daysInPrev - startDow + 1 + i
      cells.push(isoDate(year, month - 1, d))
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(year, month, d))
    // fill to complete weeks
    while (cells.length % 7 !== 0) {
      const d = cells.length - (startDow + daysInMonth) + 1
      cells.push(isoDate(year, month + 1, d))
    }

    const w: string[][] = []
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7))
    return { weeks: w, firstDay: first }
  }, [year, month])

  // ── navigation ───────────────────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }, [month])

  const goToday = useCallback(() => {
    setYear(todayDate.getFullYear())
    setMonth(todayDate.getMonth())
  }, [todayDate])

  const handleAddClick = useCallback((date: string) => {
    setCreateDate(date)
    setShowCreate(true)
  }, [])

  const handleTaskUpdate = useCallback((updated: TaskRow) => {
    setSelectedTask(updated)
  }, [])

  // ── update local task after detail panel edit ─────────────────────────────
  // (we don't rehydrate from server; reload forces fresh data if needed)

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="border-b border-ltb bg-ltcard shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/tareas"
              className="flex items-center gap-1.5 text-lttm hover:text-ltt transition-colors font-sora text-[13px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Tareas
            </Link>
            <span className="text-ltb">·</span>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-cyan" />
              <h1 className="font-sora text-[18px] font-semibold text-ltt">Calendario</h1>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-ltbg border border-transparent hover:border-ltb transition-all text-lttm hover:text-ltt"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-sora text-[15px] font-semibold text-ltt w-40 text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-ltbg border border-transparent hover:border-ltb transition-all text-lttm hover:text-ltt"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="ml-2 px-3 py-1.5 bg-ltbg border border-ltb rounded-[6px] font-sora text-[12px] text-lttm hover:text-brand-cyan hover:border-brand-cyan transition-all"
            >
              Hoy
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 flex flex-col gap-6">
        <div className="border-l border-t border-ltb rounded-[8px] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-ltbg border-b border-ltb">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 border-r border-ltb text-center font-plex text-[10px] uppercase tracking-[0.7px] text-lttm last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day) => {
                const isCurrentMonth = parseInt(day.split('-')[1]!) - 1 === month
                return (
                  <DayCell
                    key={day}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isToday={day === todayStr}
                    tasks={byDate.get(day) ?? []}
                    todayStr={todayStr}
                    onTaskClick={setSelectedTask}
                    onAddClick={handleAddClick}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* No-due-date section */}
        {noDueDate.length > 0 && (
          <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
            <p className="font-plex text-[11px] uppercase tracking-[0.7px] text-lttm mb-3">
              Sin fecha de vencimiento ({noDueDate.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {noDueDate.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-ltbg border border-ltb rounded-full font-sora text-[11px] text-lttm hover:text-ltt hover:border-brand-cyan transition-all"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          members={members}
          systems={systems}
          currentProfileId={currentProfileId ?? ''}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdate}
          onDeleted={() => { setSelectedTask(null); window.location.reload() }}
        />
      )}

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskModal
          members={members}
          systems={systems}
          defaultDueDate={createDate ?? undefined}
          onClose={() => { setShowCreate(false); setCreateDate(null) }}
          onCreated={() => {
            setShowCreate(false)
            setCreateDate(null)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
