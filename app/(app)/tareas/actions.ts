'use server'

import { revalidatePath } from 'next/cache'

import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'
import type { CreateTaskInput, UpdateTaskInput, TaskStatus } from '@/lib/tasks/types'

async function getOrgId(): Promise<{ userId: string; organizationId: string } | null> {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null
  return { userId: user.id, organizationId: profile.organization_id }
}

export async function createTaskAction(input: CreateTaskInput): Promise<{ id: string } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id')
    .eq('user_id', ctx.userId)
    .single()

  const { data, error } = await fluxion
    .from('tasks')
    .insert({
      organization_id: ctx.organizationId,
      system_id:       input.systemId ?? null,
      title:           input.title,
      description:     input.description ?? null,
      priority:        input.priority ?? 'medium',
      source_type:     input.sourceType ?? 'manual',
      source_id:       input.sourceId ?? null,
      assignee_id:     input.assigneeId ?? null,
      created_by:      profile?.id ?? null,
      due_date:        input.dueDate ?? null,
      tags:            input.tags ?? [],
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Error al crear la tarea' }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { id: data.id }
}

export async function updateTaskAction(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined)       patch.title       = input.title
  if (input.description !== undefined) patch.description = input.description
  if (input.status !== undefined)      patch.status      = input.status
  if (input.priority !== undefined)    patch.priority    = input.priority
  if (input.assigneeId !== undefined)  patch.assignee_id = input.assigneeId
  if (input.dueDate !== undefined)     patch.due_date    = input.dueDate
  if (input.tags !== undefined)        patch.tags        = input.tags

  const { error } = await fluxion
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .eq('organization_id', ctx.organizationId)

  if (error) return { error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { ok: true }
}

export async function updateTaskStatusAction(
  taskId: string,
  status: TaskStatus
): Promise<{ ok: true } | { error: string }> {
  return updateTaskAction(taskId, { status })
}

export async function deleteTaskAction(taskId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { error } = await fluxion
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('organization_id', ctx.organizationId)
    .eq('source_type', 'manual') // solo se pueden eliminar tareas manuales desde la UI

  if (error) return { error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { ok: true }
}

// Crea una tarea vinculada a un gap individual (idempotente por source_id)
export async function createGapTaskAction(params: {
  gapId: string
  gapKey: string
  gapLayer: string
  systemId: string
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}): Promise<{ taskId: string; created: boolean } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  // Idempotencia: si ya existe una tarea activa para este gap, devolverla
  const { data: existing } = await fluxion
    .from('tasks')
    .select('id, status')
    .eq('source_type', 'gap')
    .eq('source_id', params.gapId)
    .eq('organization_id', ctx.organizationId)
    .neq('status', 'cancelled')
    .maybeSingle()

  if (existing) return { taskId: existing.id, created: false }

  const result = await createTaskAction({
    systemId:    params.systemId,
    title:       params.title,
    description: params.description,
    priority:    params.priority ?? 'high',
    sourceType:  'gap',
    sourceId:    params.gapId,
    assigneeId:  params.assigneeId,
    dueDate:     params.dueDate,
    tags:        ['gap', params.gapLayer],
  })

  if ('error' in result) return result

  revalidatePath('/gaps')
  return { taskId: result.id, created: true }
}

// Crea una tarea-paraguas para un grupo de gaps (idempotente por group_key)
export async function createGapGroupTaskAction(params: {
  groupId: string
  groupTitle: string
  groupLayer: string
  gaps: Array<{
    id: string
    key: string
    layer: string
    systemId: string
  }>
  severityMax: 'critico' | 'alto' | 'medio'
  assigneeId?: string
  dueDate?: string
}): Promise<{ taskId: string; created: boolean } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  // Idempotencia: si ya existe task_gap_links con este group_key, buscar la tarea activa
  const { data: existingLinks } = await fluxion
    .from('task_gap_links')
    .select('task_id')
    .eq('group_key', params.groupId)
    .limit(1)

  if (existingLinks && existingLinks.length > 0) {
    const existingTaskId = existingLinks[0].task_id
    const { data: existingTask } = await fluxion
      .from('tasks')
      .select('id, status')
      .eq('id', existingTaskId)
      .neq('status', 'cancelled')
      .maybeSingle()

    if (existingTask) return { taskId: existingTask.id, created: false }
  }

  const priorityMap = { critico: 'critical', alto: 'high', medio: 'medium' } as const
  const priority = priorityMap[params.severityMax]

  // Determinar system_id: usar si todos los gaps son del mismo sistema
  const uniqueSystems = Array.from(new Set(params.gaps.map((g) => g.systemId)))
  const systemId = uniqueSystems.length === 1 ? uniqueSystems[0] : null

  // Determinar assigneeId del perfil (la action necesita profile.id)
  let resolvedAssigneeId: string | undefined = params.assigneeId

  const description = [
    `Tarea-paraguas que cubre ${params.gaps.length} gaps de capa ${params.groupLayer}.`,
    '',
    'Gaps incluidos:',
    ...params.gaps.map((g) => `- ${g.key} (${g.layer})`),
  ].join('\n')

  const result = await createTaskAction({
    systemId,
    title:       params.groupTitle,
    description,
    priority,
    sourceType:  'gap_group',
    sourceId:    null,
    assigneeId:  resolvedAssigneeId,
    dueDate:     params.dueDate,
    tags:        ['gap-group', params.groupLayer],
  })

  if ('error' in result) return result

  // Insertar vínculos gap ↔ tarea
  const taskId = result.id
  const links = params.gaps.map((g) => ({
    task_id:       taskId,
    gap_key:       g.key,
    group_key:     params.groupId,
    gap_layer:     g.layer,
    gap_source_id: g.id,
  }))

  const { error: linksError } = await fluxion.from('task_gap_links').insert(links)
  if (linksError) {
    // Si fallan los vínculos, eliminar la tarea para no dejarla huérfana
    await fluxion.from('tasks').delete().eq('id', taskId)
    return { error: `Error al crear vínculos: ${linksError.message}` }
  }

  revalidatePath('/gaps')
  revalidatePath('/tareas')
  return { taskId, created: true }
}

// Server action que devuelve los vínculos de una tarea gap_group (para TaskDetailPanel)
export async function getTaskGapLinksAction(
  taskId: string
): Promise<Array<{ gap_key: string; group_key: string | null; gap_layer: string; gap_source_id: string | null }>> {
  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('task_gap_links')
    .select('gap_key, group_key, gap_layer, gap_source_id')
    .eq('task_id', taskId)
  return data ?? []
}

// Crea una tarea vinculada a una evaluación
export async function createEvaluationTaskAction(params: {
  evaluationId: string
  systemId: string
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
}): Promise<{ id: string } | { error: string }> {
  return createTaskAction({
    systemId:    params.systemId,
    title:       params.title,
    description: params.description,
    priority:    'high',
    sourceType:  'evaluation',
    sourceId:    params.evaluationId,
    assigneeId:  params.assigneeId,
    dueDate:     params.dueDate,
    tags:        ['evaluacion'],
  })
}
