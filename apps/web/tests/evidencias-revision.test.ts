// Ciclo de revisión de evidencias (B10).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  EVIDENCE_REVIEW_TRANSITIONS,
  evidenceReviewBlocker,
  statusAfterEdit,
} from '../lib/evidences/review-rules'
import { computeVersionDiff, type EvidenceVersionRecord } from '../lib/evidences/versions'

test('editar el contenido devuelve a borrador lo ya enviado, validado, caducado o rechazado', () => {
  for (const estado of ['pending_review', 'valid', 'expired', 'rejected']) {
    assert.equal(statusAfterEdit(estado, true), 'draft')
  }
  assert.equal(statusAfterEdit('draft', true), 'draft')
})

test('sin cambios de contenido el estado no cambia', () => {
  assert.equal(statusAfterEdit('valid', false), 'valid')
})

test('aprobar exige Responsable del SGAI distinto de quien aporta la evidencia', () => {
  const sgai = { role: 'org_admin', roles: ['org_admin', 'sgai_manager'] }
  assert.equal(evidenceReviewBlocker({ actor: sgai, actorUserId: 'u1', ownerUserId: 'u2' }), null)
  assert.match(evidenceReviewBlocker({ actor: sgai, actorUserId: 'u1', ownerUserId: 'u1' }) ?? '', /aporta/)
  assert.match(
    evidenceReviewBlocker({ actor: { role: 'risk_analyst' }, actorUserId: 'u1', ownerUserId: 'u2' }) ?? '',
    /Responsable del SGAI/,
  )
})

test('transiciones del ciclo', () => {
  assert.deepEqual(EVIDENCE_REVIEW_TRANSITIONS.approve, { from: ['pending_review'], to: 'valid' })
  assert.ok(EVIDENCE_REVIEW_TRANSITIONS.request_review.from.includes('rejected'))
})

test('el historial muestra el cambio de fichero por su nombre', () => {
  const base = {
    id: 'v', evidence_id: 'e', changed_by: null, changed_by_name: null, changed_at: '', change_type: 'edit',
    title: 't', description: null, evidence_type: 'policy', status: 'draft', external_url: null,
    version: null, issued_at: null, expires_at: null, validation_notes: null,
  } as EvidenceVersionRecord
  const diffs = computeVersionDiff(
    { ...base, storage_path: 'org/1/evidences/e/v1.pdf' },
    { ...base, storage_path: 'org/1/evidences/e/v2.pdf' },
  )
  assert.deepEqual(diffs, [{ field: 'storage_path', label: 'Fichero', from: 'v1.pdf', to: 'v2.pdf' }])
})
