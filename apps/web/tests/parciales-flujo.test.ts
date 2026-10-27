// Clasificación del proveedor y cese del uso (lib/ai-act/provider-classification.ts, B27).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ceaseUseRequired, providerDisagreement } from '../lib/ai-act/provider-classification'

test('discrepancia con la clasificación del proveedor', () => {
  assert.equal(providerDisagreement('high', 'high'), false)
  assert.equal(providerDisagreement('high', 'high_art63'), true)
  assert.equal(providerDisagreement('limited', 'high_art63'), false)
  assert.equal(providerDisagreement('minimal', 'high_art63'), false)
  assert.equal(providerDisagreement('prohibited', 'high'), true)
  assert.equal(providerDisagreement('limited', 'minimal'), true)
  assert.equal(providerDisagreement('pending', 'high'), false)
  assert.equal(providerDisagreement('high', null), false)
})

test('tarea de cese mientras sea práctica prohibida y no esté retirado', () => {
  assert.equal(ceaseUseRequired('prohibited', 'produccion'), true)
  assert.equal(ceaseUseRequired('prohibited', 'desarrollo'), true)
  assert.equal(ceaseUseRequired('prohibited', 'retirado'), false)
  assert.equal(ceaseUseRequired('high', 'produccion'), false)
})
