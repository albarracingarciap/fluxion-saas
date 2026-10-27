'use server'

import { revalidatePath } from 'next/cache'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { hasAnyRole } from '@/lib/auth/roles'
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_ORDER,
  type AuthorityRequestKind,
  type AuthorityRequestStatus,
} from '@/lib/governance/authority-requests'
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

/**
 * Requerimientos de la autoridad (B25d, AI Act, Art. 26.12; decisión 4).
 *
 * Viven en una pestaña de Incidentes y los gestionan los mismos roles de
 * gobierno; cualquier miembro los consulta. La respuesta se prepara con
 * tareas de origen `authority_request`: al registrar un requerimiento con
 * plazo se crea la tarea «Responder…» con esa fecha límite.
 */

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']
const KINDS = Object.keys(REQUEST_KIND_LABEL) as AuthorityRequestKind[]

async function ctx(requireGovernance = false) {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null, fluxion, userId: null }
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, roles, full_name')
    .eq('user_id', user.id)
    .single()
  if (!profile) return { error: 'No autenticado' as const, profile: null, fluxion, userId: null }
  if (requireGovernance && !hasAnyRole(profile, GOVERNANCE_ROLES)) {
    return { error: 'Solo los roles de gobierno pueden gestionar los requerimientos de la autoridad.' as const, profile: null, fluxion, userId: null }
  }
  return { error: null, profile, fluxion, userId: user.id }
}

export type AuthorityRequestRow = {
  id: string
  reference: string
  authority: string
  authority_reference: string | null
  kind: AuthorityRequestKind
  title: string
  description: string | null
  received_at: string
  due_at: string | null
  status: AuthorityRequestStatus
  response: string | null
  responded_at: string | null
  incident: { id: string; reference: string; title: string } | null
  owner_id: string | null
  owner_name: string | null
  created_at: string
  systems: Array<{ id: string; name: string }>
  evidences: Array<{ id: string; title: string; status: string }>
}

