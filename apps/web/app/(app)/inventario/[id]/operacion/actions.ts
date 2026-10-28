'use server'

import { revalidatePath } from 'next/cache'

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history'
import { logAuditEvent } from '@/lib/audit'
import { hasAnyRole } from '@/lib/auth/roles'
import { deploymentPlanApplies } from '@/lib/evaluation-status/deployment'
import { loadEvidenceCatalogTypes } from '@/lib/evidences/catalog-type-server'
import {
  CHECK_KIND_LABEL,
  CHECK_RESULT_LABEL,
  DATA_CONTROL_LABEL,
  addMonths,
  monitoringDataSummary,
  normalizeIndicators,
  type CheckKind,
  type CheckResult,
  type DataControl,
  type Indicator,
} from '@/lib/governance/operation'
import {
  completeOperationTask,
  loadMonitoringPeriodData,
  loadOperationRecords,
  operationStatuses,
  type OperationStatuses,
} from '@/lib/governance/operation-server'
import { generateHitlReportEvidence } from '@/lib/hitl/report-server'
import { createAdminFluxionClient, createFluxionClient, createTelemetryClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

/**
 * Datos de entrada y vigilancia del funcionamiento del sistema (B28, DP-12;
 * AI Act, Art. 26.4 y 26.5). Los declaran y verifican el Administrador, el
 * Responsable del SGAI y el Responsable del sistema, como el registro de logs.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const
const CONTROLES = Object.keys(DATA_CONTROL_LABEL) as DataControl[]
const RESULTADOS = Object.keys(CHECK_RESULT_LABEL) as CheckResult[]
const hoy = () => new Date().toISOString().slice(0, 10)

async function ctx() {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, user_id, organization_id, full_name, email, role, roles')
    .eq('user_id', user.id)
    .single()
  return profile ? { fluxion, profile, userId: user.id } : null
}

type Ctx = NonNullable<Awaited<ReturnType<typeof ctx>>>

async function sistemaDe(c: Ctx, systemId: string) {
  const { data } = await c.fluxion
    .from('ai_systems').select('id, name, aiact_risk_level, value_chain_roles')
    .eq('id', systemId).eq('organization_id', c.profile.organization_id).maybeSingle()
  return data as { id: string; name: string; aiact_risk_level: string | null; value_chain_roles: string[] | null } | null
}

function auditar(c: Ctx, action: 'system.input_data_updated' | 'system.monitoring_plan_updated' | 'system.operation_check_recorded', systemId: string, label: string, metadata?: Record<string, unknown>) {
  void logAuditEvent({
    organization_id: c.profile.organization_id,
    actor_id: c.profile.id,
    actor_name: c.profile.full_name ?? undefined,
    actor_email: c.profile.email ?? undefined,
    action,
    target_type: 'organization',
    target_id: systemId,
    target_label: label,
    metadata,
  })
}

export type OperationCheckRow = {
  id: string
  kind: CheckKind
  periodStart: string | null
  checkedAt: string
  result: CheckResult
  summary: string
  dataSummary: string | null
  actions: string | null
  createdByName: string | null
  evidences: Array<{ id: string; title: string; status: string }>
}

export type SystemOperation = {
  systemName: string
  organizationId: string
  canEdit: boolean
  /** Alto riesgo con la organización como responsable del despliegue: obligatorio (Art. 26). */
  applies: boolean
  inputData: { controlledBy: DataControl; expectedData: string; sources: string; controls: string; verifyMonths: number; notes: string } | null
  monitoring: { indicators: Indicator[]; reviewMonths: number; ownerProfileId: string | null; notes: string } | null
  status: OperationStatuses
  checks: OperationCheckRow[]
  evidences: Array<{ id: string; title: string; status: string }>
  members: Array<{ id: string; name: string }>
}

