import 'server-only'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { syncAisiaSoaControls } from '@/lib/aisia/soa-sync'
import { templateMeta } from '@/lib/documents/templates'
import { applyRiskEvaluationApproval } from '@/lib/fmea/lifecycle'
import { createNoCacheAdminClient } from '@/lib/supabase/ingest'
import type { ApprovalObjectType } from './catalog'

/**
 * Qué le pasa a cada objeto cuando su solicitud se cierra.
 *
 * El motor devuelve un veredicto y no sabe qué es un plan de tratamiento. Esa
 * separación es deliberada (§2.1 del plan del módulo): así se engancha un
 * dominio cada vez sin migrar nada, y un fallo en uno no rompe los otros.
 *
 * Este fichero es la costura. Un dominio nuevo se añade con un `case`.
 *
 * Los efectos NO lanzan: la decisión ya está registrada y es inmutable. Si el
 * objeto no se puede actualizar, se registra en el log y se devuelve el aviso
 * para enseñarlo — pero el voto se ha emitido y no se deshace.
 */
export async function applyApprovalOutcome(params: {
  objectType: ApprovalObjectType
  objectId:   string
  requestId:  string
  outcome:    'approved' | 'rejected'
  reason?:    string | null
  /** auth.users.id de quien emitió la decisión que cerró la solicitud. */
  actorUserId?: string | null
  /** profiles.id de quien emitió la decisión que cerró la solicitud. */
  actorProfileId?: string | null
}): Promise<{ aviso?: string }> {
  switch (params.objectType) {
    case 'treatment_plan':
      return aplicarAPlan(params)
    case 'aisia_assessment':
      return aplicarAAisia(params)
    case 'document':
      return aplicarADocumento(params)
    case 'soa':
      return aplicarADeclaracion(params)
    case 'evidence':
      return aplicarAEvidencia(params)
    case 'gap_disposition':
      return aplicarAExclusion(params)
    default:
      return {}
  }
}

type EfectoParams = {
  objectId:  string
  requestId: string
  outcome:   'approved' | 'rejected'
  reason?:   string | null
  actorUserId?: string | null
  actorProfileId?: string | null
}

/** Referencia del acta: la solicitud real, con sus votos y sus nombres. */
const refActa = (requestId: string) => `APR-${requestId.slice(0, 8)}`

function aviso(que: string, error: { message: string }) {
  console.error(`[approvals/effects] ${que}:`, error)
  return { aviso: `La decisión quedó registrada, pero ${que}: ${error.message}` }
}

// ── AISIA (B11a) ─────────────────────────────────────────────────────────────

async function aplicarAAisia(params: EfectoParams): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const { data: a } = await admin
    .from('aisia_assessments')
    .select('id, organization_id, ai_system_id, version, status')
    .eq('id', params.objectId)
    .maybeSingle()
  if (!a) return { aviso: 'La decisión quedó registrada, pero la AISIA ya no existe.' }

  const now = new Date().toISOString()
  const aprobada = params.outcome === 'approved'

  const { error } = await admin
    .from('aisia_assessments')
    .update(aprobada
      ? { status: 'approved', approved_by: params.actorProfileId ?? null, approved_at: now, approval_minutes_ref: refActa(params.requestId) }
      : { status: 'rejected', rejected_by: params.actorProfileId ?? null, rejected_at: now, rejection_reason: params.reason ?? 'Sin motivo registrado' })
    .eq('id', a.id)
  if (error) return aviso('la AISIA no se pudo actualizar', error)

  await insertAiSystemHistoryEvents(admin, [{
    ai_system_id: a.ai_system_id,
    organization_id: a.organization_id,
    event_type: aprobada ? 'aisia_approved' : 'aisia_rejected',
    event_title: aprobada ? 'AISIA aprobada' : 'AISIA rechazada',
    event_summary: `La evaluación AISIA v${a.version} fue ${aprobada ? 'aprobada' : 'rechazada'} en Flujos de aprobación.`,
    actor_user_id: params.actorUserId ?? null,
    payload: { assessment_id: a.id, approval_request_id: params.requestId, reason: params.reason ?? null },
  }])

  if (aprobada) {
    const sync = await syncAisiaSoaControls(admin, a.organization_id)
    if (sync.deferred) {
      return { aviso: 'La Declaración de Aplicabilidad no está en borrador: los controles A.5.2 a A.5.5 se actualizarán al iniciar su próxima revisión.' }
    }
  }
  return {}
}