const SELECT = `
  id, reference, authority, authority_reference, kind, title, description, received_at, due_at,
  status, response, responded_at, owner_id, created_at,
  owner:owner_id(full_name),
  incident:incident_id(id, reference, title),
  authority_request_systems(ai_systems(id, name)),
  authority_request_evidences(system_evidences(id, title, status))
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): AuthorityRequestRow {
  return {
    ...r,
    owner_name: r.owner?.full_name ?? null,
    incident: r.incident ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systems: (r.authority_request_systems ?? []).map((s: any) => s.ai_systems).filter(Boolean),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evidences: (r.authority_request_evidences ?? []).map((e: any) => e.system_evidences).filter(Boolean),
  } as AuthorityRequestRow
}

export async function getAuthorityRequests(): Promise<AuthorityRequestRow[]> {
  const { profile, fluxion } = await ctx()
  if (!profile) return []
  const { data } = await fluxion
    .from('authority_requests')
    .select(SELECT)
    .eq('organization_id', profile.organization_id)
    .order('received_at', { ascending: false })
  return (data ?? []).map(mapRow)
}

export async function getAuthorityRequest(id: string): Promise<AuthorityRequestRow | null> {
  const { profile, fluxion } = await ctx()
  if (!profile) return null
  const { data } = await fluxion
    .from('authority_requests')
    .select(SELECT)
    .eq('organization_id', profile.organization_id)
    .eq('id', id)
    .maybeSingle()
  return data ? mapRow(data) : null
}

/** Incidentes y evidencias que se pueden vincular a un requerimiento. */
export async function getRequestOptions(): Promise<{
  incidents: Array<{ id: string; reference: string; title: string }>
  evidences: Array<{ id: string; title: string; status: string }>
}> {
  const { profile, fluxion } = await ctx()
  if (!profile) return { incidents: [], evidences: [] }
  const [{ data: incidentes }, { data: evidencias }] = await Promise.all([
    fluxion.from('ai_incidents').select('id, reference, title').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }),
    fluxion.from('system_evidences').select('id, title, status').eq('organization_id', profile.organization_id).order('created_at', { ascending: false }),
  ])
  return {
    incidents: (incidentes ?? []) as Array<{ id: string; reference: string; title: string }>,
    evidences: (evidencias ?? []) as Array<{ id: string; title: string; status: string }>,
  }
}

export async function createAuthorityRequest(input: {
  authority: string
  authorityReference: string
  kind: AuthorityRequestKind
  title: string
  description: string
  receivedAt: string
  dueAt: string | null
  incidentId: string | null
  ownerId: string | null
  systemIds: string[]
}): Promise<{ id: string; reference: string } | { error: string }> {
  const { error, profile, fluxion, userId } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!input.authority.trim()) return { error: 'Indica la autoridad que lo emite.' }
  if (!input.title.trim()) return { error: 'Indica qué se pide.' }
  if (!KINDS.includes(input.kind)) return { error: 'Tipo de requerimiento no válido.' }
  if (!input.receivedAt) return { error: 'Indica la fecha de recepción.' }
  if (input.dueAt && input.dueAt < input.receivedAt) return { error: 'El plazo no puede ser anterior a la recepción.' }

  const { data: row, error: insErr } = await fluxion
    .from('authority_requests')
    .insert({
      organization_id: profile.organization_id,
      authority: input.authority.trim(),
      authority_reference: input.authorityReference.trim() || null,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim() || null,
      received_at: input.receivedAt,
      due_at: input.dueAt || null,
      incident_id: input.incidentId || null,
      owner_id: input.ownerId || null,
      created_by: profile.id,
    })
    .select('id, reference')
    .single()
  if (insErr || !row) return { error: 'No se pudo registrar el requerimiento: ' + (insErr?.message ?? '') }

  if (input.systemIds.length > 0) {
    const { error: sysErr } = await fluxion.from('authority_request_systems').insert(
      input.systemIds.map((sid) => ({ request_id: row.id, ai_system_id: sid, organization_id: profile.organization_id })),
    )
    if (sysErr) return { error: 'Requerimiento registrado, pero no se pudieron vincular los sistemas: ' + sysErr.message }
    await insertAiSystemHistoryEvents(fluxion, input.systemIds.map((sid) => ({
      ai_system_id: sid,
      organization_id: profile.organization_id,
      event_type: 'authority_request_received',
      event_title: `Requerimiento de la autoridad · ${row.reference}`,
      event_summary: `${input.authority.trim()}: ${input.title.trim()}.`,
      payload: { request_id: row.id, kind: input.kind, due_at: input.dueAt || null },
      actor_user_id: userId,
    })))
  }

  // La respuesta se prepara como tarea, con el plazo de la autoridad. Con el
  // cliente de servicio, como las acciones correctivas: la política de tareas
  // solo mira el rol principal y el rol de gobierno ya está comprobado.
  await createAdminFluxionClient().from('tasks').insert({
    organization_id: profile.organization_id,
    title: `Responder al requerimiento ${row.reference} (${input.authority.trim()})`,
    description: input.title.trim(),
    priority: 'high',
    source_type: 'authority_request',
    source_id: row.id,
    assignee_id: input.ownerId || null,
    due_date: input.dueAt || null,
    created_by: profile.id,
  })

  revalidatePath('/incidentes')
  return { id: row.id, reference: row.reference }
}

export async function updateAuthorityRequest(id: string, input: {
  status: AuthorityRequestStatus
  dueAt: string | null
  ownerId: string | null
  response: string
  respondedAt: string | null
  evidenceIds: string[]
}): Promise<{ success?: true; error?: string }> {
  const { error, profile, fluxion, userId } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }
  if (!REQUEST_STATUS_ORDER.includes(input.status)) return { error: 'Estado no válido.' }
  const respondido = input.status === 'answered' || input.status === 'closed'
  if (respondido && !input.respondedAt) return { error: 'Indica la fecha de la respuesta para marcarlo como respondido o cerrado.' }
  if (respondido && !input.response.trim()) return { error: 'Resume qué se respondió.' }

  const { data: previo } = await fluxion
    .from('authority_requests')
    .select('id, reference, status, received_at, authority_request_systems(ai_system_id)')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()
  if (!previo) return { error: 'Requerimiento no encontrado.' }
  if (input.dueAt && input.dueAt < previo.received_at) return { error: 'El plazo no puede ser anterior a la recepción.' }
  if (input.respondedAt && input.respondedAt < previo.received_at) return { error: 'La respuesta no puede ser anterior a la recepción.' }

  const { error: updErr } = await fluxion
    .from('authority_requests')
    .update({
      status: input.status,
      due_at: input.dueAt || null,
      owner_id: input.ownerId || null,
      response: input.response.trim() || null,
      responded_at: input.respondedAt || null,
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
  if (updErr) return { error: 'No se pudo guardar: ' + updErr.message }

  // Evidencias de la respuesta: se sustituye el conjunto.
  await fluxion.from('authority_request_evidences').delete().eq('request_id', id).eq('organization_id', profile.organization_id)
  if (input.evidenceIds.length > 0) {
    const { error: evErr } = await fluxion.from('authority_request_evidences').insert(
      input.evidenceIds.map((eid) => ({ request_id: id, evidence_id: eid, organization_id: profile.organization_id })),
    )
    if (evErr) return { error: 'Guardado, pero no se pudieron vincular las evidencias: ' + evErr.message }
  }

  const eraRespondido = previo.status === 'answered' || previo.status === 'closed'
  const sistemas = ((previo.authority_request_systems ?? []) as Array<{ ai_system_id: string }>).map((s) => s.ai_system_id)
  if (respondido && !eraRespondido && sistemas.length > 0) {
    await insertAiSystemHistoryEvents(fluxion, sistemas.map((sid) => ({
      ai_system_id: sid,
      organization_id: profile.organization_id,
      event_type: 'authority_request_answered',
      event_title: `Requerimiento respondido · ${previo.reference}`,
      event_summary: input.response.trim(),
      payload: { request_id: id, responded_at: input.respondedAt },
      actor_user_id: userId,
    })))
  }

  revalidatePath('/incidentes')
  revalidatePath(`/incidentes/requerimientos/${id}`)
  return { success: true }
}

export async function addRequestTask(id: string, input: {
  title: string
  dueDate: string | null
}): Promise<{ success?: true; error?: string }> {
  const { error, profile, fluxion } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }
  const title = input.title.trim()
  if (!title) return { error: 'El título de la tarea es obligatorio.' }

  const { data: req } = await fluxion
    .from('authority_requests').select('reference').eq('id', id).eq('organization_id', profile.organization_id).maybeSingle()
  if (!req) return { error: 'Requerimiento no encontrado.' }

  const { error: insErr } = await createAdminFluxionClient().from('tasks').insert({
    organization_id: profile.organization_id,
    title,
    description: `Tarea del requerimiento ${req.reference}.`,
    priority: 'high',
    source_type: 'authority_request',
    source_id: id,
    due_date: input.dueDate || null,
    created_by: profile.id,
  })
  if (insErr) return { error: 'No se pudo crear la tarea: ' + insErr.message }

  revalidatePath(`/incidentes/requerimientos/${id}`)
  return { success: true }
}

export async function getRequestTasks(id: string) {
  const { profile, fluxion } = await ctx()
  if (!profile) return []
  const { data } = await fluxion
    .from('tasks')
    .select('id, title, status, due_date')
    .eq('organization_id', profile.organization_id)
    .eq('source_type', 'authority_request')
    .eq('source_id', id)
    .order('created_at')
  return (data ?? []) as Array<{ id: string; title: string; status: string; due_date: string | null }>
}
