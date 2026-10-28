import 'server-only'

import { hasValidLiteracy } from '@/lib/governance/oversight'
import { loadTrainings } from '@/lib/governance/oversight-server'
import { normalizeDecisions } from '@/lib/governance/committee-sessions'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import {
  MANAGEMENT_REVIEW_TASK_TITLE,
  followsIso42001,
  managementReviewDue,
  type ManagementReviewData,
} from './management-review'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/**
 * Revisión por la dirección (B20c): datos de la aplicación para el orden del
 * día, tarea anual y enlace del acta con la cláusula §9.3.
 */

const ACCIONES_CERRADAS = ['completed', 'accepted', 'cancelled']
const TAREAS_CERRADAS = ['done', 'cancelled']

/** Última revisión por la dirección celebrada (sesión cerrada); null si no hay. */
export async function lastManagementReview(client: FluxionClient, organizationId: string): Promise<{ id: string; at: string } | null> {
  const { data } = await client
    .from('committee_sessions')
    .select('id, ended_at, scheduled_at')
    .eq('organization_id', organizationId)
    .eq('session_type', 'management_review')
    .eq('status', 'completed')
  const filas = ((data ?? []) as Array<{ id: string; ended_at: string | null; scheduled_at: string }>)
    .map((r) => ({ id: r.id, at: r.ended_at ?? r.scheduled_at }))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
  return filas[0] ?? null
}

const contar = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0

