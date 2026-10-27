// AISIA como plantilla del expediente (lib/documents/derive-aisia.ts, B15).
// Documentan el comportamiento actual: si un test falla tras un cambio, o el
// cambio es un error o la regla ha cambiado y hay que actualizar test y docs.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deriveAisiaFromFmea, deriveAisiaFromSystem } from '../lib/documents/derive-aisia'
import { TEMPLATE_KEYS, templateMeta } from '../lib/documents/templates'

test('la AISIA es una plantilla del expediente', () => {
  assert.ok((TEMPLATE_KEYS as readonly string[]).includes('aisia'))
  assert.equal(templateMeta('aisia').label, 'AISIA')
  assert.match(templateMeta('aisia').legalRef, /42001/)
})

test('S1 y S2 salen de la ficha; sin datos, hueco', () => {
  const s1 = deriveAisiaFromSystem('AISIA.S1.a', {
    name: 'Scoring', version: '2', intended_use: 'Conceder crédito', fully_automated: false,
    output_types: ['decision', 'clasificacion'],
  })!
  assert.match(s1, /Sistema: Scoring v2/)
  assert.match(s1, /Finalidad prevista: Conceder crédito/)
  assert.match(s1, /Totalmente automatizado: no/)
  assert.match(s1, /Tipo de salida: Decisión automática, Clasificación \/ Scoring/)

  const s2 = deriveAisiaFromSystem('AISIA.S2.a', { data_volume: '1_100gb', dpia_completed: 'parcial' })!
  assert.match(s2, /Volumen de datos: 1-100 GB/)
  assert.match(s2, /DPIA\): Parcial/)

  assert.equal(deriveAisiaFromSystem('AISIA.S2.a', {}), null)
})

test('S5.a no afirma «no» sobre colectivos vulnerables ni menores', () => {
  assert.equal(deriveAisiaFromSystem('AISIA.S5.a', { vulnerable_groups: false, involves_minors: false }), null)
  const s5 = deriveAisiaFromSystem('AISIA.S5.a', { affects_persons: true, vulnerable_groups: true, involves_minors: false })!
  assert.match(s5, /Afecta a personas: sí/)
  assert.match(s5, /colectivos vulnerables: sí/)
  assert.doesNotMatch(s5, /menores/)
})

test('S3 cita los modos evaluados con severidad 7 o más, de mayor a menor', () => {
  const s3 = deriveAisiaFromFmea('AISIA.S3.a',
    { version: 2, state: 'approved', cached_zone: 'zona_ii', deferred_items_count: 3 }, null,
    [
      { code: 'FM-2', name: 'Sesgo', status: 'evaluated', s_default_frozen: 8, s_actual: 7 },
      { code: 'FM-1', name: 'Fuga', status: 'evaluated', s_default_frozen: 9, s_actual: 9 },
      { code: 'FM-3', name: 'Drift', status: 'evaluated', s_default_frozen: 6, s_actual: 5 },
      { code: 'FM-4', name: 'Otro', status: 'pending', s_default_frozen: 9, s_actual: null },
    ], [])!
  assert.match(s3, /versión 2 · Aprobada/)
  assert.match(s3, /Zona de riesgo: Zona II/)
  assert.match(s3, /Modos de fallo evaluados: 3 de 4/)
  assert.match(s3, /segunda ronda: 3/)
  assert.ok(s3.indexOf('FM-1') < s3.indexOf('FM-2'))
  assert.doesNotMatch(s3, /FM-3|FM-4/)
})

test('S3 sin evaluación o sin modos evaluados es un hueco', () => {
  assert.equal(deriveAisiaFromFmea('AISIA.S3.a', null, null, [], []), null)
  assert.equal(deriveAisiaFromFmea('AISIA.S3.a', { state: 'draft' }, null,
    [{ code: 'FM-1', name: 'x', status: 'pending', s_default_frozen: 8, s_actual: null }], []), null)
})

test('S4 resume el plan y sus acciones por opción, sin las canceladas', () => {
  const s4 = deriveAisiaFromFmea('AISIA.S4.a', null,
    { code: 'PTR-2026-001', status: 'in_progress', actions_total: 3 },
    [], [
      { option: 'mitigar', status: 'pending' }, { option: 'mitigar', status: 'completed' },
      { option: 'aceptar', status: 'accepted' }, { option: 'evitar', status: 'cancelled' },
      { option: null, status: 'pending' },
    ])!
  assert.match(s4, /Plan de tratamiento: PTR-2026-001/)
  assert.match(s4, /Estado del plan: En ejecución/)
  assert.match(s4, /Acciones por opción: Mitigar 2, Aceptar 1, Sin decidir 1/)
  assert.doesNotMatch(s4, /Evitar/)
  assert.equal(deriveAisiaFromFmea('AISIA.S4.a', null, null, [], []), null)
})
