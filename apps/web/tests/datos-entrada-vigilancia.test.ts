// Datos de entrada y vigilancia del funcionamiento (lib/governance/operation.ts, B28).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  inputDataStatus, monitoringDataSummary, monitoringStatus, normalizeIndicators, operationTaskDue,
  type InputDataRecord, type MonitoringPlanRecord,
} from '../lib/governance/operation'
import { systemStage } from '../lib/evaluation-status/stages'

const HOY = '2026-10-28'
const datos: InputDataRecord = { controlledBy: 'organization', expectedData: 'Solicitudes de crédito', sources: 'CRM', controls: 'Rangos y ausentes', verifyMonths: 6 }
const plan: MonitoringPlanRecord = { indicators: [{ id: 'i1', name: 'Tasa de error', threshold: '> 5 %', source: 'manual' }], reviewMonths: 3, ownerProfileId: 'p1' }

test('datos de entrada: declarados, verificados en plazo y con evidencia válida', () => {
  const ok = inputDataStatus(datos, { checkedAt: '2026-06-01', result: 'conforme', validEvidence: true }, HOY)
  assert.equal(ok.complete, true)
  assert.equal(ok.nextDueOn, '2026-12-01')
  assert.equal(ok.overdue, false)
  // Evidencia en borrador: no basta.
  assert.equal(inputDataStatus(datos, { checkedAt: '2026-06-01', result: 'conforme', validEvidence: false }, HOY).complete, false)
  // No conforme: no resuelve.
  assert.equal(inputDataStatus(datos, { checkedAt: '2026-06-01', result: 'no_conforme', validEvidence: true }, HOY).complete, false)
  // Vencida.
  const vencida = inputDataStatus(datos, { checkedAt: '2026-03-01', result: 'conforme', validEvidence: true }, HOY)
  assert.equal(vencida.overdue, true)
  assert.equal(vencida.complete, false)
  // Sin verificaciones: toca ya, pero no está vencida.
  const nueva = inputDataStatus(datos, null, HOY)
  assert.equal(nueva.nextDueOn, HOY)
  assert.equal(nueva.overdue, false)
})

test('datos de entrada controlados solo por el proveedor: basta con declararlo', () => {
  const s = inputDataStatus({ ...datos, controlledBy: 'provider', sources: null, controls: null }, null, HOY)
  assert.equal(s.complete, true)
  assert.equal(s.nextDueOn, null)
  assert.equal(inputDataStatus(null, null, HOY).complete, false)
})

test('vigilancia: indicadores con umbral, responsable y revisión trimestral en plazo', () => {
  assert.equal(monitoringStatus(plan, { checkedAt: '2026-09-01', result: 'desviaciones', validEvidence: false }, HOY).complete, true)
  assert.equal(monitoringStatus(plan, { checkedAt: '2026-07-01', result: 'conforme', validEvidence: false }, HOY).overdue, true)
  assert.equal(monitoringStatus({ ...plan, ownerProfileId: null }, { checkedAt: '2026-09-01', result: 'conforme', validEvidence: false }, HOY).complete, false)
  assert.equal(monitoringStatus({ ...plan, indicators: [{ ...plan.indicators[0]!, threshold: '' }] }, { checkedAt: '2026-09-01', result: 'conforme', validEvidence: false }, HOY).complete, false)
})

test('la tarea se crea 15 días antes del vencimiento', () => {
  assert.equal(operationTaskDue('2026-11-10', HOY), true)
  assert.equal(operationTaskDue('2026-11-20', HOY), false)
  assert.equal(operationTaskDue(null, HOY), false)
})

test('indicadores y resumen de datos del periodo', () => {
  assert.deepEqual(normalizeIndicators([{ name: ' Drift ', threshold: 'x', source: 'raro' }, { name: '' }]), [{ id: 'i1', name: 'Drift', threshold: 'x', source: 'manual' }])
  const t = monitoringDataSummary({ from: '2026-07-01', to: '2026-09-30', signals: { total: 4, high: 1 }, hitl: { decisions: 20, discordant: 3 }, telemetry: null, incidents: { total: 1, serious: 0 }, suspensions: 0, notices: 0 })
  assert.match(t, /Señales recibidas: 4 \(1 de severidad/)
  assert.match(t, /20 decisiones, 3 discordantes \(15 %\)/)
  assert.match(t, /Telemetría: sin datos/)
})

test('Vigente: el punto de verificaciones solo aparece donde aplica', () => {
  const base = {
    systemId: 's1', scope: 'in_scope' as const, level: 'minimal', reviewPending: false, suggestedObligations: 0, openObligations: 0,
    evaluationApproved: true, planApproved: true, aisiaApproved: true, requiredDocuments: [], oversightDesignated: true,
    openActions: 0, untreatedSevereModes: 0, expiredEvidences: 0, overdueReviews: 0, planDeadlineOverdue: false,
  }
  assert.equal(systemStage(base).items.some((i) => i.key === 'operacion'), false)
  const vencida = systemStage({ ...base, overdueOperationChecks: 1 })
  assert.equal(vencida.items.find((i) => i.key === 'operacion')?.done, false)
  assert.equal(vencida.vigente, false)
})