export async function loadManagementReviewData(client: FluxionClient, organizationId: string, nowIso: string): Promise<ManagementReviewData> {
  const previa = await lastManagementReview(client, organizationId)
  const desde = previa?.at ?? '1970-01-01T00:00:00Z'
  const hoy = nowIso.slice(0, 10)

  const [
    { data: sesionPrevia }, { data: sistemas }, requerimientos, { data: incidentes }, reevaluaciones,
    accionesVencidas, { data: evidencias }, { data: clausulas }, { data: soaMeta }, { data: soaControles },
    { data: miembros }, trainings,
  ] = await Promise.all([
    previa ? client.from('committee_sessions').select('decisions').eq('id', previa.id).maybeSingle() : Promise.resolve({ data: null }),
    client.from('ai_systems').select('status, aiact_risk_level, created_at').eq('organization_id', organizationId),
    contar(client.from('authority_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('received_at', desde.slice(0, 10))),
    client.from('ai_incidents').select('is_serious, status, created_at, closed_at').eq('organization_id', organizationId),
    contar(client.from('reevaluation_triggers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('state', 'detectado')),
    contar(client.from('treatment_actions').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .lt('due_date', hoy).not('status', 'in', `(${ACCIONES_CERRADAS.join(',')})`)),
    client.from('system_evidences').select('status, expires_at').eq('organization_id', organizationId).in('status', ['valid', 'expired']),
    client.from('organization_obligations').select('obligation_code, status').eq('organization_id', organizationId),
    client.from('organization_soa_metadata').select('lifecycle_status').eq('organization_id', organizationId).maybeSingle(),
    client.from('organization_soa_controls').select('is_applicable, status').eq('organization_id', organizationId),
    client.from('profiles').select('id, is_active').eq('organization_id', organizationId),
    loadTrainings(client, organizationId),
  ])

  // Acuerdos con tarea de la revisión anterior.
  const tareaIds = normalizeDecisions(sesionPrevia?.decisions).map((d) => d.task_id).filter((x): x is string => !!x)
  const { data: tareas } = tareaIds.length
    ? await client.from('tasks').select('status, due_date').in('id', tareaIds)
    : { data: [] }
  const filasTarea = (tareas ?? []) as Array<{ status: string; due_date: string | null }>
  const abiertas = filasTarea.filter((t) => !TAREAS_CERRADAS.includes(t.status))

  const filasSistema = (sistemas ?? []) as Array<{ status: string | null; aiact_risk_level: string | null; created_at: string }>
  const activos = filasSistema.filter((s) => s.status !== 'retirado')
  const filasIncidente = (incidentes ?? []) as Array<{ is_serious: boolean | null; status: string; created_at: string; closed_at: string | null }>
  const delPeriodo = filasIncidente.filter((i) => i.created_at >= desde)
  const filasClausula = (clausulas ?? []) as Array<{ obligation_code: string; status: string }>
  const aplicables = ((soaControles ?? []) as Array<{ is_applicable: boolean; status: string }>).filter((c) => c.is_applicable)
  const activosMiembros = ((miembros ?? []) as Array<{ id: string; is_active: boolean | null }>).filter((m) => m.is_active !== false)

  return {
    previousReviewAt: previa?.at ?? null,
    previousActions: {
      total: filasTarea.length,
      done: filasTarea.filter((t) => t.status === 'done').length,
      open: abiertas.length,
      overdue: abiertas.filter((t) => t.due_date && t.due_date < hoy).length,
    },
    systems: {
      active: activos.length,
      highRisk: activos.filter((s) => s.aiact_risk_level === 'high').length,
      newSincePrevious: filasSistema.filter((s) => s.created_at >= desde).length,
      retired: filasSistema.length - activos.length,
    },
    authorityRequests: requerimientos,
    incidents: {
      total: delPeriodo.length,
      serious: delPeriodo.filter((i) => i.is_serious).length,
      open: filasIncidente.filter((i) => !i.closed_at).length,
    },
    openReevaluations: reevaluaciones,
    overdueTreatmentActions: accionesVencidas,
    expiredEvidences: ((evidencias ?? []) as Array<{ status: string; expires_at: string | null }>)
      .filter((e) => e.status === 'expired' || (e.expires_at && e.expires_at < hoy)).length,
    sgai: { resolved: filasClausula.filter((c) => c.status === 'resolved').length, total: filasClausula.length },
    soa: {
      lifecycle: (soaMeta?.lifecycle_status as string | null) ?? null,
      implemented: aplicables.filter((c) => c.status === 'implemented' || c.status === 'externalized').length,
      applicable: aplicables.length,
    },
    internalAuditStatus: filasClausula.find((c) => c.obligation_code === 'ISO42001-9.2')?.status ?? null,
    literacy: {
      members: activosMiembros.length,
      withLiteracy: activosMiembros.filter((m) => hasValidLiteracy(trainings.get(m.id) ?? [], hoy)).length,
    },
  }
}

/** Quién recibe la tarea: el Responsable del SGAI o, si no hay, un Administrador. */
async function responsable(admin: FluxionClient, organizationId: string): Promise<string | null> {
  const { data } = await admin.from('profiles').select('id, roles, is_active').eq('organization_id', organizationId)
  const activos = ((data ?? []) as Array<{ id: string; roles: string[] | null; is_active: boolean | null }>).filter((p) => p.is_active !== false)
  return (activos.find((p) => p.roles?.includes('sgai_manager')) ?? activos.find((p) => p.roles?.includes('org_admin')))?.id ?? null
}

/** Completa las tareas abiertas de revisión por la dirección de la organización. */
export async function completeManagementReviewTasks(admin: FluxionClient, organizationId: string): Promise<number> {
  const { data } = await admin
    .from('tasks')
    .update({ status: 'done' })
    .eq('organization_id', organizationId)
    .eq('source_type', 'management_review')
    .not('status', 'in', `(${TAREAS_CERRADAS.join(',')})`)
    .select('id')
  return (data ?? []).length
}

/**
 * Cron diario: en las organizaciones que siguen ISO/IEC 42001, crea la tarea
 * «Celebrar la revisión por la dirección» cuando se acercan los 12 meses (o no
 * hubo ninguna) y la completa si ya se celebró. Una sola tarea abierta por
 * organización.
 */
export async function syncManagementReviewTasks(nowIso = new Date().toISOString()): Promise<{ created: number; completed: number }> {
  const admin = createAdminFluxionClient()
  const [{ data: orgs }, { data: comites }] = await Promise.all([
    admin.from('organizations').select('id, normative_modules'),
    admin.from('committees').select('organization_id').eq('type', 'director_review').eq('is_active', true),
  ])
  const conComite = new Set(((comites ?? []) as Array<{ organization_id: string }>).map((c) => c.organization_id))
  let created = 0
  let completed = 0
  for (const org of (orgs ?? []) as Array<{ id: string; normative_modules: string[] | null }>) {
    if (!followsIso42001(org.normative_modules, conComite.has(org.id))) continue
    const previa = await lastManagementReview(admin, org.id)
    const { due, dueDate } = managementReviewDue(previa?.at ?? null, nowIso)
    if (!due) {
      completed += await completeManagementReviewTasks(admin, org.id)
      continue
    }
    const { data: abierta } = await admin
      .from('tasks').select('id')
      .eq('organization_id', org.id).eq('source_type', 'management_review')
      .not('status', 'in', `(${TAREAS_CERRADAS.join(',')})`)
      .limit(1)
    if ((abierta ?? []).length > 0) continue
    const { error } = await admin.from('tasks').insert({
      organization_id: org.id,
      title: MANAGEMENT_REVIEW_TASK_TITLE,
      description: previa
        ? `La última revisión por la dirección se celebró el ${new Date(previa.at).toLocaleDateString('es-ES')}. Convócala en Organización › Comités, en el comité Revisión por la Dirección: el orden del día se rellena con las entradas de §9.3.2 y los datos de la aplicación.`
        : 'No consta ninguna revisión por la dirección. Convócala en Organización › Comités, en el comité Revisión por la Dirección (constitúyelo si aún no existe): el orden del día se rellena con las entradas de §9.3.2 y los datos de la aplicación.',
      priority: 'high',
      source_type: 'management_review',
      source_id: org.id,
      assignee_id: await responsable(admin, org.id),
      due_date: dueDate,
    })
    if (error) console.error('[management-review] tarea:', error)
    else created++
  }
  return { created, completed }
}

/**
 * Vincula el acta de una revisión por la dirección a la cláusula §9.3 del
 * sistema de gestión, creando su fila si aún no existe.
 */
export async function linkReviewMinutesToClause(admin: FluxionClient, organizationId: string, evidenceId: string): Promise<void> {
  const { data: fila } = await admin
    .from('organization_obligations')
    .upsert({ organization_id: organizationId, obligation_code: 'ISO42001-9.3' }, { onConflict: 'organization_id,obligation_code', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()
  let id = fila?.id as string | undefined
  if (!id) {
    const { data } = await admin.from('organization_obligations').select('id')
      .eq('organization_id', organizationId).eq('obligation_code', 'ISO42001-9.3').maybeSingle()
    id = data?.id
  }
  if (!id) return
  await admin.from('organization_obligation_evidences')
    .upsert({ obligation_id: id, evidence_id: evidenceId, organization_id: organizationId }, { onConflict: 'obligation_id,evidence_id', ignoreDuplicates: true })
}
