'use server'

import { revalidatePath } from 'next/cache'

import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'
import type { CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority } from '@/lib/tasks/types'
import {
  createNotification,
  notifyTaskWatchers,
  addAutoWatchers,
  logTaskActivity,
} from '@/lib/notifications/sender'

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

async function getCtx(): Promise<{
  userId: string
  organizationId: string
  profileId: string
  email: string | null
  displayName: string | null
} | null> {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, email, display_name, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null
  return {
    userId:         user.id,
    organizationId: profile.organization_id,
    profileId:      profile.id,
    email:          profile.email ?? null,
    displayName:    profile.display_name ?? profile.full_name ?? null,
  }
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

  // Auto-watchers: creador + asignado
  const watcherIds = [profile?.id, input.assigneeId].filter(Boolean) as string[]
  void addAutoWatchers({ taskId: data.id, profileIds: watcherIds })

  // Activity log: tarea creada
  void logTaskActivity({ taskId: data.id, actorId: profile?.id, action: 'created' })

  // Notificar al asignado (si es distinto del creador)
  if (input.assigneeId && input.assigneeId !== profile?.id) {
    const adminClient = createAdminFluxionClient()
    const { data: assignee } = await adminClient
      .from('profiles')
      .select('id, email, display_name, full_name, preferences')
      .eq('id', input.assigneeId)
      .single()
    if (assignee) {
      const { data: actor } = await adminClient
        .from('profiles')
        .select('display_name, full_name')
        .eq('id', profile?.id ?? '')
        .maybeSingle()
      void createNotification({
        recipientProfileId: assignee.id,
        organizationId:     ctx.organizationId,
        type:               'task_assigned',
        title:              `Nueva tarea asignada: ${input.title}`,
        body:               input.description ?? undefined,
        linkUrl:            `/tareas`,
        relatedTaskId:      data.id,
        recipientEmail:     assignee.email ?? undefined,
        recipientName:      assignee.display_name ?? assignee.full_name ?? undefined,
        actorName:          actor?.display_name ?? actor?.full_name ?? undefined,
        taskTitle:          input.title,
      })
    }
  }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { id: data.id }
}

