'use server'

import { revalidatePath } from 'next/cache'

import { logAuditEvent } from '@/lib/audit'
import { hasAnyRole } from '@/lib/auth/roles'
import { generateSessionMinutesEvidence } from '@/lib/governance/committee-session-server'
import {
  APPROVAL_STATUS_LABEL,
  SESSION_MANAGE_ROLES,
  SESSION_OFFICER_ROLES,
  closeBlockers,
  mergeAttendees,
  normalizeAgenda,
  normalizeAttendees,
  normalizeDecisions,
  sessionLabel,
  sessionQuorum,
  sessionTypesFor,
  type AgendaItem,
  type Attendee,
  type Decision,
  type SessionStatus,
  type SessionType,
} from '@/lib/governance/committee-sessions'
import { managementReviewAgenda, refreshManagementReviewAgenda } from '@/lib/iso/management-review'
import { completeManagementReviewTasks, loadManagementReviewData } from '@/lib/iso/management-review-server'
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import { createClient } from '@/lib/supabase/server'

/**
 * Sesiones de comité (B20b, DP-09, decisión 62).
 *
 * Las gestionan el Administrador, el Responsable del SGAI, el CAIO y el
 * presidente o el secretario del comité (la RLS dice lo mismo). Cualquier
 * miembro de la organización las consulta. Al cerrar la sesión el acta queda
 * bloqueada, los acuerdos con responsable crean una tarea y el PDF del acta
 * se registra como evidencia.
 */

async function ctx() {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, role, roles, full_name')
    .eq('user_id', user.id)
    .single()
  if (!profile) return null
  return { fluxion, profile, userId: user.id }
}

type Ctx = NonNullable<Awaited<ReturnType<typeof ctx>>>

async function puedeGestionar(c: Ctx, committeeId: string): Promise<boolean> {
  if (hasAnyRole(c.profile, [...SESSION_MANAGE_ROLES])) return true
  const { data } = await c.fluxion
    .from('committee_members')
    .select('committee_role')
    .eq('committee_id', committeeId)
    .eq('profile_id', c.profile.id)
    .eq('is_active', true)
  return (data ?? []).some((m: { committee_role: string }) => SESSION_OFFICER_ROLES.has(m.committee_role))
}

function auditar(c: Ctx, action: 'org.committee_session_scheduled' | 'org.committee_session_updated' | 'org.committee_session_closed' | 'org.committee_session_cancelled', id: string, label: string, metadata?: Record<string, unknown>) {
  void logAuditEvent({
    organization_id: c.profile.organization_id,
    actor_id: c.profile.id,
    actor_name: c.profile.full_name ?? undefined,
    action,
    target_type: 'committee',
    target_id: id,
    target_label: label,
    metadata,
  })
}

export type CommitteeSessionSummary = {
  id: string
  session_number: number
  session_type: SessionType
  scheduled_at: string
  status: SessionStatus
  location: string | null
  minutes_locked: boolean
  minutes_evidence_id: string | null
}

/** Sesiones de un comité, de la más reciente a la más antigua. */
export async function listCommitteeSessions(committeeId: string): Promise<{ sessions: CommitteeSessionSummary[]; canManage: boolean } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const { data, error } = await c.fluxion
    .from('committee_sessions')
    .select('id, session_number, session_type, scheduled_at, status, location, minutes_locked, minutes_evidence_id')
    .eq('committee_id', committeeId)
    .eq('organization_id', c.profile.organization_id)
    .order('scheduled_at', { ascending: false })
  if (error) return { error: error.message }
  return { sessions: (data ?? []) as CommitteeSessionSummary[], canManage: await puedeGestionar(c, committeeId) }
}

