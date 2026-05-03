export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskSourceType = 'manual' | 'treatment_action' | 'gap' | 'evaluation' | 'fmea_item' | 'gap_group'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'Pendiente',
  in_progress: 'En progreso',
  blocked:     'Bloqueada',
  in_review:   'En revisión',
  done:        'Completada',
  cancelled:   'Cancelada',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:      'Baja',
  medium:   'Media',
  high:     'Alta',
  critical: 'Crítica',
}

export const TASK_SOURCE_LABELS: Record<TaskSourceType, string> = {
  manual:           'Manual',
  treatment_action: 'Plan de tratamiento',
  gap:              'Análisis de gaps',
  evaluation:       'Evaluación de riesgos',
  fmea_item:        'Modo FMEA',
  gap_group:        'Grupo de gaps',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'done',
  'cancelled',
]

// Columnas Kanban (excluye 'cancelled' del tablero principal)
export const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo',        label: 'Pendiente',    color: '#7d97b8' },
  { status: 'in_progress', label: 'En progreso',  color: '#00adef' },
  { status: 'blocked',     label: 'Bloqueada',    color: '#df3e2f' },
  { status: 'in_review',   label: 'En revisión',  color: '#db8a13' },
  { status: 'done',        label: 'Completada',   color: '#2a9d55' },
]

export type TaskRow = {
  id: string
  organization_id: string
  system_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  source_type: TaskSourceType
  source_id: string | null
  assignee_id: string | null
  created_by: string | null
  due_date: string | null
  completed_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Joins opcionales
  system_name?: string | null
  assignee_name?: string | null
  assignee_email?: string | null
}

export type CreateTaskInput = {
  organizationId?: string
  systemId?: string | null
  title: string
  description?: string | null
  priority?: TaskPriority
  sourceType?: TaskSourceType
  sourceId?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  tags?: string[]
}

export type UpdateTaskInput = {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  tags?: string[]
}

export type TaskFilters = {
  systemId?:    string
  status?:      TaskStatus
  priority?:    TaskPriority
  sourceType?:  TaskSourceType
  assigneeId?:  string
  overdueOnly?: boolean
  search?:      string
  tags?:        string[]
  dueDateFrom?: string   // ISO date string, inclusive
  dueDateTo?:   string   // ISO date string, inclusive
}

export type TaskSummary = {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  overdue: number
  dueToday: number
}