export async function getSystemOperation(systemId: string): Promise<SystemOperation | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  const orgId = c.profile.organization_id as string
  const sistema = await sistemaDe(c, systemId)
  if (!sistema) return { error: 'Sistema no encontrado.' }

  const [registros, { data: checks }, { data: evidencias }, { data: miembros }] = await Promise.all([
    loadOperationRecords(c.fluxion, orgId, [systemId]),
    c.fluxion.from('system_operation_checks')
      .select('id, kind, period_start, checked_at, result, summary, data_summary, actions, created_at, creator:created_by(full_name), system_operation_check_evidences(system_evidences(id, title, status))')
      .eq('organization_id', orgId).eq('ai_system_id', systemId)
      .order('checked_at', { ascending: false }).order('created_at', { ascending: false }),
    c.fluxion.from('system_evidences')
      .select('id, title, status')
      .eq('organization_id', orgId)
      .or(`ai_system_id.eq.${systemId},scope.eq.organization`)
      .order('created_at', { ascending: false }),
    c.fluxion.from('profiles').select('id, full_name, display_name').eq('organization_id', orgId).order('full_name'),
  ])
  const r = registros.get(systemId)!

  type Ev = { id: string; title: string; status: string }
  return {
    systemName: sistema.name,
    organizationId: orgId,
    canEdit: hasAnyRole(c.profile, EDIT_ROLES),
    applies: deploymentPlanApplies(sistema.aiact_risk_level ?? null, sistema.value_chain_roles ?? []),
    inputData: r.inputData
      ? {
          controlledBy: r.inputData.controlledBy,
          expectedData: r.inputData.expectedData ?? '',
          sources: r.inputData.sources ?? '',
          controls: r.inputData.controls ?? '',
          verifyMonths: r.inputData.verifyMonths,
          notes: r.inputData.notes ?? '',
        }
      : null,
    monitoring: r.monitoring
      ? { indicators: r.monitoring.indicators, reviewMonths: r.monitoring.reviewMonths, ownerProfileId: r.monitoring.ownerProfileId, notes: r.monitoring.notes ?? '' }
      : null,
    status: operationStatuses(r, hoy()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checks: ((checks ?? []) as any[]).map((k) => ({
      id: k.id,
      kind: k.kind,
      periodStart: k.period_start,
      checkedAt: k.checked_at,
      result: k.result,
      summary: k.summary,
      dataSummary: k.data_summary,
      actions: k.actions,
      createdByName: (Array.isArray(k.creator) ? k.creator[0] : k.creator)?.full_name ?? null,
      evidences: ((k.system_operation_check_evidences ?? []) as Array<{ system_evidences: Ev | Ev[] | null }>)
        .map((x) => (Array.isArray(x.system_evidences) ? x.system_evidences[0] : x.system_evidences))
        .filter((e): e is Ev => Boolean(e)),
    })),
    evidences: (evidencias ?? []) as Ev[],
    members: ((miembros ?? []) as Array<{ id: string; full_name: string | null; display_name: string | null }>)
      .map((m) => ({ id: m.id, name: m.display_name || m.full_name || 'Usuario' })),
  }
}

