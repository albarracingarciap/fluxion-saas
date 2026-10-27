// FRIA (lib/documents/derive-fria.ts, B17b).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deriveFriaDpia, deriveFriaRisks } from '../lib/documents/derive-fria'
import { DOCUMENT_NOTIFICATION } from '../lib/documents/templates'

const evaluacion = { version: 2, state: 'approved', cached_zone: 'zona_ii' }
const modo = (code: string, dimension_id: string, s_actual: number | null, status = 'evaluated') =>
  ({ code, name: `Modo ${code}`, dimension_id, status, s_actual })

test('27.1.d cita los riesgos de derechos fundamentales del análisis (ética y legal, severidad 7 o más)', () => {
  const r = deriveFriaRisks({
    evaluation: evaluacion,
    items: [modo('ET-1', 'etica', 8), modo('LG-1', 'legal_b', 7), modo('TC-1', 'tecnica', 9), modo('ET-2', 'etica', 5), modo('ET-3', 'etica', null, 'pending')],
    providerInstructions: ['Instrucciones de uso v2'],
  })!
  assert.match(r, /versión 2 · Aprobada/)
  assert.match(r, /Zona II/)
  assert.ok(r.indexOf('ET-1') < r.indexOf('LG-1'))
  assert.doesNotMatch(r, /TC-1|ET-2|ET-3/)
  assert.match(r, /Art\. 13\), instrucciones de uso adjuntas:\n- Instrucciones de uso v2/)
})

test('27.1.d sin modos de esas dimensiones lo dice; sin análisis ni instrucciones, hueco', () => {
  assert.match(deriveFriaRisks({ evaluation: evaluacion, items: [modo('TC-1', 'tecnica', 9)], providerInstructions: [] })!, /Ningún modo/)
  assert.equal(deriveFriaRisks({ evaluation: null, items: [], providerInstructions: [] }), null)
})

test('27.4 cita la DPIA del expediente y la de la ficha', () => {
  const r = deriveFriaDpia({ dpia: { status: 'approved', version: 1, approved_at: '2026-10-01T10:00:00Z' }, system: { dpia_completed: 'si' } })!
  assert.match(r, /DPIA del expediente: versión 1 · Aprobada · aprobada el/)
  assert.match(r, /DPIA realizada \(ficha\): Sí/)
  assert.equal(deriveFriaDpia({ dpia: null, system: {} }), null)
})

test('la FRIA y la ficha para el registro UE se notifican; el resto no', () => {
  assert.equal(DOCUMENT_NOTIFICATION.fria?.legalRef, 'AI Act, Art. 27.3')
  assert.equal(DOCUMENT_NOTIFICATION.eu_registry?.legalRef, 'AI Act, Art. 49')
  assert.equal(DOCUMENT_NOTIFICATION.annex_iv, undefined)
})
