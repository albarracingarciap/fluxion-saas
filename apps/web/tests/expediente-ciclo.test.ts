// Ciclo del expediente documental (B09).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DOCUMENT_TRANSITIONS,
  documentAuthors,
} from '../lib/documents/lifecycle-rules'
import { templateMeta } from '../lib/documents/templates'

test('desde la pantalla solo se envía o se devuelve; se aprueba en el circuito (B11f)', () => {
  assert.deepEqual(DOCUMENT_TRANSITIONS.submit, { from: 'draft', to: 'in_review' })
  assert.deepEqual(DOCUMENT_TRANSITIONS.return, { from: 'in_review', to: 'draft' })
  assert.equal('approve' in DOCUMENT_TRANSITIONS, false)
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

test('cada plantilla lleva su rótulo, no «Anexo IV»', () => {
  assert.equal(templateMeta('annex_iv').label, 'Anexo IV')
  assert.equal(templateMeta('dpia').slug, 'dpia')
  assert.match(templateMeta('dpia').legalRef, /2016\/679/)
  assert.match(templateMeta('fria').legalRef, /Artículo 27/)
  assert.equal(templateMeta('approval_minutes').label, 'Acta de aprobación')
})