export async function saveInputData(input: {
  systemId: string
  controlledBy: DataControl
  expectedData: string
  sources: string
  controls: string
  verifyMonths: number
  notes: string
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  if (!hasAnyRole(c.profile, EDIT_ROLES)) return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema declaran los datos de entrada.' }
  if (!CONTROLES.includes(input.controlledBy)) return { error: 'Indica quién controla los datos de entrada.' }
  if (!input.expectedData.trim()) return { error: 'Describe qué datos espera el sistema.' }
  if (!Number.isInteger(input.verifyMonths) || input.verifyMonths < 1 || input.verifyMonths > 36) return { error: 'La frecuencia de verificación va de 1 a 36 meses.' }
  const sistema = await sistemaDe(c, input.systemId)
  if (!sistema) return { error: 'Sistema no encontrado.' }

  const { error } = await c.fluxion.from('system_input_data').upsert({
    ai_system_id: input.systemId,
    organization_id: c.profile.organization_id,
    controlled_by: input.controlledBy,
    expected_data: input.expectedData.trim(),
    sources: input.sources.trim() || null,
    controls: input.controls.trim() || null,
    verify_months: input.verifyMonths,
    notes: input.notes.trim() || null,
    updated_by: c.profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'ai_system_id' })
  if (error) return { error: 'No se pudieron guardar los datos de entrada: ' + error.message }

  await insertAiSystemHistoryEvents(c.fluxion, [{
    ai_system_id: input.systemId,
    organization_id: c.profile.organization_id,
    event_type: 'input_data_updated',
    event_title: 'Datos de entrada actualizados',
    event_summary: `Los controla: ${DATA_CONTROL_LABEL[input.controlledBy].toLowerCase()}. Verificación cada ${input.verifyMonths} meses.`,
    payload: { controlled_by: input.controlledBy, verify_months: input.verifyMonths },
    actor_user_id: c.userId,
  }])
  auditar(c, 'system.input_data_updated', input.systemId, sistema.name, { controlled_by: input.controlledBy, verify_months: input.verifyMonths })
  revalidatePath(`/inventario/${input.systemId}`)
  return { ok: true }
}

export async function saveMonitoringPlan(input: {
  systemId: string
  indicators: Indicator[]
  reviewMonths: number
  ownerProfileId: string | null
  notes: string
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  if (!hasAnyRole(c.profile, EDIT_ROLES)) return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema definen el plan de vigilancia.' }
  const indicadores = normalizeIndicators(input.indicators)
  if (indicadores.length === 0) return { error: 'Añade al menos un indicador.' }
  if (!Number.isInteger(input.reviewMonths) || input.reviewMonths < 1 || input.reviewMonths > 24) return { error: 'La frecuencia de revisión va de 1 a 24 meses.' }
  const sistema = await sistemaDe(c, input.systemId)
  if (!sistema) return { error: 'Sistema no encontrado.' }
  if (input.ownerProfileId) {
    const { data: m } = await c.fluxion.from('profiles').select('id').eq('id', input.ownerProfileId).eq('organization_id', c.profile.organization_id).maybeSingle()
    if (!m) return { error: 'El responsable no es miembro de la organización.' }
  }

  const { error } = await c.fluxion.from('system_monitoring_plan').upsert({
    ai_system_id: input.systemId,
    organization_id: c.profile.organization_id,
    indicators: indicadores,
    review_months: input.reviewMonths,
    owner_profile_id: input.ownerProfileId || null,
    notes: input.notes.trim() || null,
    updated_by: c.profile.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'ai_system_id' })
  if (error) return { error: 'No se pudo guardar el plan de vigilancia: ' + error.message }

  await insertAiSystemHistoryEvents(c.fluxion, [{
    ai_system_id: input.systemId,
    organization_id: c.profile.organization_id,
    event_type: 'monitoring_plan_updated',
    event_title: 'Plan de vigilancia actualizado',
    event_summary: `${indicadores.length} indicadores. Revisión cada ${input.reviewMonths} meses.`,
    payload: { indicators: indicadores.length, review_months: input.reviewMonths },
    actor_user_id: c.userId,
  }])
  auditar(c, 'system.monitoring_plan_updated', input.systemId, sistema.name, { indicators: indicadores.length, review_months: input.reviewMonths })
  revalidatePath(`/inventario/${input.systemId}`)
  return { ok: true }
}

/** Datos de la aplicación del periodo, para la revisión del funcionamiento. */
export async function previewMonitoringData(systemId: string, from: string, to: string): Promise<{ summary: string } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  if (!from || !to || from > to) return { error: 'Indica un periodo válido.' }
  if (!(await sistemaDe(c, systemId))) return { error: 'Sistema no encontrado.' }
  const datos = await loadMonitoringPeriodData(c.fluxion, createTelemetryClient(), c.profile.organization_id, systemId, from, to)
  return { summary: monitoringDataSummary(datos) }
}

/**
 * Registra una evidencia de la verificación (informe de calidad o perfilado,
 * muestra anonimizada o registro de monitorización). Nace en borrador, como
 * toda evidencia (B10); el fichero se sube después con `uploadEvidenceFile`.
 */
export async function createOperationEvidence(input: {
  systemId: string
  kind: CheckKind
  /** Solo en los datos de entrada: informe de calidad o perfilado, o muestra anonimizada. */
  evidenceKind: 'informe' | 'muestra' | 'monitorizacion'
  title: string
  externalUrl?: string | null
  hasPendingFile?: boolean
}): Promise<{ id: string } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  if (!hasAnyRole(c.profile, EDIT_ROLES)) return { error: 'No tienes permisos para registrar verificaciones.' }
  if (!input.title.trim()) return { error: 'Indica el título de la evidencia.' }
  const url = input.externalUrl?.trim() || ''
  if (url) { try { new URL(url) } catch { return { error: 'La URL no es válida.' } } }
  if (!url && !input.hasPendingFile) return { error: 'Adjunta un fichero o indica la URL.' }
  const sistema = await sistemaDe(c, input.systemId)
  if (!sistema) return { error: 'Sistema no encontrado.' }

  const datos = input.kind === 'input_data'
  const codigo = datos ? 'EVT-TEC-06' : 'EVT-TEC-04'
  const tipo = (await loadEvidenceCatalogTypes()).find((t) => t.code === codigo)?.id ?? null
  const tags = datos
    ? ['datos-entrada', input.evidenceKind === 'muestra' ? 'muestra-anonimizada' : 'informe-calidad-datos']
    : ['vigilancia-funcionamiento']
  const descripcion = datos
    ? input.evidenceKind === 'muestra'
      ? 'Muestra anonimizada de los datos de entrada (AI Act, Art. 26.4).'
      : 'Informe de calidad o perfilado de los datos de entrada (AI Act, Art. 26.4).'
    : 'Registro de monitorización del funcionamiento (AI Act, Art. 26.5).'

  const { data, error } = await c.fluxion.from('system_evidences').insert({
    organization_id: c.profile.organization_id,
    ai_system_id: input.systemId,
    scope: 'system',
    title: input.title.trim().slice(0, 300),
    description: descripcion,
    evidence_type: datos ? 'test_result' : 'monitoring_log',
    external_url: url || null,
    // Toda evidencia nace en borrador y se valida con la revisión (B10).
    status: 'draft',
    owner_user_id: c.userId,
    tags,
    evidence_type_id: tipo,
  }).select('id').single()
  if (error || !data) return { error: 'No se pudo registrar la evidencia: ' + (error?.message ?? '') }
  return { id: String(data.id) }
}

