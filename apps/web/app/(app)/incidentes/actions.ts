'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import { enqueueChannelMessage } from '@/lib/channels/send'
import { createNotification } from '@/lib/notifications/sender'

/**
 * Incidentes de IA.
 *
 * Dos principios que se reflejan en los permisos:
 *
 *   · Cualquier miembro puede DAR PARTE. Quien detecta el incidente suele ser
 *     quien opera el sistema, no quien lo gobierna. Poner barreras a reportar
 *     es la forma más eficaz de no enterarse de nada.
 *   · Solo gobierno CLASIFICA y NOTIFICA. Decidir que algo es un "incidente
 *     grave" del Art. 3.49 tiene consecuencias regulatorias y lo firma alguien.
 */

const GOVERNANCE_ROLES = ['org_admin', 'sgai_manager', 'caio', 'dpo', 'risk_analyst', 'compliance_analyst']

export type IncidentCategory =
  | 'death' | 'health_harm' | 'critical_infrastructure'
  | 'fundamental_rights' | 'property_environment' | 'other'

export type IncidentRow = {
  id:                     string
  reference:              string
  title:                  string
  description:            string | null
  category:               IncidentCategory
  is_serious:             boolean
  is_widespread_infringement: boolean
  reporter_role:          'provider' | 'deployer'
  status:                 'open' | 'investigating' | 'contained' | 'closed'
  occurred_at:            string | null
  became_aware_at:        string
  causal_link_established_at: string | null
  notification_deadline:  string | null
  notification_status:    'not_required' | 'pending' | 'initial_sent' | 'complete_sent' | 'not_applicable'
  notified_at:            string | null
  authority:              string | null
  notification_reference: string | null
  root_cause:             string | null
  impact_summary:         string | null
  affected_people_count:  number | null
  owner_id:               string | null
  owner_name:             string | null
  created_at:             string
  systems:                Array<{ id: string; name: string }>
}

async function ctx(requireGovernance = false) {
  const supabase = createClient()
  const fluxion  = createFluxionClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, profile: null }

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, full_name')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'No autenticado' as const, profile: null }
  if (requireGovernance && !GOVERNANCE_ROLES.includes(profile.role)) {
    return { error: 'Solo los roles de gobierno pueden clasificar o notificar incidentes.' as const, profile: null }
  }

  return { error: null, profile }
}

export async function getIncidents(): Promise<IncidentRow[]> {
  const { profile } = await ctx()
  if (!profile) return []

  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('ai_incidents')
    .select(`
      id, reference, title, description, category, is_serious, is_widespread_infringement,
      reporter_role, status, occurred_at, became_aware_at, causal_link_established_at,
      notification_deadline, notification_status, notified_at, authority, notification_reference,
      root_cause, impact_summary, affected_people_count, owner_id, created_at,
      owner:owner_id(full_name),
      ai_incident_systems(ai_system_id, ai_systems(id, name))
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    owner_name: r.owner?.full_name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systems: (r.ai_incident_systems ?? []).map((s: any) => s.ai_systems).filter(Boolean),
  })) as IncidentRow[]
}

export async function getIncident(id: string): Promise<IncidentRow | null> {
  const all = await getIncidents()
  return all.find((i) => i.id === id) ?? null
}

export async function getSystemsForIncident(): Promise<Array<{ id: string; name: string }>> {
  const fluxion = createFluxionClient()
  const { data } = await fluxion.from('ai_systems').select('id, name').order('name')
  return (data ?? []) as Array<{ id: string; name: string }>
}

/** Dar parte. Abierto a cualquier miembro; nace sin clasificar. */
export async function reportIncident(input: {
  title:           string
  description?:    string
  occurred_at?:    string | null
  became_aware_at?: string | null
  system_ids:      string[]
}): Promise<{ id: string; reference: string } | { error: string }> {
  const { error, profile } = await ctx()
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const title = input.title.trim()
  if (!title) return { error: 'El título es obligatorio.' }

  const admin = createAdminFluxionClient()

  const { data: row, error: insErr } = await admin
    .from('ai_incidents')
    .insert({
      organization_id: profile.organization_id,
      title,
      description:     input.description?.trim() || null,
      occurred_at:     input.occurred_at || null,
      // Por defecto, ahora: quien da parte se acaba de enterar.
      became_aware_at: input.became_aware_at || new Date().toISOString(),
      reported_by:     profile.id,
      // Nace sin clasificar: is_serious = false → sin plazo hasta que alguien decida.
    })
    .select('id, reference')
    .single()

  if (insErr || !row) return { error: 'Error al registrar: ' + (insErr?.message ?? '') }

  if (input.system_ids.length > 0) {
    await admin.from('ai_incident_systems').insert(
      input.system_ids.map((sid) => ({
        incident_id:     row.id,
        ai_system_id:    sid,
        organization_id: profile.organization_id,
      }))
    )
  }

  // Un incidente sin clasificar es una obligación potencial durmiendo: hay que
  // avisar a gobierno para que lo valore, no esperar a que alguien lo mire.
  const { data: people } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .in('role', GOVERNANCE_ROLES)

  for (const p of (people ?? []) as Array<{ id: string }>) {
    await createNotification({
      recipientProfileId: p.id,
      organizationId:     profile.organization_id,
      type:               'incident_reported',
      title:              `Incidente registrado · ${row.reference}`,
      body:               `«${title}». Pendiente de clasificar según el artículo 3.49 del AI Act.`,
      linkUrl:            `/incidentes/${row.id}`,
      metadata:           { incident_id: row.id, reference: row.reference },
      sendEmail:          false,
    })
  }

  await enqueueChannelMessage(admin, {
    organizationId: profile.organization_id,
    eventType:      'incident.created',
    subjectType:    'incident',
    subjectId:      row.id,
    message: {
      title: `Incidente registrado · ${row.reference}`,
      text:  `«${title}» — pendiente de clasificar.`,
      url:   `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fluxion-ai.es'}/incidentes/${row.id}`,
      level: 'warning',
    },
  })

  revalidatePath('/incidentes')
  return { id: row.id, reference: row.reference }
}