// ── Expediente documental (B11a) ─────────────────────────────────────────────
// Rechazar devuelve el expediente a borrador, como «Volver a borrador».

async function aplicarADocumento(params: EfectoParams): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const { data: d } = await admin
    .from('documents')
    .select('id, organization_id, ai_system_id, template_key, version, status')
    .eq('id', params.objectId)
    .maybeSingle()
  if (!d) return { aviso: 'La decisión quedó registrada, pero el expediente ya no existe.' }

  const aprobado = params.outcome === 'approved'
  const { error } = await admin
    .from('documents')
    .update(aprobado
      ? { status: 'approved', approved_by: params.actorProfileId ?? null, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: 'draft', approved_by: null, approved_at: null, updated_at: new Date().toISOString() })
    .eq('id', d.id)
  if (error) return aviso('el expediente no se pudo actualizar', error)

  if (d.ai_system_id) {
    const label = templateMeta(d.template_key).label
    await insertAiSystemHistoryEvents(admin, [{
      ai_system_id: d.ai_system_id,
      organization_id: d.organization_id,
      event_type: aprobado ? 'document_approved' : 'document_returned',
      event_title: aprobado ? 'Expediente aprobado' : 'Expediente devuelto a borrador',
      event_summary: `${label} · versión ${d.version ?? 1}: ${aprobado ? 'aprobado' : 'rechazado y devuelto a borrador'} en Flujos de aprobación.`
        + (!aprobado && params.reason ? ` Motivo: ${params.reason}` : ''),
      actor_user_id: params.actorUserId ?? null,
      payload: { document_id: d.id, template_key: d.template_key, approval_request_id: params.requestId },
    }])
  }
  return {}
}

// ── Declaración de Aplicabilidad (B11a) ──────────────────────────────────────
// `objectId` es el id de la organización: hay una Declaración por organización.

async function aplicarADeclaracion(params: EfectoParams): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const orgId = params.objectId

  const { data: meta } = await admin
    .from('organization_soa_metadata')
    .select('lifecycle_status')
    .eq('organization_id', orgId)
    .maybeSingle()

  const aprobada = params.outcome === 'approved'
  let approvedBy: string | null = null
  if (aprobada && params.actorProfileId) {
    const { data: prof } = await admin
      .from('profiles').select('display_name, full_name').eq('id', params.actorProfileId).maybeSingle()
    approvedBy = (prof?.display_name || prof?.full_name || '').trim() || null
  }

  const { error } = await admin
    .from('organization_soa_metadata')
    .upsert(
      {
        organization_id: orgId,
        lifecycle_status: aprobada ? 'approved' : 'draft',
        ...(aprobada
          ? { approved_at: new Date().toISOString().split('T')[0], approved_by: approvedBy ?? refActa(params.requestId) }
          : {}),
      },
      { onConflict: 'organization_id', ignoreDuplicates: false },
    )
  if (error) return aviso('la Declaración no se pudo actualizar', error)

  const { error: logError } = await admin.from('soa_lifecycle_log').insert({
    organization_id: orgId,
    actor_user_id: params.actorProfileId ?? null,
    from_status: (meta?.lifecycle_status as string | null) ?? null,
    to_status: aprobada ? 'approved' : 'draft',
  })
  if (logError) console.error('[approvals/effects] historial de la Declaración:', logError)

  // Al volver a borrador se aplican las AISIA aprobadas mientras estaba en revisión (B08).
  if (!aprobada) await syncAisiaSoaControls(admin, orgId)
  return {}
}

// ── Evidencias (B11a) ────────────────────────────────────────────────────────