export async function updateTaskAction(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()
  const admin   = createAdminFluxionClient()

  // Leer estado actual para log de cambios
  const { data: prev } = await admin
    .from('tasks')
    .select('status, priority, assignee_id, due_date, title')
    .eq('id', taskId)
    .single()

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

  // Registrar cambios en activity log
  if (prev) {
    const changes: Array<{ field: string; old: unknown; new: unknown }> = []
    if (input.status   !== undefined && input.status   !== prev.status)      changes.push({ field: 'status',      old: prev.status,      new: input.status })
    if (input.priority !== undefined && input.priority !== prev.priority)    changes.push({ field: 'priority',    old: prev.priority,    new: input.priority })
    if (input.assigneeId !== undefined && input.assigneeId !== prev.assignee_id) changes.push({ field: 'assignee_id', old: prev.assignee_id, new: input.assigneeId })
    if (input.dueDate  !== undefined && input.dueDate  !== prev.due_date)    changes.push({ field: 'due_date',    old: prev.due_date,    new: input.dueDate })
    if (input.title    !== undefined && input.title    !== prev.title)       changes.push({ field: 'title',       old: prev.title,       new: input.title })

    for (const ch of changes) {
      void logTaskActivity({
        taskId,
        actorId:  ctx.profileId,
        action:   `${ch.field}_changed`,
        field:    ch.field,
        oldValue: ch.old,
        newValue: ch.new,
      })
    }

    // Notificar watchers si el estado cambió
    if (input.status && input.status !== prev.status) {
      void notifyTaskWatchers({
        taskId,
        organizationId:    ctx.organizationId,
        excludeProfileIds: [ctx.profileId],
        type:              'status_changed',
        title:             `Estado actualizado: ${prev.title ?? taskId}`,
        linkUrl:           `/tareas`,
        actorName:         ctx.displayName ?? undefined,
        taskTitle:         prev.title ?? taskId,
      })
    }

    // Si se reasigna, notificar al nuevo asignado
    if (input.assigneeId && input.assigneeId !== prev.assignee_id && input.assigneeId !== ctx.profileId) {
      void addAutoWatchers({ taskId, profileIds: [input.assigneeId] })
      const { data: assignee } = await admin
        .from('profiles')
        .select('id, email, display_name, full_name')
        .eq('id', input.assigneeId)
        .single()
      if (assignee) {
        void createNotification({
          recipientProfileId: assignee.id,
          organizationId:     ctx.organizationId,
          type:               'task_assigned',
          title:              `Se te ha reasignado: ${prev.title ?? taskId}`,
          linkUrl:            `/tareas`,
          relatedTaskId:      taskId,
          recipientEmail:     assignee.email ?? undefined,
          recipientName:      assignee.display_name ?? assignee.full_name ?? undefined,
          actorName:          ctx.displayName ?? undefined,
          taskTitle:          prev.title ?? taskId,
        })
      }
    }
  }

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

// Crea una tarea vinculada a un ítem FMEA (idempotente: devuelve la existente si ya existe)
export async function createFmeaItemTaskAction(params: {
  itemId:       string
  systemId:     string
  evaluationId: string
  title:        string
  description?: string
  assigneeId?:  string | null
  dueDate?:     string | null
  priority?:    TaskPriority
}): Promise<{ taskId: string; created: boolean } | { error: string }> {
  // Verificar si ya existe una tarea para este ítem FMEA
  const fluxion = createFluxionClient()
  const { data: existing } = await fluxion
    .from('tasks')
    .select('id')
    .eq('source_type', 'fmea_item')
    .eq('source_id', params.itemId)
    .maybeSingle()

  if (existing) {
    return { taskId: existing.id as string, created: false }
  }

  const result = await createTaskAction({
    systemId:    params.systemId,
    title:       params.title,
    description: params.description,
    priority:    params.priority ?? 'high',
    sourceType:  'fmea_item',
    sourceId:    params.itemId,
    assigneeId:  params.assigneeId ?? null,
    dueDate:     params.dueDate ?? null,
    tags:        ['fmea'],
  })

  if ('error' in result) return result
  return { taskId: result.id, created: true }
}

// ─── Comentarios ──────────────────────────────────────────────────────────────

export type CommentRow = {
  id:         string
  task_id:    string
  author_id:  string | null
  body:       string
  mentions:   string[]
  created_at: string
  updated_at: string
  edited_at:  string | null
  deleted_at: string | null
  // joins
  author_name?:   string | null
  author_email?:  string | null
  author_avatar?: string | null
}

export async function getCommentsAction(taskId: string): Promise<CommentRow[]> {
  const admin = createAdminFluxionClient()
  const { data } = await admin
    .from('task_comments')
    .select('*, profiles:author_id(display_name, full_name, email, avatar_url)')
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r: any) => ({
    ...r,
    author_name:   r.profiles?.display_name ?? r.profiles?.full_name ?? null,
    author_email:  r.profiles?.email ?? null,
    author_avatar: r.profiles?.avatar_url ?? null,
    profiles:      undefined,
  }))
}

export async function addCommentAction(
  taskId:   string,
  body:     string,
  mentions: string[] = []
): Promise<{ id: string } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }
  if (!body.trim()) return { error: 'El comentario no puede estar vacío' }

  const admin = createAdminFluxionClient()

  // Obtener datos de la tarea para notificaciones
  const { data: task } = await admin
    .from('tasks')
    .select('title, organization_id')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Tarea no encontrada' }

  const { data: comment, error } = await admin
    .from('task_comments')
    .insert({
      task_id:   taskId,
      author_id: ctx.profileId,
      body:      body.trim(),
      mentions,
    })
    .select('id')
    .single()

  if (error || !comment) return { error: error?.message ?? 'Error al guardar el comentario' }

  // Auto-watcher: el comentarista sigue la tarea
  void addAutoWatchers({ taskId, profileIds: [ctx.profileId] })

  // Activity log
  void logTaskActivity({
    taskId,
    actorId:  ctx.profileId,
    action:   'comment_added',
    metadata: { comment_id: comment.id, preview: body.trim().substring(0, 80) },
  })

  // Notificar a mencionados
  for (const mentionedId of mentions) {
    if (mentionedId === ctx.profileId) continue
    void addAutoWatchers({ taskId, profileIds: [mentionedId] })
    const { data: mentioned } = await admin
      .from('profiles')
      .select('id, email, display_name, full_name')
      .eq('id', mentionedId)
      .single()
    if (mentioned) {
      void createNotification({
        recipientProfileId: mentioned.id,
        organizationId:     ctx.organizationId,
        type:               'mention',
        title:              `${ctx.displayName ?? 'Alguien'} te mencionó en una tarea`,
        body:               body.trim().substring(0, 120),
        linkUrl:            `/tareas`,
        relatedTaskId:      taskId,
        recipientEmail:     mentioned.email ?? undefined,
        recipientName:      mentioned.display_name ?? mentioned.full_name ?? undefined,
        actorName:          ctx.displayName ?? undefined,
        taskTitle:          task.title,
      })
    }
  }

  // Notificar a watchers (excepto actor y ya notificados por mención)
  const alreadyNotified = new Set([ctx.profileId, ...mentions])
  void notifyTaskWatchers({
    taskId,
    organizationId:    ctx.organizationId,
    excludeProfileIds: Array.from(alreadyNotified),
    type:              'comment_added',
    title:             `Nuevo comentario de ${ctx.displayName ?? 'un compañero'}: ${task.title}`,
    body:              body.trim().substring(0, 120),
    linkUrl:           `/tareas`,
    actorName:         ctx.displayName ?? undefined,
    taskTitle:         task.title,
  })

  return { id: comment.id }
}