/**
 * Clasificar. Es lo que pone en marcha —o detiene— el reloj del Art. 73:
 * el trigger de la base de datos recalcula `notification_deadline`.
 */
export async function classifyIncident(id: string, input: {
  category:                   IncidentCategory
  is_serious:                 boolean
  is_widespread_infringement: boolean
  reporter_role:              'provider' | 'deployer'
  became_aware_at:            string
  causal_link_established_at?: string | null
}): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('ai_incidents')
    .update({
      category:                   input.category,
      is_serious:                 input.is_serious,
      is_widespread_infringement: input.is_widespread_infringement,
      reporter_role:              input.reporter_role,
      became_aware_at:            input.became_aware_at,
      causal_link_established_at: input.causal_link_established_at || null,
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al clasificar: ' + updErr.message }

  revalidatePath('/incidentes')
  revalidatePath(`/incidentes/${id}`)
  return { success: true }
}

/** Registrar la notificación a la autoridad. Art. 73.5 admite una inicial incompleta. */
export async function recordNotification(id: string, input: {
  notification_status: 'initial_sent' | 'complete_sent'
  notified_at:         string
  authority?:          string
  notification_reference?: string
}): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('ai_incidents')
    .update({
      notification_status:    input.notification_status,
      notified_at:            input.notified_at,
      authority:              input.authority?.trim() || null,
      notification_reference: input.notification_reference?.trim() || null,
    })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al registrar la notificación: ' + updErr.message }

  revalidatePath('/incidentes')
  revalidatePath(`/incidentes/${id}`)
  return { success: true }
}

export async function updateIncident(id: string, input: {
  status?:        'open' | 'investigating' | 'contained' | 'closed'
  root_cause?:    string
  impact_summary?: string
  affected_people_count?: number | null
  owner_id?:      string | null
}): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const patch: Record<string, unknown> = { ...input }

  if (input.status === 'closed') {
    patch.closed_at = new Date().toISOString()
    patch.closed_by = profile.id
  }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('ai_incidents')
    .update(patch)
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (updErr) return { error: 'Error al actualizar: ' + updErr.message }

  revalidatePath('/incidentes')
  revalidatePath(`/incidentes/${id}`)
  return { success: true }
}

/** Crea una acción correctiva como tarea enlazada al incidente. */
export async function addCorrectiveAction(incidentId: string, input: {
  title:      string
  assignee_id?: string | null
  due_date?:  string | null
}): Promise<{ success?: true; error?: string }> {
  const { error, profile } = await ctx(true)
  if (error || !profile) return { error: error ?? 'No autorizado' }

  const title = input.title.trim()
  if (!title) return { error: 'El título de la acción es obligatorio.' }

  const admin = createAdminFluxionClient()

  const { data: incident } = await admin
    .from('ai_incidents')
    .select('reference')
    .eq('id', incidentId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!incident) return { error: 'Incidente no encontrado.' }

  const { error: insErr } = await admin.from('tasks').insert({
    organization_id: profile.organization_id,
    title,
    description:     `Acción correctiva del incidente ${incident.reference}.`,
    priority:        'high',
    source_type:     'incident',
    source_id:       incidentId,
    assignee_id:     input.assignee_id || null,
    due_date:        input.due_date || null,
    created_by:      profile.id,
  })

  if (insErr) return { error: 'Error al crear la acción: ' + insErr.message }

  revalidatePath(`/incidentes/${incidentId}`)
  return { success: true }
}

export async function getCorrectiveActions(incidentId: string) {
  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('tasks')
    .select('id, title, status, priority, due_date, assignee_id')
    .eq('source_type', 'incident')
    .eq('source_id', incidentId)
    .order('created_at')

  return (data ?? []) as Array<{
    id: string; title: string; status: string; priority: string
    due_date: string | null; assignee_id: string | null
  }>
}

export async function getOrgMembers(): Promise<Array<{ id: string; name: string }>> {
  const fluxion = createFluxionClient()
  const { data } = await fluxion
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('is_active', true)
    .order('full_name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    name: p.display_name ?? p.full_name ?? '(sin nombre)',
  }))
}
