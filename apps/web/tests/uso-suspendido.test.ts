// Avisos de la suspensión del uso (lib/ai-systems/notices.ts, B25a).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SUSPENSION_NOTICES, noticeChecks } from '../lib/ai-systems/notices'

const pendientes = (notices: Parameters<typeof noticeChecks>[1]) =>
  noticeChecks(SUSPENSION_NOTICES, notices).filter((c) => !c.done).map((c) => c.key)

test('la suspensión exige avisar al proveedor o distribuidor y a la autoridad (Art. 26.5)', () => {
  assert.deepEqual(pendientes([]), ['proveedor', 'autoridad'])
  assert.deepEqual(pendientes([{ recipient: 'provider' }]), ['autoridad'])
  assert.deepEqual(pendientes([{ recipient: 'distributor' }, { recipient: 'authority' }]), [])
})

test('el aviso al importador no sustituye al del proveedor o distribuidor', () => {
  assert.deepEqual(pendientes([{ recipient: 'importer' }, { recipient: 'authority' }]), ['proveedor'])
})
