import 'server-only'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { AIACT_RULES_VERSION } from '@/lib/ai-act/types'
import { applicabilityFacts, documentApplicability } from '@/lib/documents/applicability'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import {
  ANNUAL_REVIEW_TEMPLATES,
  DOCUMENT_REVIEW_MONTHS,
  REEVALUATION_KEY_LABEL,
  REEVALUATION_SCOPE_LABEL,
  REEVALUATION_TYPE,
  pendingScope,
  reevaluationScope,
  type ReevaluationFacts,
  type ReevaluationKey,
  type ReevaluationScope,
} from './reevaluation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/** Disparadores de reevaluación (B21a): carga, registro, resolución y detección periódica. */

export type OpenTriggerRow = {
  id: string
  systemId: string
  key: ReevaluationKey
  scope: ReevaluationScope[]
  sourceRef: string | null
  description: string | null
  detectedAt: string
  taskId: string | null
}

const SISTEMA = 'id, name, aiact_result, aiact_risk_level, aiact_inputs, aiact_rules_version, aiact_review_pending, value_chain_roles, is_gpai, manages_critical_infra, processes_personal_data'

type SistemaRow = Record<string, unknown> & {
  id: string
  name: string
  aiact_result: unknown
  aiact_rules_version: string | null
  aiact_review_pending: boolean | null
}

const ultima = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

