import 'server-only'

import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import {
  INPUT_DATA_VERIFY_MONTHS,
  MONITORING_REVIEW_MONTHS,
  inputDataStatus,
  monitoringStatus,
  normalizeIndicators,
  operationTaskDue,
  operationTaskTitle,
  type CheckKind,
  type CheckResult,
  type DataControl,
  type InputDataRecord,
  type LastCheck,
  type MonitoringPeriodData,
  type MonitoringPlanRecord,
  type OperationStatus,
} from './operation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any

/**
 * Datos de entrada y vigilancia del funcionamiento (B28, DP-12): carga de las
 * fichas y de la última verificación, datos de la aplicación del periodo y
 * tareas de la próxima verificación.
 */

const hoy = () => new Date().toISOString().slice(0, 10)
const TAREAS_CERRADAS = ['done', 'cancelled']

export type OperationRecords = {
  inputData: (InputDataRecord & { notes: string | null; updatedAt: string }) | null
  monitoring: (MonitoringPlanRecord & { notes: string | null; updatedAt: string }) | null
  lastInputCheck: LastCheck | null
  lastMonitoringCheck: LastCheck | null
}

/** Fichas y última verificación de cada sistema. */
export async function loadOperationRecords(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, OperationRecords>> {
  const out = new Map<string, OperationRecords>()
  if (systemIds.length === 0) return out
  const [{ data: datos }, { data: planes }, { data: checks }] = await Promise.all([
    fluxion.from('system_input_data')
      .select('ai_system_id, controlled_by, expected_data, sources, controls, verify_months, notes, updated_at')
      .eq('organization_id', organizationId).in('ai_system_id', systemIds),
    fluxion.from('system_monitoring_plan')
      .select('ai_system_id, indicators, review_months, owner_profile_id, notes, updated_at')
      .eq('organization_id', organizationId).in('ai_system_id', systemIds),
    fluxion.from('system_operation_checks')
      .select('id, ai_system_id, kind, checked_at, result, created_at, system_operation_check_evidences(system_evidences(status))')
      .eq('organization_id', organizationId).in('ai_system_id', systemIds)
      .order('checked_at', { ascending: false }).order('created_at', { ascending: false }),
  ])

  for (const id of systemIds) out.set(id, { inputData: null, monitoring: null, lastInputCheck: null, lastMonitoringCheck: null })
  for (const d of (datos ?? []) as Array<Record<string, unknown>>) {
    out.get(String(d.ai_system_id))!.inputData = {
      controlledBy: d.controlled_by as DataControl,
      expectedData: (d.expected_data as string | null) ?? null,
      sources: (d.sources as string | null) ?? null,
      controls: (d.controls as string | null) ?? null,
      verifyMonths: Number(d.verify_months ?? INPUT_DATA_VERIFY_MONTHS),
      notes: (d.notes as string | null) ?? null,
      updatedAt: String(d.updated_at),
    }
  }
  for (const p of (planes ?? []) as Array<Record<string, unknown>>) {
    out.get(String(p.ai_system_id))!.monitoring = {
      indicators: normalizeIndicators(p.indicators),
      reviewMonths: Number(p.review_months ?? MONITORING_REVIEW_MONTHS),
      ownerProfileId: (p.owner_profile_id as string | null) ?? null,
      notes: (p.notes as string | null) ?? null,
      updatedAt: String(p.updated_at),
    }
  }
  type Ev = { status: string }
  type Fila = { ai_system_id: string; kind: CheckKind; checked_at: string; result: CheckResult; system_operation_check_evidences: Array<{ system_evidences: Ev | Ev[] | null }> | null }
  for (const c of (checks ?? []) as Fila[]) {
    const r = out.get(c.ai_system_id)!
    const clave = c.kind === 'input_data' ? 'lastInputCheck' : 'lastMonitoringCheck'
    if (r[clave]) continue
    const estados = (c.system_operation_check_evidences ?? [])
      .map((x) => (Array.isArray(x.system_evidences) ? x.system_evidences[0] : x.system_evidences))
      .filter((e): e is Ev => Boolean(e))
    r[clave] = { checkedAt: c.checked_at, result: c.result, validEvidence: estados.some((e) => e.status === 'valid') }
  }
  return out
}

export type OperationStatuses = { inputData: OperationStatus; monitoring: OperationStatus; declaredInput: boolean; declaredMonitoring: boolean }

export function operationStatuses(r: OperationRecords, today = hoy()): OperationStatuses {
  return {
    inputData: inputDataStatus(r.inputData, r.lastInputCheck, today),
    monitoring: monitoringStatus(r.monitoring, r.lastMonitoringCheck, today),
    declaredInput: Boolean(r.inputData),
    declaredMonitoring: Boolean(r.monitoring),
  }
}

export async function loadOperationStatuses(
  fluxion: FluxionClient,
  organizationId: string,
  systemIds: readonly string[],
): Promise<Map<string, OperationStatuses>> {
  const filas = await loadOperationRecords(fluxion, organizationId, systemIds)
  const today = hoy()
  return new Map(Array.from(filas.entries()).map(([id, r]) => [id, operationStatuses(r, today)]))
}

/**
 * Datos de la aplicación del periodo para la revisión del funcionamiento:
 * señales, supervisión humana, telemetría, incidentes, suspensiones y avisos.
 * La telemetría se lee con el cliente del esquema `telemetry`, si se pasa.
 */
export async function loadMonitoringPeriodData(
  fluxion: FluxionClient,
  telemetry: FluxionClient | null,
  organizationId: string,
  systemId: string,
  from: string,
  to: string,
): Promise<MonitoringPeriodData> {
  const desde = `${from}T00:00:00Z`
  const hasta = `${to}T23:59:59Z`
  const [{ data: senales }, { data: hitl }, telem, { data: incidentes }, { data: suspensiones }, { data: avisos }] = await Promise.all([
    fluxion.from('ai_system_history').select('payload')
      .eq('organization_id', organizationId).eq('ai_system_id', systemId).eq('event_type', 'signal_received')
      .gte('created_at', desde).lte('created_at', hasta),
    fluxion.from('hitl_decisions').select('agreement')
      .eq('organization_id', organizationId).eq('ai_system_id', systemId)
      .gte('occurred_at', desde).lte('occurred_at', hasta),
    telemetry
      ? telemetry.from('rollup_daily').select('calls, errors').eq('ai_system_id', systemId).gte('day', from).lte('day', to)
      : Promise.resolve({ data: null }),
    fluxion.from('ai_incident_systems').select('ai_incidents(is_serious, occurred_at, created_at)')
      .eq('ai_system_id', systemId),
    fluxion.from('system_use_suspensions').select('id')
      .eq('organization_id', organizationId).eq('ai_system_id', systemId).gte('suspended_at', desde).lte('suspended_at', hasta),
    fluxion.from('external_notices').select('id, suspension_id, incident_id, created_at')
      .eq('organization_id', organizationId).gte('created_at', desde).lte('created_at', hasta),
  ])

  const sev = ((senales ?? []) as Array<{ payload: { severity?: string } | null }>).map((s) => s.payload?.severity ?? '')
  const decisiones = (hitl ?? []) as Array<{ agreement: boolean | null }>
  const filasTel = (telem?.data ?? null) as Array<{ calls: number; errors: number }> | null
  type Inc = { is_serious: boolean | null; occurred_at: string | null; created_at: string }
  const incs = ((incidentes ?? []) as Array<{ ai_incidents: Inc | Inc[] | null }>)
    .map((r) => (Array.isArray(r.ai_incidents) ? r.ai_incidents[0] : r.ai_incidents))
    .filter((i): i is Inc => Boolean(i))
    .filter((i) => { const f = i.occurred_at ?? i.created_at; return f >= desde && f <= hasta })

  // Avisos del sistema: los de sus suspensiones y los de sus incidentes.
  const { data: susp } = await fluxion.from('system_use_suspensions').select('id').eq('ai_system_id', systemId)
  const { data: incIds } = await fluxion.from('ai_incident_systems').select('incident_id').eq('ai_system_id', systemId)
  const suyos = new Set([
    ...((susp ?? []) as Array<{ id: string }>).map((s) => s.id),
    ...((incIds ?? []) as Array<{ incident_id: string }>).map((i) => i.incident_id),
  ])
  const notices = ((avisos ?? []) as Array<{ suspension_id: string | null; incident_id: string | null }>)
    .filter((a) => (a.suspension_id && suyos.has(a.suspension_id)) || (a.incident_id && suyos.has(a.incident_id))).length

  return {
    from,
    to,
    signals: { total: sev.length, high: sev.filter((s) => s === 'high' || s === 'critical').length },
    hitl: { decisions: decisiones.length, discordant: decisiones.filter((d) => d.agreement === false).length },
    telemetry: filasTel && filasTel.length
      ? { calls: filasTel.reduce((a, r) => a + Number(r.calls ?? 0), 0), errors: filasTel.reduce((a, r) => a + Number(r.errors ?? 0), 0) }
      : null,
    incidents: { total: incs.length, serious: incs.filter((i) => i.is_serious).length },
    suspensions: ((suspensiones ?? []) as unknown[]).length,
    notices,
  }
}

/** Completa la tarea abierta de una verificación del sistema. */
export async function completeOperationTask(admin: FluxionClient, organizationId: string, systemId: string, kind: CheckKind): Promise<void> {
  const prefijo = kind === 'input_data' ? 'Verificar los datos de entrada ·' : 'Revisar el funcionamiento ·'
  await admin.from('tasks')
    .update({ status: 'done' })
    .eq('organization_id', organizationId)
    .eq('source_type', 'operation_check')
    .eq('source_id', systemId)
    .like('title', `${prefijo}%`)
    .not('status', 'in', `(${TAREAS_CERRADAS.join(',')})`)
}

/**
 * Cron diario: tarea de la próxima verificación de los datos de entrada y de
 * la próxima revisión del funcionamiento de cada sistema con ficha, 15 días
 * antes de que venza (o ya, si aún no tiene ninguna). Una tarea abierta por
 * sistema y tipo; se completa al registrar la verificación.
 */
export async function syncOperationCheckTasks(today = hoy()): Promise<number> {
  const admin = createAdminFluxionClient()
  const [{ data: datos }, { data: planes }] = await Promise.all([
    admin.from('system_input_data').select('ai_system_id, organization_id, controlled_by'),
    admin.from('system_monitoring_plan').select('ai_system_id, organization_id, owner_profile_id'),
  ])
  const porOrg = new Map<string, Set<string>>()
  for (const r of [...((datos ?? []) as Array<{ ai_system_id: string; organization_id: string }>), ...((planes ?? []) as Array<{ ai_system_id: string; organization_id: string }>)]) {
    ;(porOrg.get(r.organization_id) ?? porOrg.set(r.organization_id, new Set()).get(r.organization_id)!).add(r.ai_system_id)
  }

  let creadas = 0
  for (const [orgId, ids] of Array.from(porOrg.entries())) {
    const systemIds = Array.from(ids)
    const [registros, { data: sistemas }, { data: abiertas }] = await Promise.all([
      loadOperationRecords(admin, orgId, systemIds),
      admin.from('ai_systems').select('id, name, status, owner_profile_id').in('id', systemIds),
      admin.from('tasks').select('source_id, title').eq('organization_id', orgId).eq('source_type', 'operation_check')
        .not('status', 'in', `(${TAREAS_CERRADAS.join(',')})`),
    ])
    const abierta = new Set(((abiertas ?? []) as Array<{ source_id: string; title: string }>).map((t) => `${t.source_id}|${t.title}`))
    for (const s of (sistemas ?? []) as Array<{ id: string; name: string; status: string | null; owner_profile_id: string | null }>) {
      if (s.status === 'retirado') continue
      const r = registros.get(s.id)!
      const st = operationStatuses(r, today)
      const pendientes: Array<{ kind: CheckKind; due: string; assignee: string | null }> = []
      if (r.inputData && st.inputData.nextDueOn && operationTaskDue(st.inputData.nextDueOn, today)) {
        pendientes.push({ kind: 'input_data', due: st.inputData.nextDueOn, assignee: s.owner_profile_id })
      }
      if (r.monitoring && st.monitoring.nextDueOn && operationTaskDue(st.monitoring.nextDueOn, today)) {
        pendientes.push({ kind: 'monitoring', due: st.monitoring.nextDueOn, assignee: r.monitoring.ownerProfileId ?? s.owner_profile_id })
      }
      for (const p of pendientes) {
        const title = operationTaskTitle(p.kind, s.name)
        if (abierta.has(`${s.id}|${title}`)) continue
        const { error } = await admin.from('tasks').insert({
          organization_id: orgId,
          system_id: s.id,
          title,
          description: p.kind === 'input_data'
            ? 'Verifica que los datos de entrada siguen siendo pertinentes y suficientemente representativos (AI Act, Art. 26.4) y registra la verificación en la ficha del sistema, con el informe de calidad o perfilado o una muestra anonimizada.'
            : 'Revisa el funcionamiento del sistema con su plan de vigilancia (AI Act, Art. 26.5) y registra la revisión en la ficha del sistema. Si hay riesgos, avisa al proveedor, suspende el uso o da parte de un incidente.',
          priority: 'medium',
          source_type: 'operation_check',
          source_id: s.id,
          assignee_id: p.assignee,
          due_date: p.due,
        })
        if (error) console.error('[operation] tarea:', error)
        else creadas++
      }
    }
  }
  return creadas
}
