// Ciclo de vida único de la evaluación de riesgos (B07).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getEvaluationStateLabel,
  newVersionBlocker,
  nextReviewAt,
  pickReferenceEvaluation,
  planStatusFromActions,
} from '../lib/fmea/lifecycle-rules'

test('plan aprobado: en ejecución mientras quede alguna acción abierta', () => {
  assert.equal(planStatusFromActions('approved', ['accepted', 'pending']), 'in_progress')
  assert.equal(planStatusFromActions('approved', ['evidence_pending']), 'in_progress')
})

test('plan aprobado sin acciones abiertas, o sin acciones: cerrado', () => {
  assert.equal(planStatusFromActions('approved', ['completed', 'accepted', 'cancelled']), 'closed')
  assert.equal(planStatusFromActions('approved', []), 'closed')
})

test('un plan cerrado se reabre si una acción vuelve a abrirse', () => {
  assert.equal(planStatusFromActions('closed', ['completed', 'in_progress']), 'in_progress')
})

test('borrador, revisión y sustituido no cambian por las acciones', () => {
  assert.equal(planStatusFromActions('draft', []), 'draft')
  assert.equal(planStatusFromActions('in_review', ['completed']), 'in_review')
  assert.equal(planStatusFromActions('superseded', []), 'superseded')
})

test('próxima revisión según la cadencia del plan', () => {
  const aprobada = new Date('2026-01-15T10:00:00Z')
  assert.equal(nextReviewAt(aprobada, 'monthly')?.toISOString(), '2026-02-15T10:00:00.000Z')
  assert.equal(nextReviewAt(aprobada, 'quarterly')?.toISOString(), '2026-04-15T10:00:00.000Z')
  assert.equal(nextReviewAt(aprobada, 'biannual')?.toISOString(), '2026-07-15T10:00:00.000Z')
  assert.equal(nextReviewAt(aprobada, 'annual')?.toISOString(), '2027-01-15T10:00:00.000Z')
  assert.equal(nextReviewAt(aprobada, null), null)
})

test('versión nueva solo desde la vigente y sin otra en curso', () => {
  assert.equal(newVersionBlocker({ state: 'approved', isLatestVersion: true, hasOpenVersion: false }), null)
  assert.notEqual(newVersionBlocker({ state: 'in_review', isLatestVersion: true, hasOpenVersion: false }), null)
  assert.notEqual(newVersionBlocker({ state: 'superseded', isLatestVersion: false, hasOpenVersion: false }), null)
  assert.notEqual(newVersionBlocker({ state: 'approved', isLatestVersion: true, hasOpenVersion: true }), null)
})

test('etiquetas de negocio del estado de la evaluación', () => {
  assert.equal(getEvaluationStateLabel('approved'), 'Aprobada · vigente')
  assert.equal(getEvaluationStateLabel('superseded'), 'Sustituida')
  assert.equal(getEvaluationStateLabel(null), 'Sin evaluación')
})

test('evaluación de referencia: la vigente aunque haya una versión nueva en curso', () => {
  const filas = [
    { id: 'v1', state: 'superseded', version: 1 },
    { id: 'v2', state: 'approved', version: 2 },
    { id: 'v3', state: 'draft', version: 3 },
  ]
  assert.equal(pickReferenceEvaluation(filas)?.id, 'v2')
  assert.equal(pickReferenceEvaluation([{ id: 'v1', state: 'in_review', version: 1 }])?.id, 'v1')
  assert.equal(pickReferenceEvaluation([{ id: 'v1', state: 'superseded', version: 1 }]), null)
  assert.equal(pickReferenceEvaluation([]), null)
})