/** Lo aprobado de cada sistema que puede resolver un disparador. */
export async function loadReevaluationFacts(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, ReevaluationFacts & { friaApplies: boolean }>> {
  const out = new Map<string, ReevaluationFacts & { friaApplies: boolean }>()
  if (systemIds.length === 0) return out
  const [{ data: sistemas }, { data: evaluaciones }, { data: documentos }] = await Promise.all([
    fluxion.from('ai_systems').select(SISTEMA).eq('organization_id', organizationId).in('id', systemIds),
    fluxion.from('fmea_evaluations').select('system_id, approved_at').eq('organization_id', organizationId)
      .in('system_id', systemIds).not('approved_at', 'is', null),
    fluxion.from('documents').select('ai_system_id, template_key, approved_at').eq('organization_id', organizationId)
      .in('ai_system_id', systemIds).in('template_key', ['fria', 'aisia']).not('approved_at', 'is', null),
  ])
  for (const s of (sistemas ?? []) as SistemaRow[]) {
    out.set(s.id, {
      fmeaApprovedAt: null,
      friaApprovedAt: null,
      aisiaApprovedAt: null,
      classificationCurrent: s.aiact_review_pending !== true && (!s.aiact_result || s.aiact_rules_version === AIACT_RULES_VERSION),
      friaApplies: documentApplicability('fria', applicabilityFacts(s)).mode === 'redactar',
    })
  }
  for (const e of (evaluaciones ?? []) as Array<{ system_id: string; approved_at: string }>) {
    const f = out.get(e.system_id)
    if (f) f.fmeaApprovedAt = ultima(f.fmeaApprovedAt, e.approved_at)
  }
  for (const d of (documentos ?? []) as Array<{ ai_system_id: string; template_key: string; approved_at: string }>) {
    const f = out.get(d.ai_system_id)
    if (!f) continue
    if (d.template_key === 'fria') f.friaApprovedAt = ultima(f.friaApprovedAt, d.approved_at)
    else f.aisiaApprovedAt = ultima(f.aisiaApprovedAt, d.approved_at)
  }
  return out
}

/** Disparadores abiertos de los sistemas (o de toda la organización). */
export async function loadOpenTriggers(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds?: readonly string[],
): Promise<Map<string, OpenTriggerRow[]>> {
  let q = fluxion
    .from('reevaluation_triggers')
    .select('id, system_id, trigger_key, scope, source_ref, description, detected_at, task_id')
    .eq('organization_id', organizationId)
    .eq('state', 'detectado')
    .not('trigger_key', 'is', null)
    .order('detected_at')
  if (systemIds) {
    if (systemIds.length === 0) return new Map()
    q = q.in('system_id', systemIds)
  }
  const { data } = await q
  const out = new Map<string, OpenTriggerRow[]>()
  for (const r of (data ?? []) as Array<{
    id: string; system_id: string; trigger_key: ReevaluationKey; scope: ReevaluationScope[]; source_ref: string | null
    description: string | null; detected_at: string; task_id: string | null
  }>) {
    const row: OpenTriggerRow = {
      id: r.id, systemId: r.system_id, key: r.trigger_key, scope: r.scope ?? [], sourceRef: r.source_ref,
      description: r.description, detectedAt: r.detected_at, taskId: r.task_id,
    }
    ;(out.get(r.system_id) ?? out.set(r.system_id, []).get(r.system_id)!).push(row)
  }
  return out
}

/**
 * Registra un disparador para un sistema (service role, tras comprobar el
 * permiso de quien lo provoca). Calcula qué hay que reevaluar y deja rastro en
 * el historial del sistema. No falla la operación que lo provoca: si algo va
 * mal, lo registra en consola. Devuelve si ha abierto un disparador nuevo.
 */
export async function registerReevaluation(params: {
  organizationId: string
  systemId: string
  key: ReevaluationKey
  sourceRef: string | null
  detail: string
  actorUserId?: string | null
}): Promise<boolean> {
  const admin = createAdminFluxionClient()
  const facts = (await loadReevaluationFacts(admin, params.organizationId, [params.systemId])).get(params.systemId)
  if (!facts) return false
  const scope = reevaluationScope(params.key, {
    friaApplies: facts.friaApplies,
    friaApproved: Boolean(facts.friaApprovedAt),
    aisiaApproved: Boolean(facts.aisiaApprovedAt),
  })
  const description = `${REEVALUATION_KEY_LABEL[params.key]}: ${params.detail} Reevaluar: ${scope.map((s) => REEVALUATION_SCOPE_LABEL[s]).join(', ')}.`

  const { data: abierto } = await admin
    .from('reevaluation_triggers')
    .select('id')
    .eq('system_id', params.systemId)
    .eq('trigger_key', params.key)
    .eq('state', 'detectado')
    .filter('source_ref', params.sourceRef === null ? 'is' : 'eq', params.sourceRef === null ? null : params.sourceRef)
    .maybeSingle()
  if (abierto) return false

  const { error } = await admin.rpc('reevaluation_register', {
    p_org: params.organizationId,
    p_system: params.systemId,
    p_type: REEVALUATION_TYPE[params.key],
    p_key: params.key,
    p_scope: scope,
    p_source_ref: params.sourceRef,
    p_description: description,
  })
  if (error) {
    console.error('[reevaluation] registrar:', error)
    return false
  }
  await insertAiSystemHistoryEvents(admin, [{
    ai_system_id: params.systemId,
    organization_id: params.organizationId,
    event_type: 'reevaluation_triggered',
    event_title: 'Reevaluación necesaria',
    event_summary: description,
    payload: { trigger_key: params.key, scope, source_ref: params.sourceRef },
    actor_user_id: params.actorUserId ?? null,
  }])
  return true
}

/**
 * Cierra los disparadores cuyo alcance ya está aprobado y, si un sistema se
 * queda sin disparadores abiertos, completa su tarea «Reevaluar sistema».
 * Devuelve cuántos disparadores ha cerrado.
 */
export async function syncReevaluations(organizationId: string, systemIds?: readonly string[]): Promise<number> {
  const admin = createAdminFluxionClient()
  const abiertos = await loadOpenTriggers(admin, organizationId, systemIds)
  if (abiertos.size === 0) return 0
  const facts = await loadReevaluationFacts(admin, organizationId, Array.from(abiertos.keys()))

  let cerrados = 0
  for (const [systemId, triggers] of Array.from(abiertos.entries())) {
    const f = facts.get(systemId)
    if (!f) continue
    const resueltos = triggers.filter((t) => pendingScope(t, f).length === 0)
    if (resueltos.length === 0) continue

    const ahora = new Date().toISOString()
    for (const t of resueltos) {
      await admin.from('reevaluation_triggers')
        .update({
          state: 'resuelto',
          resolved_at: ahora,
          resolution: `Aprobado después del disparador: ${t.scope.map((s) => REEVALUATION_SCOPE_LABEL[s]).join(', ')}.`,
        })
        .eq('id', t.id)
        .eq('state', 'detectado')
      cerrados++
    }
    await insertAiSystemHistoryEvents(admin, resueltos.map((t) => ({
      ai_system_id: systemId,
      organization_id: organizationId,
      event_type: 'reevaluation_resolved',
      event_title: 'Reevaluación completada',
      event_summary: `${REEVALUATION_KEY_LABEL[t.key]}: aprobado ${t.scope.map((s) => REEVALUATION_SCOPE_LABEL[s]).join(', ')}.`,
      payload: { trigger_id: t.id, trigger_key: t.key },
    })))

    if (resueltos.length === triggers.length) await closeReevaluationTask(admin, organizationId, systemId)
  }
  return cerrados
}

/** Completa la tarea «Reevaluar sistema» abierta del sistema. */
export async function closeReevaluationTask(admin: FluxionClient, organizationId: string, systemId: string) {
  await admin.from('tasks')
    .update({ status: 'done' })
    .eq('organization_id', organizationId)
    .eq('source_type', 'reevaluation')
    .eq('source_id', systemId)
    .not('status', 'in', '(done,cancelled)')
}

/**
 * Detección periódica (cron diario): revisión del FMEA vencida, reglas de
 * clasificación actualizadas y revisión anual de la FRIA y la AISIA (B21b).
 * Devuelve las organizaciones afectadas.
 */
export async function detectPeriodicReevaluations(): Promise<{ registered: number; organizations: string[] }> {
  const admin = createAdminFluxionClient()
  const hoy = new Date().toISOString().slice(0, 10)
  let registered = 0
  const orgs = new Set<string>()

  const { data: vencidas } = await admin
    .from('fmea_evaluations')
    .select('id, organization_id, system_id, version, next_review_at')
    .eq('state', 'approved')
    .not('next_review_at', 'is', null)
    .lt('next_review_at', hoy)
  for (const e of (vencidas ?? []) as Array<{ id: string; organization_id: string; system_id: string; version: number; next_review_at: string }>) {
    const nuevo = await registerReevaluation({
      organizationId: e.organization_id,
      systemId: e.system_id,
      key: 'revision_fmea',
      sourceRef: e.id,
      detail: `la revisión de la evaluación de riesgos v${e.version} venció el ${new Date(e.next_review_at).toLocaleDateString('es-ES')}.`,
    })
    if (nuevo) registered++
    orgs.add(e.organization_id)
  }

  const { data: desfasados } = await admin
    .from('ai_systems')
    .select('id, organization_id, aiact_rules_version')
    .not('aiact_result', 'is', null)
    .or(`aiact_rules_version.is.null,aiact_rules_version.neq.${AIACT_RULES_VERSION}`)
  for (const s of (desfasados ?? []) as Array<{ id: string; organization_id: string; aiact_rules_version: string | null }>) {
    const nuevo = await registerReevaluation({
      organizationId: s.organization_id,
      systemId: s.id,
      key: 'catalogo',
      sourceRef: AIACT_RULES_VERSION,
      detail: `la clasificación usa las reglas ${s.aiact_rules_version ?? 'anteriores'} y las vigentes son ${AIACT_RULES_VERSION}.`,
    })
    if (nuevo) registered++
    orgs.add(s.organization_id)
  }
  // B21b: FRIA y AISIA vigentes aprobadas hace más de 12 meses.
  const limite = new Date()
  limite.setUTCMonth(limite.getUTCMonth() - DOCUMENT_REVIEW_MONTHS)
  const { data: documentos } = await admin
    .from('documents')
    .select('id, organization_id, ai_system_id, template_key, version, approved_at')
    .eq('status', 'approved')
    .in('template_key', [...ANNUAL_REVIEW_TEMPLATES])
    .not('ai_system_id', 'is', null)
    .lt('approved_at', limite.toISOString())
  for (const d of (documentos ?? []) as Array<{ id: string; organization_id: string; ai_system_id: string; template_key: 'fria' | 'aisia'; version: number; approved_at: string }>) {
    const nuevo = await registerReevaluation({
      organizationId: d.organization_id,
      systemId: d.ai_system_id,
      key: d.template_key === 'fria' ? 'revision_fria' : 'revision_aisia',
      sourceRef: d.id,
      detail: `la ${d.template_key === 'fria' ? 'FRIA' : 'AISIA'} v${d.version} se aprobó el ${new Date(d.approved_at).toLocaleDateString('es-ES')} y toca revisarla cada ${DOCUMENT_REVIEW_MONTHS} meses.`,
    })
    if (nuevo) registered++
    orgs.add(d.organization_id)
  }

  return { registered, organizations: Array.from(orgs) }
}