export async function updateCommentAction(
  commentId: string,
  body:       string
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()
  const { error } = await fluxion
    .from('task_comments')
    .update({ body: body.trim(), edited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('author_id', ctx.profileId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function deleteCommentAction(commentId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()
  const { error } = await fluxion
    .from('task_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('author_id', ctx.profileId)

  if (error) return { error: error.message }
  return { ok: true }
}

// ─── Activity log ─────────────────────────────────────────────────────────────

export type ActivityRow = {
  id:         string
  task_id:    string
  actor_id:   string | null
  action:     string
  field:      string | null
  old_value:  unknown
  new_value:  unknown
  metadata:   Record<string, unknown> | null
  created_at: string
  actor_name?:  string | null
  actor_email?: string | null
}

export async function getTaskActivityAction(taskId: string): Promise<ActivityRow[]> {
  const admin = createAdminFluxionClient()
  const { data } = await admin
    .from('task_activity_log')
    .select('*, profiles:actor_id(display_name, full_name, email)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r: any) => ({
    ...r,
    actor_name:  r.profiles?.display_name ?? r.profiles?.full_name ?? null,
    actor_email: r.profiles?.email ?? null,
    profiles:    undefined,
  }))
}

// ─── Adjuntos ─────────────────────────────────────────────────────────────────

export type AttachmentRow = {
  id:           string
  task_id:      string
  uploader_id:  string | null
  file_name:    string
  storage_path: string
  file_size:    number | null
  mime_type:    string | null
  created_at:   string
  uploader_name?: string | null
  signed_url?:    string | null
}

const BUCKET = 'task-attachments'
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
]
const MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

export async function getAttachmentsAction(taskId: string): Promise<AttachmentRow[]> {
  const admin = createAdminFluxionClient()

  const { data } = await admin
    .from('task_attachments')
    .select('*, profiles:uploader_id(display_name, full_name)')
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return []

  // Generar URLs firmadas (60 min)
  const { createClient: createStorageClient } = await import('@supabase/supabase-js')
  const storage = createStorageClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ).storage

  return await Promise.all(
    data.map(async (r: any) => {
      const { data: signed } = await storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, 3600)
      return {
        ...r,
        uploader_name: r.profiles?.display_name ?? r.profiles?.full_name ?? null,
        signed_url:    signed?.signedUrl ?? null,
        profiles:      undefined,
      }
    })
  )
}

