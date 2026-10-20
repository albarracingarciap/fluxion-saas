// Ciclo del expediente documental (B09).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DOCUMENT_TRANSITIONS,
  documentApprovalBlocker,
  documentAuthors,
} from '../lib/documents/lifecycle-rules'
import { templateMeta } from '../lib/documents/templates'

test('se aprueba desde revisión, no desde borrador', () => {
  assert.equal(DOCUMENT_TRANSITIONS.approve.from, 'in_review')
  assert.deepEqual(DOCUMENT_TRANSITIONS.return, { from: 'in_review', to: 'draft' })
})

test('autores de los apartados redactados', () => {
  const content = {
    'IV.1': { text: 'a', author_id: 'p1' },
    'IV.2': { text: 'b', author_id: 'p2' },
    'IV.3': { text: 'c', author_id: 'p1' },
  }
  assert.deepEqual(documentAuthors(content).sort(), ['p1', 'p2'])
  assert.deepEqual(documentAuthors(null), [])
})

test('aprueba el Responsable del SGAI que no ha redactado el expediente', () => {
  const sgai = { role: 'sgai_manager' }
  assert.equal(documentApprovalBlocker({ templateKey: 'annex_iv', actor: sgai, actorProfileId: 'p9', authorProfileIds: ['p1'] }), null)
  assert.match(
    documentApprovalBlocker({ templateKey: 'annex_iv', actor: sgai, actorProfileId: 'p1', authorProfileIds: ['p1'] }) ?? '',
    /redacta/,
  )
  assert.match(
    documentApprovalBlocker({ templateKey: 'dpia', actor: { role: 'dpo' }, actorProfileId: 'p9', authorProfileIds: [] }) ?? '',
    /Responsable del SGAI/,
  )
})

test('cada plantilla lleva su rótulo, no «Anexo IV»', () => {
  assert.equal(templateMeta('annex_iv').label, 'Anexo IV')
  assert.equal(templateMeta('dpia').slug, 'dpia')
  assert.match(templateMeta('dpia').legalRef, /2016\/679/)
  assert.match(templateMeta('fria').legalRef, /Artículo 27/)
  assert.equal(templateMeta('approval_minutes').label, 'Acta de aprobación')
})