export async function scheduleCommitteeSession(input: {
  committeeId: string
  sessionType: SessionType
  scheduledAt: string
  location: string
}): Promise<{ id?: string; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const { data: comite } = await c.fluxion
    .from('committees').select('id, name, type, is_active')
    .eq('id', input.committeeId).eq('organization_id', c.profile.organization_id).maybeSingle()
  if (!comite) return { error: 'Comité no encontrado.' }
  if (!comite.is_active) return { error: 'El comité está inactivo.' }
  if (!(await puedeGestionar(c, comite.id))) return { error: 'No tienes permisos para convocar sesiones de este comité.' }
  if (!sessionTypesFor(comite.type).includes(input.sessionType)) return { error: 'Tipo de sesión no válido para este comité.' }
  if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) return { error: 'Indica la fecha y hora de la sesión.' }

  const { data: miembros } = await c.fluxion
    .from('committee_members')
    .select('id, committee_role, external_name, profiles!committee_members_profile_id_fkey(full_name)')
    .eq('committee_id', comite.id).eq('is_active', true)
  const attendees = mergeAttendees(miembrosDe(miembros), [])
  // Sin miembros con voto no hay quórum posible: primero se completa el comité.
  if (!attendees.some((a) => a.voting)) return { error: 'El comité no tiene miembros con voto. Añádelos antes de convocar una sesión.' }
  // Revisión por la dirección (B20c): orden del día de §9.3.2 con los datos de
  // la aplicación. Con el cliente de servicio: el permiso ya está comprobado y
  // los datos son de toda la organización.
  const agenda = input.sessionType === 'management_review'
    ? managementReviewAgenda(await loadManagementReviewData(createAdminFluxionClient(), c.profile.organization_id, new Date().toISOString()))
    : []

  const { data, error } = await c.fluxion
    .from('committee_sessions')
    .insert({
      committee_id: comite.id,
      organization_id: c.profile.organization_id,
      // Lo fija el trigger; la columna es NOT NULL.
      session_number: 0,
      session_type: input.sessionType,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      location: input.location.trim() || null,
      attendees,
      agenda,
      // profiles.id: así lo exige la clave ajena de committee_sessions.
      created_by: c.profile.id,
    })
    .select('id, session_number')
    .single()
  if (error || !data) return { error: 'No se pudo convocar la sesión: ' + (error?.message ?? '') }

  auditar(c, 'org.committee_session_scheduled', data.id, `${comite.name} · ${sessionLabel(data.session_number, input.sessionType)}`)
  revalidatePath('/organizacion')
  return { id: data.id }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function miembrosDe(rows: any[] | null): Array<{ id: string; name: string; committee_role: string }> {
  return (rows ?? []).map((m) => ({
    id: m.id,
    name: m.profiles?.full_name ?? m.external_name ?? 'Miembro',
    committee_role: m.committee_role,
  }))
}

export type PendingCommitteeApproval = { id: string; label: string; object_type: string; status: string; status_label: string; href: string | null }

export type CommitteeSessionDetail = {
  id: string
  session_number: number
  session_type: SessionType
  label: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  status: SessionStatus
  location: string | null
  agenda: AgendaItem[]
  attendees: Attendee[]
  decisions: Decision[]
  minutes_text: string
  minutes_locked: boolean
  minutes_locked_at: string | null
  minutes_evidence_id: string | null
  cancelled_reason: string | null
  quorum_met: boolean | null
  committee: { id: string; name: string; type: string; quorum: number | null }
  sessionTypes: SessionType[]
  /** Solicitudes pendientes del comité y las ya enlazadas en el orden del día. */
  approvals: PendingCommitteeApproval[]
  members: Array<{ id: string; label: string }>
  canManage: boolean
}

