// Registro en la base de datos de la UE, Anexo VIII (lib/documents/derive-eu-registry.ts, B16b).
// Documentan el comportamiento actual: si un test falla tras un cambio, o el
// cambio es un error o la regla ha cambiado y hay que actualizar test y docs.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { deriveEuRegistry, euRegistrySectionFilter } from '../lib/documents/derive-eu-registry'
import { templateMeta } from '../lib/documents/templates'

const org = { name: 'Acme', legal_name: 'Acme S.L.', tax_id: 'B00000000', registered_address: 'Calle Falsa 1, Madrid', country: 'ES', website: 'https://acme.example' }
const sistema = {
  name: 'Scoring', version: '2', code: 'SYS-001', intended_use: 'Evaluar solvencia',
  output_types: ['decision'], fully_automated: false, status: 'produccion', geo_scope: ['ES', 'PT'],
  technical_description: 'Gradient boosting', data_sources: ['Buró de crédito'],
  aiact_inputs: { art63: { conditions: ['a', 'd'], justification: 'Solo prepara el expediente para el analista.' } },
}
const ctx = { system: sistema, organization: org, providerRegistryUrls: [] as string[] }

test('la ficha para el registro UE es una plantilla del expediente', () => {
  assert.equal(templateMeta('eu_registry').label, 'Ficha para el registro UE')
  assert.match(templateMeta('eu_registry').legalRef, /Anexo VIII/)
})

test('la organización, el sistema y su situación salen de los datos', () => {
  assert.match(deriveEuRegistry('VIII.A.1', ctx)!, /Nombre: Acme S\.L\.\nIdentificación fiscal: B00000000/)
  assert.equal(deriveEuRegistry('VIII.C.1', ctx), deriveEuRegistry('VIII.A.1', ctx))
  assert.match(deriveEuRegistry('VIII.A.4', ctx)!, /Nombre comercial: Scoring v2\nCódigo: SYS-001/)
  assert.match(deriveEuRegistry('VIII.A.5', ctx)!, /Tipo de salida: Decisión automática/)
  assert.equal(deriveEuRegistry('VIII.A.7', ctx), 'Situación: Introducido en el mercado o puesto en servicio')
  assert.equal(deriveEuRegistry('VIII.B.9', ctx), 'Ámbito geográfico: ES, PT')
  assert.equal(deriveEuRegistry('VIII.A.1', { ...ctx, organization: null }), null)
})

test('sección B: condiciones y motivos del Art. 6.3', () => {
  const b6 = deriveEuRegistry('VIII.B.6', ctx)!
  assert.match(b6, /a\) realiza una tarea de procedimiento limitada/)
  assert.match(b6, /d\) realiza una tarea preparatoria/)
  assert.match(deriveEuRegistry('VIII.B.7', ctx)!, /Solo prepara el expediente/)
  assert.equal(deriveEuRegistry('VIII.B.6', { ...ctx, system: { ...sistema, aiact_inputs: null } }), null)
})

test('sección C: la entrada del proveedor sale de su documentación', () => {
  assert.equal(deriveEuRegistry('VIII.C.3', ctx), null)
  assert.match(deriveEuRegistry('VIII.C.3', { ...ctx, providerRegistryUrls: ['https://ai-db.example/123'] })!, /ai-db\.example\/123/)
})

test('el documento muestra solo su sección', () => {
  const enB = euRegistrySectionFilter('B')
  assert.deepEqual(['VIII.A', 'VIII.A.1', 'VIII.B', 'VIII.B.6', 'VIII.C.3'].filter(enB), ['VIII.B', 'VIII.B.6'])
})