export async function uploadAttachmentAction(
  taskId:   string,
  formData: FormData
): Promise<{ id: string; file_name: string } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No se recibió ningún archivo' }
  if (file.size > MAX_SIZE_BYTES) return { error: `El archivo supera el límite de 25 MB` }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Tipo de archivo no permitido' }

  const admin = createAdminFluxionClient()

  // Leer la tarea para obtener org_id
  const { data: task } = await admin
    .from('tasks')
    .select('title, organization_id')
    .eq('id', taskId)
    .single()
  if (!task) return { error: 'Tarea no encontrada' }

  // Subir a Storage
  const { createClient: createStorageClient } = await import('@supabase/supabase-js')
  const storage = createStorageClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ).storage

  const ext          = file.name.split('.').pop() ?? 'bin'
  const attachmentId = crypto.randomUUID()
  const storagePath  = `${ctx.organizationId}/${taskId}/${attachmentId}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return { error: `Error al subir: ${uploadError.message}` }

  // Insertar metadatos
  const { data: row, error: dbError } = await admin
    .from('task_attachments')
    .insert({
      id:           attachmentId,
      task_id:      taskId,
      uploader_id:  ctx.profileId,
      file_name:    file.name,
      storage_path: storagePath,
      file_size:    file.size,
      mime_type:    file.type,
    })
    .select('id, file_name')
    .single()

  if (dbError || !row) {
    // Limpiar el archivo subido
    await storage.from(BUCKET).remove([storagePath])
    return { error: dbError?.message ?? 'Error al registrar el adjunto' }
  }

  // Activity log
  void logTaskActivity({
    taskId,
    actorId:  ctx.profileId,
    action:   'attachment_added',
    metadata: { file_name: file.name, file_size: file.size, mime_type: file.type },
  })

  // Notificar watchers
  void notifyTaskWatchers({
    taskId,
    organizationId:    ctx.organizationId,
    excludeProfileIds: [ctx.profileId],
    type:              'attachment_added',
    title:             `Nuevo adjunto en: ${task.title}`,
    body:              file.name,
    linkUrl:           `/tareas`,
    actorName:         ctx.displayName ?? undefined,
    taskTitle:         task.title,
  })

  return { id: row.id, file_name: row.file_name }
}

export async function deleteAttachmentAction(attachmentId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const admin = createAdminFluxionClient()

  // Soft delete — solo el uploader o admin pueden eliminar (RLS lo controla)
  const { error } = await admin
    .from('task_attachments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', attachmentId)

  if (error) return { error: error.message }
  return { ok: true }
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

export type WatcherRow = {
  user_id:    string
  source:     'auto' | 'manual'
  created_at: string
  name?:      string | null
  email?:     string | null
  avatar_url?: string | null
}

export async function getWatchersAction(taskId: string): Promise<WatcherRow[]> {
  const admin = createAdminFluxionClient()
  const { data } = await admin
    .from('task_watchers')
    .select('user_id, source, created_at, profiles:user_id(display_name, full_name, email, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  return (data ?? []).map((r: any) => ({
    user_id:    r.user_id,
    source:     r.source,
    created_at: r.created_at,
    name:       r.profiles?.display_name ?? r.profiles?.full_name ?? null,
    email:      r.profiles?.email ?? null,
    avatar_url: r.profiles?.avatar_url ?? null,
  }))
}

export async function toggleWatchAction(
  taskId: string
): Promise<{ watching: boolean } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const admin = createAdminFluxionClient()

  // ¿Ya está siguiendo?
  const { data: existing } = await admin
    .from('task_watchers')
    .select('user_id')
    .eq('task_id', taskId)
    .eq('user_id', ctx.profileId)
    .maybeSingle()

  if (existing) {
    // Dejar de seguir (solo se pueden eliminar watchers manuales del propio usuario)
    const { error } = await admin
      .from('task_watchers')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', ctx.profileId)
    if (error) return { error: error.message }
    return { watching: false }
  } else {
    // Empezar a seguir
    const { error } = await admin
      .from('task_watchers')
      .upsert(
        { task_id: taskId, user_id: ctx.profileId, source: 'manual' },
        { onConflict: 'task_id,user_id', ignoreDuplicates: true }
      )
    if (error) return { error: error.message }
    return { watching: true }
  }
}

export async function getCurrentProfileAction(): Promise<{
  id: string; email: string | null; displayName: string | null
} | null> {
  const ctx = await getCtx()
  if (!ctx) return null
  return { id: ctx.profileId, email: ctx.email, displayName: ctx.displayName }
}

// ─── Bulk actions ─────────────────────────────────────────────────────────────

export async function bulkUpdateStatusAction(
  taskIds: string[],
  status: TaskStatus
): Promise<{ ok: true; updated: number } | { error: string }> {
  if (taskIds.length === 0) return { ok: true, updated: 0 }

  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { error, count } = await fluxion
    .from('tasks')
    .update({ status })
    .in('id', taskIds)
    .eq('organization_id', ctx.organizationId)

  if (error) return { error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { ok: true, updated: count ?? taskIds.length }
}

export async function bulkDeleteAction(
  taskIds: string[]
): Promise<{ ok: true; deleted: number } | { error: string }> {
  if (taskIds.length === 0) return { ok: true, deleted: 0 }

  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  // Solo se eliminan tareas manuales
  const { error, count } = await fluxion
    .from('tasks')
    .delete()
    .in('id', taskIds)
    .eq('organization_id', ctx.organizationId)
    .eq('source_type', 'manual')

  if (error) return { error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { ok: true, deleted: count ?? 0 }
}

// ─── Saved views ──────────────────────────────────────────────────────────────

export type SavedView = {
  id:         string
  name:       string
  scope:      'personal' | 'shared'
  filters:    Record<string, unknown>
  sort:       Record<string, unknown>
  grouping:   string | null
  is_default: boolean
  owner_id:   string | null
  created_at: string
}

export async function getSavedViewsAction(): Promise<SavedView[]> {
  const ctx = await getOrgId()
  if (!ctx) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('task_saved_views')
    .select('id, name, scope, filters, sort, grouping, is_default, owner_id, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('scope', { ascending: false }) // shared primero
    .order('name',  { ascending: true })

  return (data ?? []) as SavedView[]
}

export async function createSavedViewAction(input: {
  name:      string
  scope:     'personal' | 'shared'
  filters:   Record<string, unknown>
  sort?:     Record<string, unknown>
  grouping?: string | null
}): Promise<{ id: string } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { data, error } = await fluxion
    .from('task_saved_views')
    .insert({
      organization_id: ctx.organizationId,
      owner_id:        ctx.profileId,
      name:            input.name.trim(),
      scope:           input.scope,
      filters:         input.filters,
      sort:            input.sort ?? {},
      grouping:        input.grouping ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'No se pudo guardar la vista' }
  return { id: data.id as string }
}

export async function deleteSavedViewAction(
  viewId: string
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { error } = await fluxion
    .from('task_saved_views')
    .delete()
    .eq('id', viewId)
    .eq('owner_id', ctx.profileId) // solo el owner puede borrar

  if (error) return { error: error.message }
  return { ok: true }
}

// ─── Kanban reorder ───────────────────────────────────────────────────────────

/**
 * Actualiza posición (y opcionalmente status) de una tarea tras un drag-and-drop.
 * Si needsRebalance = true, renumera todas las tareas de esa columna con gap 1024.
 */
export async function reorderTaskAction(
  taskId:          string,
  newStatus:       TaskStatus,
  newPosition:     number,
  needsRebalance?: boolean
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()

  const { error } = await fluxion
    .from('tasks')
    .update({ status: newStatus, position: newPosition })
    .eq('id', taskId)
    .eq('organization_id', ctx.organizationId)

  if (error) return { error: error.message }

  // Rebalancear columna si el gap quedó < 2
  if (needsRebalance) {
    // Obtener todas las tareas de la columna ordenadas por posición actual
    const { data: colTasks } = await fluxion
      .from('tasks')
      .select('id, position')
      .eq('organization_id', ctx.organizationId)
      .eq('status', newStatus)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (colTasks && colTasks.length > 0) {
      const updates = (colTasks as Array<{ id: string }>).map((t, idx) => ({
        id: t.id,
        position: (idx + 1) * 1024,
      }))
      // Upsert en batch (Supabase no tiene UPDATE CASE, usamos upsert)
      await fluxion.from('tasks').upsert(updates, { onConflict: 'id' })
    }
  }

  revalidatePath('/tareas')
  revalidatePath('/kanban')
  return { ok: true }
}

// ─── WIP limits ───────────────────────────────────────────────────────────────

export async function getWipLimitsAction(): Promise<Record<string, number>> {
  const ctx = await getOrgId()
  if (!ctx) return {}

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('organizations')
    .select('kanban_wip_limits')
    .eq('id', ctx.organizationId)
    .single()

  return (data?.kanban_wip_limits as Record<string, number> | null) ?? {}
}

export async function updateWipLimitsAction(
  limits: Record<string, number>
): Promise<{ ok: true } | { error: string }> {
  const ctx = await getOrgId()
  if (!ctx) return { error: 'No autenticado' }

  const fluxion = createFluxionClient()
  const { error } = await fluxion
    .from('organizations')
    .update({ kanban_wip_limits: limits })
    .eq('id', ctx.organizationId)

  if (error) return { error: error.message }
  return { ok: true }
}
