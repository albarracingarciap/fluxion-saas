// Registro de logs por sistema (lib/governance/logs.ts, B25c, Art. 26.6).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { logRetentionStatus, type LogRetentionFact } from '../lib/governance/logs'

const HOY = '2026-10-28'
const completo: LogRetentionFact = {
  controlledBy: 'organization', storageLocation: 'Plataforma de observabilidad', retentionMonths: 12,
  verifiedAt: '2026-06-01', evidenceStatus: 'valid',
}
const pendientes = (r: LogRetentionFact | null, hoy = HOY) =>
  logRetentionStatus(r, hoy).checks.filter((c) => !c.done).map((c) => c.key)

test('sin registro no hay nada hecho', () => {
  assert.deepEqual(pendientes(null), ['ubicacion', 'retencion', 'evidencia', 'verificacion'])
})

test('completo con ubicación, seis meses o más, evidencia válida y verificación vigente', () => {
  assert.equal(logRetentionStatus(completo, HOY).complete, true)
  assert.equal(logRetentionStatus({ ...completo, retentionMonths: 6 }, HOY).complete, true)
})

test('menos de seis meses bajo control de la organización avisa y no completa', () => {
  const s = logRetentionStatus({ ...completo, retentionMonths: 3 }, HOY)
  assert.equal(s.belowMinimum, true)
  assert.equal(s.complete, false)
  assert.equal(logRetentionStatus({ ...completo, controlledBy: 'shared', retentionMonths: 3 }, HOY).belowMinimum, true)
})

test('si los controla el proveedor, la conservación no es de la organización', () => {
  const s = logRetentionStatus({ ...completo, controlledBy: 'provider', retentionMonths: null }, HOY)
  assert.equal(s.belowMinimum, false)
  assert.equal(s.complete, true)
})

test('la verificación vale doce meses', () => {
  assert.equal(logRetentionStatus(completo, HOY).verificationDueOn, '2027-06-01')
  assert.deepEqual(pendientes(completo, '2027-06-02'), ['verificacion'])
  assert.deepEqual(pendientes({ ...completo, evidenceStatus: 'pending_review' }), ['evidencia'])
})
