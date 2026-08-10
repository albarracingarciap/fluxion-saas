import { createFluxionClient } from '@/lib/supabase/fluxion'
import type { TaskStatus } from './types'

export type TaskGapStatus = {
  kind: 'individual' | 'group'
  taskId: string
  status: TaskStatus
  groupKey?: string
}

export type TaskGapLink = {
  gap_key: string
  group_key: string | null
  gap_layer: string
  gap_source_id: string | null
}

// Devuelve un mapa gap.id → estado de tarea (individual o grupo), para N gaps en una sola ronda
export async function getTasksByGapIds(
  gapIds: string[],
  organizationId: string
): Promise<Record<string, TaskGapStatus>> {
  if (gapIds.length === 0) return {}

  const fluxion = createFluxionClient()
  const result: Record<string, TaskGapStatus> = {}

  // 1. Tareas individuales: source_type='gap', source_id en la lista
  const { data: individualTasks } = await fluxion
    .from('tasks')
    .select('id, source_id, status')
    .eq('source_type', 'gap')
    .eq('organization_id', organizationId)
    .in('source_id', gapIds)
    .neq('status', 'cancelled')

  for (const task of individualTasks ?? []) {
    if (task.source_id) {
      result[task.source_id] = {
        kind: 'individual',
        taskId: task.id,
        status: task.status as TaskStatus,
      }
    }
  }

  // 2. Tareas-paraguas: buscar vínculos en task_gap_links, luego confirmar source_type='gap_group'
  const { data: links } = await fluxion
    .from('task_gap_links')
    .select('gap_source_id, group_key, task_id')
    .in('gap_source_id', gapIds)

  const linkTaskIds = Array.from(new Set((links ?? []).map((l) => l.task_id)))

  if (linkTaskIds.length > 0) {
    const { data: groupTasks } = await fluxion
      .from('tasks')
      .select('id, status')
      .in('id', linkTaskIds)
      .eq('source_type', 'gap_group')
      .neq('status', 'cancelled')

    const groupTaskMap = new Map(groupTasks?.map((t) => [t.id, t]) ?? [])

    for (const link of links ?? []) {
      if (
        link.gap_source_id &&
        groupTaskMap.has(link.task_id) &&
        !result[link.gap_source_id]  // individual tiene prioridad
      ) {
        const task = groupTaskMap.get(link.task_id)!
        result[link.gap_source_id] = {
          kind: 'group',
          taskId: link.task_id,
          status: task.status as TaskStatus,
          groupKey: link.group_key ?? undefined,
        }
      }
    }
  }

  return result
}

// Devuelve los vínculos de una tarea de tipo gap_group
export async function getTaskGapLinksForTask(taskId: string): Promise<TaskGapLink[]> {
  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('task_gap_links')
    .select('gap_key, group_key, gap_layer, gap_source_id')
    .eq('task_id', taskId)

  return (data ?? []) as TaskGapLink[]
}
