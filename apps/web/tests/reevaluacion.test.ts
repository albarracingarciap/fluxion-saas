// Disparadores de reevaluación (lib/evaluation-status/reevaluation.ts, B21a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { documentReviewDueOn, pendingReevaluations, pendingScope, reevaluationScope, type ReevaluationFacts } from '../lib/evaluation-status/reevaluation'

const nada: ReevaluationFacts = { fmeaApprovedAt: null, friaApprovedAt: null, aisiaApprovedAt: null, classificationCurrent: true }

test('cada disparador pide reevaluar según su tipo', () => {
  const docs = { friaApplies: true, friaApproved: true, aisiaApproved: true }
  assert.deepEqual(reevaluationScope('incidente_grave', docs), ['fmea', 'fria', 'aisia'])
  assert.deepEqual(reevaluationScope('supuestos_aiact', { ...docs, friaApplies: false }), ['fmea', 'aisia'])
  assert.deepEqual(reevaluationScope('incidente_grave', { friaApplies: true, friaApproved: false, aisiaApproved: false }), ['fmea'])
  assert.deepEqual(reevaluationScope('revision_fmea', docs), ['fmea'])
  assert.deepEqual(reevaluationScope('catalogo', docs), ['clasificacion'])
})

test('se resuelve con lo aprobado después de detectarse', () => {
  const t = { detectedAt: '2026-10-28T10:00:00Z', scope: ['fmea', 'aisia'] as const }
  assert.deepEqual(pendingScope(t, nada), ['fmea', 'aisia'])
  assert.deepEqual(pendingScope(t, { ...nada, fmeaApprovedAt: '2026-10-01T00:00:00Z' }), ['fmea', 'aisia'])
  assert.deepEqual(pendingScope(t, { ...nada, fmeaApprovedAt: '2026-11-02T00:00:00Z' }), ['aisia'])
  assert.deepEqual(pendingScope(t, { ...nada, fmeaApprovedAt: '2026-11-02T00:00:00Z', aisiaApprovedAt: '2026-11-03T00:00:00Z' }), [])
})

test('la clasificación se resuelve al usar las reglas vigentes', () => {
  const t = { detectedAt: '2026-10-28T10:00:00Z', scope: ['clasificacion'] as const }
  assert.deepEqual(pendingScope(t, { ...nada, classificationCurrent: false }), ['clasificacion'])
  assert.equal(pendingReevaluations([t], nada), 0)
  assert.equal(pendingReevaluations([t], { ...nada, classificationCurrent: false }), 1)
})

test('revisión anual de la FRIA y la AISIA (B21b)', () => {
  const docs = { friaApplies: true, friaApproved: true, aisiaApproved: true }
  assert.deepEqual(reevaluationScope('revision_fria', docs), ['fria'])
  assert.deepEqual(reevaluationScope('revision_aisia', docs), ['aisia'])
  assert.equal(documentReviewDueOn('2026-03-15T10:00:00Z'), '2027-03-15')
  const t = { detectedAt: '2027-03-16T06:45:00Z', scope: ['fria'] as const }
  assert.deepEqual(pendingScope(t, { ...nada, friaApprovedAt: '2026-03-15T10:00:00Z' }), ['fria'])
  assert.deepEqual(pendingScope(t, { ...nada, friaApprovedAt: '2027-03-20T10:00:00Z' }), [])
})
