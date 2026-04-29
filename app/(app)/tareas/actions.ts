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

// Crea una tarea vinculada a un gap específico
export async function createGapTaskAction(params: {
  gapId: string
  systemId: string
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}): Promise<{ id: string } | { error: string }> {
  return createTaskAction({
    systemId:    params.systemId,
    title:       params.title,
    description: params.description,
    priority:    params.priority ?? 'high',
    sourceType:  'gap',
    sourceId:    params.gapId,
    assigneeId:  params.assigneeId,
    dueDate:     params.dueDate,
    tags:        ['gap'],
  })
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