async function aplicarAEvidencia(params: EfectoParams): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const { data: e } = await admin
    .from('system_evidences')
    .select('id, organization_id, ai_system_id, title, status')
    .eq('id', params.objectId)
    .maybeSingle()
  if (!e) return { aviso: 'La decisión quedó registrada, pero la evidencia ya no existe.' }

  const aprobada = params.outcome === 'approved'
  const { error } = await admin
    .from('system_evidences')
    .update({
      status: aprobada ? 'valid' : 'rejected',
      reviewed_by: params.actorUserId ?? null,
      reviewed_at: new Date().toISOString(),
      validation_notes: params.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', e.id)
  if (error) return aviso('la evidencia no se pudo actualizar', error)

  if (e.ai_system_id) {
    await insertAiSystemHistoryEvents(admin, [{
      ai_system_id: e.ai_system_id,
      organization_id: e.organization_id,
      event_type: aprobada ? 'evidence_approved' : 'evidence_rejected',
      event_title: aprobada ? 'Evidencia aprobada' : 'Evidencia rechazada',
      event_summary: `Evidencia "${e.title}" — ${aprobada ? 'aprobada' : 'rechazada'} en Flujos de aprobación.`
        + (!aprobada && params.reason ? ` Notas: ${params.reason}` : ''),
      actor_user_id: params.actorUserId ?? null,
      payload: { evidence_id: e.id, approval_request_id: params.requestId, notes: params.reason ?? null },
    }])
  }
  return {}
}

// ── Exclusión de brechas (B11d, DP-07) ───────────────────────────────────────
// Aprobada, la brecha sale de la cola. Rechazada, la exclusión se borra y la
// brecha sigue en la cola; la solicitud y su motivo quedan en el histórico.

async function aplicarAExclusion(params: EfectoParams): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const consulta = admin.from('gap_dispositions')
  const { error } = params.outcome === 'approved'
    ? await consulta.update({ status: 'active' }).eq('id', params.objectId).eq('status', 'pending')
    : await consulta.delete().eq('id', params.objectId).eq('status', 'pending')
  if (error) return aviso('la exclusión de la brecha no se pudo actualizar', error)
  return {}
}

async function aplicarAPlan(params: {
  objectId:  string
  requestId: string
  outcome:   'approved' | 'rejected'
  reason?:   string | null
  actorUserId?: string | null
}): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()

  if (params.outcome === 'approved') {
    // `approval_minutes_ref` era un campo de texto donde alguien escribía la
    // referencia de un acta que no tenía por qué existir. Ahora apunta a la
    // solicitud real, que sí tiene votos, fechas y nombres detrás.
    //
    // Sigue siendo obligatorio en nivel 3 por el CHECK chk_approval_coherence
    // de la línea base, y eso está bien: lo que cambia es que ya no se teclea.
    const { error } = await admin
      .from('treatment_plans')
      .update({
        status:               'approved',
        approved_at:          new Date().toISOString(),
        approval_minutes_ref: `APR-${params.requestId.slice(0, 8)}`,
      })
      .eq('id', params.objectId)

    if (error) {
      console.error('[approvals/effects] plan aprobado sin poder actualizarse:', error)
      return { aviso: 'La aprobación quedó registrada, pero el plan no se pudo actualizar: ' + error.message }
    }

    // Ciclo único (B07): lo mismo que en la vía del aprobador asignado.
    // El aprobador de la evaluación es quien emitió la decisión final.
    return applyRiskEvaluationApproval({
      planId:         params.objectId,
      approverUserId: params.actorUserId ?? null,
    })
  }

  // Rechazo: mismo destino que la vía antigua — vuelve al autor, no se queda
  // colgado en revisión. El motivo se antepone marcado, como ya hacía
  // rejectTreatmentPlanAction.
  const { error } = await admin
    .from('treatment_plans')
    .update({
      status:                   'draft',
      approved_at:              null,
      approval_committee_notes: `[DEVUELTO] ${params.reason ?? 'Sin motivo registrado'}`,
    })
    .eq('id', params.objectId)

  if (error) {
    console.error('[approvals/effects] plan rechazado sin poder actualizarse:', error)
    return { aviso: 'El rechazo quedó registrado, pero el plan no se pudo devolver: ' + error.message }
  }
  return {}
}

// ── Cancelación y caducidad (B11c) ───────────────────────────────────────────
// Una solicitud cancelada o caducada devuelve el objeto a borrador: sin
// decisión, no puede quedarse «en aprobación» esperando a nadie. Solo se usa
// cuando la cancelación viene de Aprobaciones o de la caducidad; si la retira el
// propio dominio (volver a borrador), el dominio ya ha cambiado su estado.

