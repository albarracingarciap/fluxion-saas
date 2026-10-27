// Identificación biométrica remota en diferido (lib/governance/biometric.ts, B21c).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { annualReportDueDate, annualReportTitle, postBiometricApplies } from '../lib/governance/biometric'

const base = { level: 'high', highRiskRoute: { annex: 'III', points: ['1a'] }, valueChainRoles: ['deployer'] }

test('solo en alto riesgo del Anexo III 1.a como responsable del despliegue', () => {
  assert.equal(postBiometricApplies(base), true)
  assert.equal(postBiometricApplies({ ...base, valueChainRoles: ['provider'] }), false)
  assert.equal(postBiometricApplies({ ...base, highRiskRoute: { annex: 'III', points: ['4a'] } }), false)
  assert.equal(postBiometricApplies({ ...base, level: 'limited' }), false)
  assert.equal(postBiometricApplies({ ...base, highRiskRoute: null }), false)
})

test('una tarea por año natural, con fecha límite al final del año', () => {
  assert.equal(annualReportTitle(2026, 'Control de accesos'), 'Informe anual Art. 26.10 · 2026 · Control de accesos')
  assert.equal(annualReportDueDate(2026), '2026-12-31')
})