export async function getCommitteeSession(id: string): Promise<CommitteeSessionDetail | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const { data: s } = await c.fluxion
    .from('committee_sessions')
    .select('id, committee_id, session_number, session_type, scheduled_at, started_at, ended_at, status, location, agenda, attendees, decisions, minutes_text, minutes_locked, minutes_locked_at, minutes_evidence_id, cancelled_reason, quorum_met')
    .eq('id', id).eq('organization_id', c.profile.organization_id).maybeSingle()
  if (!s) return { error: 'Sesión no encontrada.' }

  const [{ data: comite }, { data: miembros }, { data: perfiles }] = await Promise.all([
    c.fluxion.from('committees').select('id, name, type, quorum').eq('id', s.committee_id).maybeSingle(),
    c.fluxion.from('committee_members')
      .select('id, committee_role, external_name, profiles!committee_members_profile_id_fkey(full_name)')
      .eq('committee_id', s.committee_id).eq('is_active', true),
    c.fluxion.from('profiles').select('id, full_name, display_name').eq('organization_id', c.profile.organization_id).order('full_name'),
  ])
  if (!comite) return { error: 'Comité no encontrado.' }

  const agenda = normalizeAgenda(s.agenda)
  const guardados = normalizeAttendees(s.attendees)
  // Mientras está abierta, la lista sigue a los miembros actuales del comité.
  const attendees = s.minutes_locked || s.status === 'cancelled' ? guardados : mergeAttendees(miembrosDe(miembros), guardados)

  return {
    id: s.id,
    session_number: s.session_number,
    session_type: s.session_type as SessionType,
    label: sessionLabel(s.session_number, s.session_type as SessionType),
    scheduled_at: s.scheduled_at,
    started_at: s.started_at,
    ended_at: s.ended_at,
    status: s.status as SessionStatus,
    location: s.location,
    agenda,
    attendees,
    decisions: normalizeDecisions(s.decisions),
    minutes_text: s.minutes_text ?? '',
    minutes_locked: s.minutes_locked,
    minutes_locked_at: s.minutes_locked_at,
    minutes_evidence_id: s.minutes_evidence_id,
    cancelled_reason: s.cancelled_reason,
    quorum_met: s.quorum_met,
    committee: comite as CommitteeSessionDetail['committee'],
    sessionTypes: sessionTypesFor(comite.type),
    approvals: await solicitudesDelComite(c.profile.organization_id, comite.id, agenda),
    members: ((perfiles ?? []) as Array<{ id: string; full_name: string | null; display_name: string | null }>)
      .map((p) => ({ id: p.id, label: p.display_name || p.full_name || 'Usuario' })),
    canManage: await puedeGestionar(c, comite.id),
  }
}

/**
 * Solicitudes pendientes cuyo paso actual decide este comité, más las ya
 * enlazadas en el orden del día (aunque se hayan cerrado después).
 */
async function solicitudesDelComite(organizationId: string, committeeId: string, agenda: AgendaItem[]): Promise<PendingCommitteeApproval[]> {
  const admin = createNoCacheAdminClient()
  const enlazadas = agenda.map((p) => p.approval_request_id).filter((x): x is string => !!x)
  const [{ data: pendientes }, { data: previas }] = await Promise.all([
    admin.from('v_approval_requests').select('id, object_type, object_label, object_href, status, current_step')
      .eq('organization_id', organizationId).eq('status', 'pending'),
    enlazadas.length
      ? admin.from('v_approval_requests').select('id, object_type, object_label, object_href, status, current_step')
          .eq('organization_id', organizationId).in('id', enlazadas)
      : Promise.resolve({ data: [] }),
  ])
  type Fila = { id: string; object_type: string; object_label: string | null; object_href: string | null; status: string; current_step: { approver_type?: string; approver_ref?: string } | null }
  const delComite = ((pendientes ?? []) as Fila[]).filter((r) => r.current_step?.approver_type === 'committee' && r.current_step?.approver_ref === committeeId)
  const todas = new Map<string, Fila>()
  for (const r of [...delComite, ...((previas ?? []) as Fila[])]) todas.set(r.id, r)
  return Array.from(todas.values()).map((r) => ({
    id: r.id,
    label: r.object_label ?? `APR-${r.id.slice(0, 8)}`,
    object_type: r.object_type,
    status: r.status,
    status_label: APPROVAL_STATUS_LABEL[r.status] ?? r.status,
    href: r.object_href,
  }))
}

async function sesionAbierta(c: Ctx, id: string) {
  const { data: s } = await c.fluxion
    .from('committee_sessions')
    .select('id, committee_id, session_number, session_type, status, minutes_locked, started_at, committees(name, type, quorum)')
    .eq('id', id).eq('organization_id', c.profile.organization_id).maybeSingle()
  if (!s) return { error: 'Sesión no encontrada.' as const }
  if (s.minutes_locked || s.status === 'completed' || s.status === 'cancelled') return { error: 'La sesión está cerrada: el acta no se puede modificar.' as const }
  if (!(await puedeGestionar(c, s.committee_id))) return { error: 'No tienes permisos para gestionar las sesiones de este comité.' as const }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comite = (Array.isArray((s as any).committees) ? (s as any).committees[0] : (s as any).committees) as { name: string; type: string; quorum: number | null }
  return { s, comite }
}