export async function applyApprovalCancellation(params: {
  objectType: ApprovalObjectType
  objectId:   string
  reason:     string
  actorUserId?: string | null
}): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient()
  const nota = `[CANCELADA] ${params.reason}`

  switch (params.objectType) {
    case 'treatment_plan': {
      const { data: p } = await admin.from('treatment_plans')
        .select('id, organization_id, system_id, code, status').eq('id', params.objectId).maybeSingle()
      if (!p || p.status !== 'in_review') return {}
      const { error } = await admin.from('treatment_plans')
        .update({ status: 'draft', approved_at: null, approval_committee_notes: nota }).eq('id', p.id)
      if (error) return aviso('el plan no se pudo devolver a borrador', error)
      await historial(p.system_id, p.organization_id, 'treatment_plan_cancelled', 'Aprobación del plan cancelada',
        `La solicitud de aprobación del plan ${p.code} se canceló y el plan vuelve a borrador. Motivo: ${params.reason}`,
        params.actorUserId, { treatment_plan_id: p.id })
      return {}
    }
    case 'aisia_assessment': {
      const { data: a } = await admin.from('aisia_assessments')
        .select('id, organization_id, ai_system_id, version, status').eq('id', params.objectId).maybeSingle()
      if (!a || a.status !== 'submitted') return {}
      const { error } = await admin.from('aisia_assessments')
        .update({ status: 'draft', submitted_at: null, submitted_by: null }).eq('id', a.id)
      if (error) return aviso('la AISIA no se pudo devolver a borrador', error)
      await historial(a.ai_system_id, a.organization_id, 'aisia_cancelled', 'Aprobación de la AISIA cancelada',
        `La solicitud de aprobación de la AISIA v${a.version} se canceló y vuelve a borrador. Motivo: ${params.reason}`,
        params.actorUserId, { assessment_id: a.id })
      return {}
    }
    case 'document': {
      const { data: d } = await admin.from('documents')
        .select('id, organization_id, ai_system_id, template_key, version, status').eq('id', params.objectId).maybeSingle()
      if (!d || d.status !== 'in_review') return {}
      const { error } = await admin.from('documents')
        .update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', d.id)
      if (error) return aviso('el expediente no se pudo devolver a borrador', error)
      if (d.ai_system_id) {
        await historial(d.ai_system_id, d.organization_id, 'document_returned', 'Expediente devuelto a borrador',
          `${templateMeta(d.template_key).label} · versión ${d.version ?? 1}: la solicitud de aprobación se canceló. Motivo: ${params.reason}`,
          params.actorUserId, { document_id: d.id })
      }
      return {}
    }
    case 'soa': {
      const { data: meta } = await admin.from('organization_soa_metadata')
        .select('lifecycle_status').eq('organization_id', params.objectId).maybeSingle()
      if (meta?.lifecycle_status !== 'under_review') return {}
      const { error } = await admin.from('organization_soa_metadata')
        .update({ lifecycle_status: 'draft' }).eq('organization_id', params.objectId)
      if (error) return aviso('la Declaración no se pudo devolver a borrador', error)
      await admin.from('soa_lifecycle_log').insert({
        organization_id: params.objectId, actor_user_id: null, from_status: 'under_review', to_status: 'draft',
      })
      await syncAisiaSoaControls(admin, params.objectId)
      return {}
    }
    case 'evidence': {
      const { data: e } = await admin.from('system_evidences')
        .select('id, organization_id, ai_system_id, title, status').eq('id', params.objectId).maybeSingle()
      if (!e || e.status !== 'pending_review') return {}
      const { error } = await admin.from('system_evidences')
        .update({ status: 'draft', updated_at: new Date().toISOString() }).eq('id', e.id)
      if (error) return aviso('la evidencia no se pudo devolver a borrador', error)
      if (e.ai_system_id) {
        await historial(e.ai_system_id, e.organization_id, 'evidence_review_cancelled', 'Revisión de evidencia cancelada',
          `Evidencia "${e.title}": la solicitud de aprobación se canceló y vuelve a borrador. Motivo: ${params.reason}`,
          params.actorUserId, { evidence_id: e.id })
      }
      return {}
    }
    case 'gap_disposition': {
      const { error } = await admin.from('gap_dispositions')
        .delete().eq('id', params.objectId).eq('status', 'pending')
      if (error) return aviso('la exclusión de la brecha no se pudo retirar', error)
      return {}
    }
    default:
      return {}
  }
}

async function historial(
  aiSystemId: string | null,
  organizationId: string,
  type: string,
  title: string,
  summary: string,
  actorUserId: string | null | undefined,
  payload: Record<string, unknown>,
) {
  if (!aiSystemId) return
  await insertAiSystemHistoryEvents(createNoCacheAdminClient(), [{
    ai_system_id: aiSystemId,
    organization_id: organizationId,
    event_type: type,
    event_title: title,
    event_summary: summary,
    actor_user_id: actorUserId ?? null,
    payload,
  }])
}
