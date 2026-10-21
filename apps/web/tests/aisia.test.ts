// AISIA: precarga de S1 y S2 (B08). La aprobación se decide en Flujos de aprobación (B11g).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildAisiaPrefill } from '../lib/aisia/prefill'

test('precarga S1 y S2 con los datos de la ficha y sin campos vacíos', () => {
  const { S1, S2 } = buildAisiaPrefill({
    name: 'Scoring', version: '2.1', intended_use: '  ', fully_automated: false,
    data_categories: ['identificativos', 'financieros'], special_categories: [], dpia_completed: 'in_progress',
  })
  assert.deepEqual(S1, { system_name: 'Scoring', version: '2.1', fully_automated: false })
  assert.deepEqual(S2, { data_categories_description: 'identificativos, financieros', dpia_status: 'in_progress' })
})
