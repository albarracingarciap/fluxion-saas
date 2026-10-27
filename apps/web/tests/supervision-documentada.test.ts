// Supervisión humana documentada y formación (lib/governance/oversight.ts, B24).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  hasValidLiteracy,
  hasValidOversightTraining,
  oversightDocumentation,
  trainingStatus,
  type TrainingFact,
} from '../lib/governance/oversight'

const HOY = '2026-10-28'
const alfabetizacion: TrainingFact = { kind: 'ai_literacy', aiSystemId: null, completedAt: '2026-01-10', expiresAt: null, evidenceStatus: 'valid' }

test('una formación es válida si no ha caducado y su evidencia está validada', () => {
  assert.equal(trainingStatus(alfabetizacion, HOY), 'valida')
  assert.equal(trainingStatus({ ...alfabetizacion, expiresAt: '2026-10-27' }, HOY), 'caducada')
  assert.equal(trainingStatus({ ...alfabetizacion, expiresAt: HOY }, HOY), 'valida')
  assert.equal(trainingStatus({ ...alfabetizacion, evidenceStatus: 'pending_review' }, HOY), 'sin_acreditar')
  assert.equal(trainingStatus({ ...alfabetizacion, evidenceStatus: null }, HOY), 'sin_acreditar')
})

test('alfabetización (Art. 4) y formación para supervisar un sistema concreto', () => {
  const sistema: TrainingFact = { ...alfabetizacion, kind: 'system_oversight', aiSystemId: 's1' }
  assert.equal(hasValidLiteracy([sistema], HOY), false)
  assert.equal(hasValidLiteracy([alfabetizacion], HOY), true)
  assert.equal(hasValidOversightTraining([sistema], 's1', HOY), true)
  assert.equal(hasValidOversightTraining([sistema], 's2', HOY), false)
  assert.equal(hasValidOversightTraining([alfabetizacion], 's2', HOY), true)
})

test('documentada con responsable, competencia, autoridad, formación y medidas', () => {
  const completa = oversightDocumentation({
    ownerId: 'p1', ownerDoc: { competence: 'Analista de riesgos con 5 años en scoring', authorityConfirmed: true }, ownerTrained: true, measures: 'Revisión diaria de rechazos',
  })
  assert.equal(completa.documented, true)
  const sinAutoridad = oversightDocumentation({
    ownerId: 'p1', ownerDoc: { competence: 'x', authorityConfirmed: false }, ownerTrained: true, measures: 'm',
  })
  assert.equal(sinAutoridad.documented, false)
  assert.deepEqual(sinAutoridad.checks.filter((c) => !c.done).map((c) => c.key), ['autoridad'])
  const sinResponsable = oversightDocumentation({ ownerId: null, ownerDoc: null, ownerTrained: false, measures: ' ' })
  assert.deepEqual(sinResponsable.checks.filter((c) => !c.done).map((c) => c.key), ['responsable', 'medidas'])
})
