// Avisos de la suspensión del uso (B25a) y de un incidente grave (B25b): lib/ai-systems/notices.ts.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { SUSPENSION_NOTICES, incidentNoticePlan, noticeChecks } from '../lib/ai-systems/notices'

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

// Circuito de avisos de un incidente grave del responsable del despliegue (B25b).

test('el circuito de avisos solo aplica al responsable del despliegue con incidente grave', () => {
  assert.equal(incidentNoticePlan({ reporterRole: 'provider', isSerious: true, notices: [], authorityNotifiedAt: null }), null)
  assert.equal(incidentNoticePlan({ reporterRole: 'deployer', isSerious: false, notices: [], authorityNotifiedAt: null }), null)
})

test('primero el proveedor; el importador o distribuidor no es obligatorio; luego la autoridad', () => {
  const vacio = incidentNoticePlan({ reporterRole: 'deployer', isSerious: true, notices: [], authorityNotifiedAt: null })!
  assert.equal(vacio.next?.key, 'proveedor')
  const conProveedor = incidentNoticePlan({
    reporterRole: 'deployer', isSerious: true, notices: [{ recipient: 'provider', notifiedAt: '2026-10-28' }], authorityNotifiedAt: null,
  })!
  assert.equal(conProveedor.next?.key, 'autoridad')
  const completo = incidentNoticePlan({
    reporterRole: 'deployer', isSerious: true, notices: [{ recipient: 'provider', notifiedAt: '2026-10-28' }], authorityNotifiedAt: '2026-10-29T10:00:00Z',
  })!
  assert.equal(completo.next, null)
  assert.equal(completo.authorityBeforeProvider, false)
})

test('avisa si se notificó a la autoridad antes que al proveedor', () => {
  const plan = incidentNoticePlan({
    reporterRole: 'deployer', isSerious: true, notices: [{ recipient: 'provider', notifiedAt: '2026-10-30' }], authorityNotifiedAt: '2026-10-29T10:00:00Z',
  })!
  assert.equal(plan.authorityBeforeProvider, true)
})
