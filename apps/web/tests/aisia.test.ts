// AISIA: precarga de S1 y S2 y permisos de aprobación (B08).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildAisiaPrefill } from '../lib/aisia/prefill'
import { aisiaApprovalBlocker } from '../lib/auth/roles-flujo'

test('precarga S1 y S2 con los datos de la ficha y sin campos vacíos', () => {
  const { S1, S2 } = buildAisiaPrefill({
    name: 'Scoring', version: '2.1', intended_use: '  ', fully_automated: false,
    data_categories: ['identificativos', 'financieros'], special_categories: [], dpia_completed: 'in_progress',
  })
  assert.deepEqual(S1, { system_name: 'Scoring', version: '2.1', fully_automated: false })
  assert.deepEqual(S2, { data_categories_description: 'identificativos, financieros', dpia_status: 'in_progress' })
})

test('aprueba la AISIA el Responsable del SGAI que no la ha redactado ni enviado', () => {
  const sgai = { role: 'sgai_manager' }
  assert.equal(aisiaApprovalBlocker({ actor: sgai, actorProfileId: 'p3', preparerProfileIds: ['p1', 'p2'] }), null)
  assert.match(aisiaApprovalBlocker({ actor: sgai, actorProfileId: 'p1', preparerProfileIds: ['p1'] }) ?? '', /prepara/)
  assert.match(aisiaApprovalBlocker({ actor: { role: 'caio' }, actorProfileId: 'p3', preparerProfileIds: [] }) ?? '', /Responsable del SGAI/)
})