export async function addOperationCheck(input: {
  systemId: string
  kind: CheckKind
  periodStart: string | null
  checkedAt: string
  result: CheckResult
  summary: string
  actions: string
  evidenceIds: string[]
}): Promise<{ ok: true; aviso?: string } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  if (!hasAnyRole(c.profile, EDIT_ROLES)) return { error: 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema registran verificaciones.' }
  if (!['input_data', 'monitoring'].includes(input.kind)) return { error: 'Tipo de verificación no válido.' }
  if (!RESULTADOS.includes(input.result)) return { error: 'Indica el resultado.' }
  if (!input.checkedAt || input.checkedAt > hoy()) return { error: 'La fecha no puede ser futura.' }
  if (input.periodStart && input.periodStart > input.checkedAt) return { error: 'El periodo empieza después de la fecha de la revisión.' }
  if (!input.summary.trim()) return { error: 'Resume qué se ha comprobado y con qué resultado.' }
  if (input.result !== 'conforme' && !input.actions.trim()) return { error: 'Con desviaciones o no conforme, indica las medidas adoptadas.' }
  const sistema = await sistemaDe(c, input.systemId)
  if (!sistema) return { error: 'Sistema no encontrado.' }
  const orgId = c.profile.organization_id as string

  const registros = (await loadOperationRecords(c.fluxion, orgId, [input.systemId])).get(input.systemId)!
  if (input.kind === 'input_data' && !registros.inputData) return { error: 'Declara primero los datos de entrada.' }
  if (input.kind === 'monitoring' && !registros.monitoring) return { error: 'Define primero el plan de vigilancia.' }

  // Revisión del funcionamiento: los datos de la aplicación del periodo quedan con ella.
  let dataSummary: string | null = null
  let desdeRevision: string | null = null
  let decisionesPeriodo = 0
  if (input.kind === 'monitoring') {
    const desde = input.periodStart
      ?? (registros.lastMonitoringCheck?.checkedAt ?? addMonths(input.checkedAt, -(registros.monitoring?.reviewMonths ?? 3)))
    const periodo = await loadMonitoringPeriodData(c.fluxion, createTelemetryClient(), orgId, input.systemId, desde, input.checkedAt)
    dataSummary = monitoringDataSummary(periodo)
    desdeRevision = desde
    decisionesPeriodo = periodo.hitl.decisions
  }

  const { data: fila, error } = await c.fluxion.from('system_operation_checks').insert({
    ai_system_id: input.systemId,
    organization_id: orgId,
    kind: input.kind,
    period_start: input.periodStart || null,
    checked_at: input.checkedAt,
    result: input.result,
    summary: input.summary.trim(),
    data_summary: dataSummary,
    actions: input.actions.trim() || null,
    created_by: c.profile.id,
  }).select('id').single()
  if (error || !fila) return { error: 'No se pudo registrar la verificación: ' + (error?.message ?? '') }

  const ids = Array.from(new Set(input.evidenceIds.filter(Boolean)))
  if (ids.length) {
    const { error: e2 } = await c.fluxion.from('system_operation_check_evidences')
      .insert(ids.map((id) => ({ check_id: fila.id, evidence_id: id, organization_id: orgId })))
    if (e2) return { error: 'Verificación registrada, pero no se pudieron vincular las evidencias: ' + e2.message }
  }

  // B30b: la revisión del funcionamiento lleva el informe de supervisión humana
  // del periodo si el sistema se supervisa por caso o por muestreo, o si hubo decisiones.
  let aviso: string | undefined
  if (input.kind === 'monitoring' && desdeRevision) {
    const { data: modo } = await c.fluxion.from('ai_systems').select('oversight_review_mode').eq('id', input.systemId).maybeSingle()
    const conDecisiones = modo?.oversight_review_mode === 'per_case' || modo?.oversight_review_mode === 'sampling' || decisionesPeriodo > 0
    if (conDecisiones) {
      const rep = await generateHitlReportEvidence({ organizationId: orgId, systemId: input.systemId, from: desdeRevision, to: input.checkedAt, actorUserId: c.userId })
      if (rep.evidenceId) {
        await createAdminFluxionClient().from('system_operation_check_evidences')
          .insert({ check_id: fila.id, evidence_id: rep.evidenceId, organization_id: orgId })
      } else {
        aviso = `Revisión registrada. ${rep.aviso ?? 'No se pudo adjuntar el informe de supervisión humana.'}`
      }
    }
  }

  await completeOperationTask(createAdminFluxionClient(), orgId, input.systemId, input.kind)
  await insertAiSystemHistoryEvents(c.fluxion, [{
    ai_system_id: input.systemId,
    organization_id: orgId,
    event_type: 'operation_check_recorded',
    event_title: `${CHECK_KIND_LABEL[input.kind]} registrada`,
    event_summary: `${CHECK_RESULT_LABEL[input.result]}. ${input.summary.trim()}`.slice(0, 500),
    payload: { check_id: fila.id, kind: input.kind, result: input.result, evidences: ids.length },
    actor_user_id: c.userId,
  }])
  auditar(c, 'system.operation_check_recorded', input.systemId, sistema.name, { kind: input.kind, result: input.result })
  revalidatePath(`/inventario/${input.systemId}`)
  revalidatePath(`/inventario/${input.systemId}/operacion`)
  return aviso ? { ok: true, aviso } : { ok: true }
}
