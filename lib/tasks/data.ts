import type { SupabaseClient } from '@supabase/supabase-js'

import type { TaskFilters, TaskRow, TaskSummary, TaskStatus, TaskPriority } from './types'

export async function fetchTasks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string,
  filters: TaskFilters = {}
): Promise<TaskRow[]> {
  let query = fluxion
    .from('tasks')
    .select(`
      id, organization_id, system_id, title, description,
      status, priority, source_type, source_id,
      assignee_id, created_by, due_date, completed_at,
      tags, created_at, updated_at, position,
      ai_systems!tasks_system_id_fkey(name),
      profiles!tasks_assignee_id_fkey(full_name)
    `)
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filters.systemId)    query = query.eq('system_id', filters.systemId)
  if (filters.status)      query = query.eq('status', filters.status)
  if (filters.priority)    query = query.eq('priority', filters.priority)
  if (filters.sourceType)  query = query.eq('source_type', filters.sourceType)
  if (filters.assigneeId)  query = query.eq('assignee_id', filters.assigneeId)
  if (filters.search)      query = query.ilike('title', `%${filters.search}%`)
  if (filters.overdueOnly) {
    const today = new Date().toISOString().split('T')[0]
    query = query
      .lt('due_date', today)
      .not('status', 'in', '("done","cancelled")')
  }

  const { data } = await query

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    organization_id: row.organization_id as string,
    system_id: row.system_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    source_type: row.source_type as TaskRow['source_type'],
    source_id: row.source_id as string | null,
    assignee_id: row.assignee_id as string | null,
    created_by: row.created_by as string | null,
    due_date: row.due_date as string | null,
    completed_at: row.completed_at as string | null,
    tags: (row.tags as string[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    position: (row.position as number | null) ?? null,
    system_name: (row.ai_systems as { name?: string } | null)?.name ?? null,
    assignee_name: (row.profiles as { full_name?: string } | null)?.full_name ?? null,
    assignee_email: (row.profiles as { email?: string } | null)?.email ?? null,
  }))
}

export async function fetchTask(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string,
  taskId: string
): Promise<TaskRow | null> {
  const { data } = await fluxion
    .from('tasks')
    .select(`
      id, organization_id, system_id, title, description,
      status, priority, source_type, source_id,
      assignee_id, created_by, due_date, completed_at,
      tags, created_at, updated_at, position,
      ai_systems!tasks_system_id_fkey(name),
      profiles!tasks_assignee_id_fkey(full_name)
    `)
    .eq('organization_id', organizationId)
    .eq('id', taskId)
    .single()

  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    system_id: row.system_id as string | null,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    source_type: row.source_type as TaskRow['source_type'],
    source_id: row.source_id as string | null,
    assignee_id: row.assignee_id as string | null,
    created_by: row.created_by as string | null,
    due_date: row.due_date as string | null,
    completed_at: row.completed_at as string | null,
    tags: (row.tags as string[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    position: (row.position as number | null) ?? null,
    system_name: (row.ai_systems as { name?: string } | null)?.name ?? null,
    assignee_name: (row.profiles as { full_name?: string } | null)?.full_name ?? null,
    assignee_email: (row.profiles as { email?: string } | null)?.email ?? null,
  }
}

export async function computeTaskSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: SupabaseClient<any, any, any>,
  organizationId: string,
  systemId?: string
): Promise<TaskSummary> {
  let query = fluxion
    .from('tasks')
    .select('status, priority, due_date')
    .eq('organization_id', organizationId)

  if (systemId) query = query.eq('system_id', systemId)

  const { data } = await query

  const rows = (data ?? []) as Array<{ status: TaskStatus; priority: TaskPriority; due_date: string | null }>
  const today = new Date().toISOString().split('T')[0]!

  const byStatus = { todo: 0, in_progress: 0, blocked: 0, in_review: 0, done: 0, cancelled: 0 } as Record<TaskStatus, number>
  const byPriority = { low: 0, medium: 0, high: 0, critical: 0 } as Record<TaskPriority, number>
  let overdue = 0
  let dueToday = 0

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    byPriority[row.priority] = (byPriority[row.priority] ?? 0) + 1
    if (row.due_date && !['done', 'cancelled'].includes(row.status)) {
      if (row.due_date < today) overdue++
      if (row.due_date === today) dueToday++
    }
  }

  return { total: rows.length, byStatus, byPriority, overdue, dueToday }
}