export type CommitteeSessionInput = {
  sessionType: SessionType
  scheduledAt: string
  location: string
  agenda: AgendaItem[]
  attendees: Attendee[]
  decisions: Decision[]
  minutesText: string
}

function limpiar(input: CommitteeSessionInput) {
  return {
    agenda: normalizeAgenda(input.agenda).filter((p) => p.title.trim() || p.notes.trim() || p.approval_request_id)
      .map((p) => ({ ...p, title: p.title.trim().slice(0, 300), notes: p.notes.trim() })),
    attendees: normalizeAttendees(input.attendees).filter((a) => a.name.trim())
      .map((a) => ({ ...a, name: a.name.trim().slice(0, 200), voting: a.member_id ? a.voting : false })),
    // Los task_id solo los pone el cierre.
    decisions: normalizeDecisions(input.decisions).filter((d) => d.text.trim() || d.owner_profile_id || d.due_date)
      .map((d) => ({ ...d, text: d.text.trim(), task_id: null })),
    minutes_text: input.minutesText,
  }
}

/** Guarda el borrador de la sesión (orden del día, asistentes, acuerdos y acta). */
export async function saveCommitteeSession(id: string, input: CommitteeSessionInput, opts?: { start?: boolean }): Promise<{ success?: true; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const r = await sesionAbierta(c, id)
  if ('error' in r) return { error: r.error }
  if (!sessionTypesFor(r.comite.type).includes(input.sessionType)) return { error: 'Tipo de sesión no válido para este comité.' }
  if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt))) return { error: 'Indica la fecha y hora de la sesión.' }

  const empezar = opts?.start && r.s.status === 'scheduled'
  const { error } = await c.fluxion
    .from('committee_sessions')
    .update({
      session_type: input.sessionType,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      location: input.location.trim() || null,
      ...limpiar(input),
      ...(empezar ? { status: 'in_progress', started_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
  if (error) return { error: 'No se pudo guardar la sesión: ' + error.message }

  if (empezar) auditar(c, 'org.committee_session_updated', id, `${r.comite.name} · ${sessionLabel(r.s.session_number, input.sessionType)}`, { status: 'in_progress' })
  revalidatePath(`/organizacion/sesiones/${id}`)
  return { success: true }
}

/**
 * Cierra la sesión: guarda lo último, crea las tareas de los acuerdos con
 * responsable, bloquea el acta y genera el PDF como evidencia.
 */
export async function closeCommitteeSession(id: string, input: CommitteeSessionInput): Promise<{ success?: true; aviso?: string; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const r = await sesionAbierta(c, id)
  if ('error' in r) return { error: r.error }
  if (!sessionTypesFor(r.comite.type).includes(input.sessionType)) return { error: 'Tipo de sesión no válido para este comité.' }

  const datos = limpiar(input)
  const faltas = closeBlockers({ status: r.s.status as SessionStatus, ...datos, minutesText: datos.minutes_text })
  if (faltas.length) return { error: faltas.join(' ') }

  const etiqueta = `${r.comite.name} · ${sessionLabel(r.s.session_number, input.sessionType)}`

  // Tareas de los acuerdos con responsable. Con el cliente de servicio, como
  // los requerimientos: la política de tareas solo mira el rol principal y
  // el permiso sobre la sesión ya está comprobado.
  const admin = createAdminFluxionClient()
  const decisions: Decision[] = []
  for (const d of datos.decisions) {
    if (!d.owner_profile_id) { decisions.push(d); continue }
    const { data: tarea } = await admin.from('tasks').insert({
      organization_id: c.profile.organization_id,
      title: `Acuerdo del ${r.comite.name}: ${d.text}`.slice(0, 300),
      description: `${etiqueta}. ${d.text}`,
      priority: 'medium',
      source_type: 'committee_session',
      source_id: id,
      assignee_id: d.owner_profile_id,
      due_date: d.due_date,
      created_by: c.profile.id,
    }).select('id').single()
    decisions.push({ ...d, task_id: tarea?.id ?? null })
  }

  const ahora = new Date().toISOString()
  const quorum = sessionQuorum(datos.attendees, r.comite.quorum)
  const { error } = await c.fluxion
    .from('committee_sessions')
    .update({
      session_type: input.sessionType,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      location: input.location.trim() || null,
      ...datos,
      decisions,
      status: 'completed',
      started_at: r.s.started_at ?? ahora,
      ended_at: ahora,
      quorum_met: quorum.met,
      minutes_locked: true,
      minutes_locked_at: ahora,
      minutes_locked_by: c.profile.id,
    })
    .eq('id', id)
  if (error) return { error: 'No se pudo cerrar la sesión: ' + error.message }

  // La revisión por la dirección celebrada completa su tarea anual (B20c).
  if (input.sessionType === 'management_review') await completeManagementReviewTasks(admin, c.profile.organization_id)

  auditar(c, 'org.committee_session_closed', id, etiqueta, { quorum_met: quorum.met, decisions: decisions.length })
  const { aviso } = await generateSessionMinutesEvidence({ sessionId: id, actorUserId: c.userId })
  revalidatePath(`/organizacion/sesiones/${id}`)
  revalidatePath('/organizacion')
  return { success: true, ...(aviso ? { aviso } : {}) }
}

/**
 * Recalcula los datos de la aplicación de los puntos de §9.3.2 de una
 * revisión por la dirección abierta, sin tocar lo redactado (B20c). No guarda:
 * devuelve el orden del día para que se guarde con el resto.
 */
export async function refreshReviewAgendaData(id: string, agenda: AgendaItem[]): Promise<{ agenda?: AgendaItem[]; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const r = await sesionAbierta(c, id)
  if ('error' in r) return { error: r.error }
  if (r.s.session_type !== 'management_review') return { error: 'Solo las revisiones por la dirección tienen datos de la aplicación.' }
  const datos = await loadManagementReviewData(createAdminFluxionClient(), c.profile.organization_id, new Date().toISOString())
  return { agenda: refreshManagementReviewAgenda(normalizeAgenda(agenda), datos) }
}

/** Reintenta el PDF del acta de una sesión cerrada que se quedó sin evidencia. */
export async function regenerateSessionMinutes(id: string): Promise<{ success?: true; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const { data: s } = await c.fluxion
    .from('committee_sessions').select('id, committee_id, minutes_locked, minutes_evidence_id')
    .eq('id', id).eq('organization_id', c.profile.organization_id).maybeSingle()
  if (!s) return { error: 'Sesión no encontrada.' }
  if (!s.minutes_locked) return { error: 'El acta aún no está cerrada.' }
  if (!(await puedeGestionar(c, s.committee_id))) return { error: 'No tienes permisos para gestionar las sesiones de este comité.' }
  const { aviso } = await generateSessionMinutesEvidence({ sessionId: id, actorUserId: c.userId })
  if (aviso) return { error: aviso }
  revalidatePath(`/organizacion/sesiones/${id}`)
  return { success: true }
}

export async function cancelCommitteeSession(id: string, reason: string): Promise<{ success?: true; error?: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autorizado' }
  const r = await sesionAbierta(c, id)
  if ('error' in r) return { error: r.error }
  if (!reason.trim()) return { error: 'Indica el motivo de la cancelación.' }
  const { error } = await c.fluxion
    .from('committee_sessions')
    .update({ status: 'cancelled', cancelled_reason: reason.trim() })
    .eq('id', id)
  if (error) return { error: 'No se pudo cancelar la sesión: ' + error.message }
  auditar(c, 'org.committee_session_cancelled', id, `${r.comite.name} · ${sessionLabel(r.s.session_number, r.s.session_type as SessionType)}`, { reason: reason.trim() })
  revalidatePath(`/organizacion/sesiones/${id}`)
  revalidatePath('/organizacion')
  return { success: true }
}
